/**
 * 通知音管理コンポーザブル
 * IndexedDBに保存された通知音の管理と再生機能を提供
 */

import { ref } from 'vue'
import { db } from '~/lib/database'
import { logger } from '~/lib/logger'
import type { NotificationSoundRecord } from '~/types/database'
import { generateSoundId } from '~/lib/ids'

export function useNotificationSound() {
  const settingsStore = useSettingsStore()

  // 同時再生制御用
  let currentAudio: HTMLAudioElement | null = null
  const isPlaying = ref(false)

  /**
   * Audio オブジェクトのメモリ解放
   */
  const cleanupAudio = (audio: HTMLAudioElement) => {
    audio.pause()
    audio.src = ''
    audio.load()
  }

  /**
   * 音声を再生（共通処理）
   */
  const playAudio = async (src: string): Promise<void> => {
    // 既に再生中の場合は停止
    if (currentAudio) {
      cleanupAudio(currentAudio)
      currentAudio = null
    }

    const audio = new Audio(src)
    currentAudio = audio
    isPlaying.value = true

    // 再生完了時のクリーンアップ
    const cleanup = () => {
      isPlaying.value = false
      cleanupAudio(audio)
      if (currentAudio === audio) {
        currentAudio = null
      }
    }

    audio.addEventListener('ended', cleanup, { once: true })
    audio.addEventListener('error', cleanup, { once: true })

    try {
      await audio.play()
    } catch (error) {
      // Autoplay blocked or other playback error
      cleanup()
      throw error
    }
  }

  /**
   * デフォルト音声を再生
   */
  const playDefaultSound = async () => {
    try {
      await playAudio('/sound.mp3')
    } catch (error) {
      logger.error('デフォルト通知音の再生に失敗しました', { component: 'NotificationSound', error })
    }
  }

  /**
   * 通知音を再生
   */
  const playReplySound = async () => {
    if (!settingsStore.settings.enableReplySound) {
      return
    }

    const soundId = settingsStore.settings.replySoundId

    // IDが指定されていない場合はデフォルト音声を再生
    if (!soundId) {
      await playDefaultSound()
      return
    }

    try {
      // IndexedDBから音声データを取得
      const sound = await db.notificationSounds.get(soundId)
      if (sound) {
        await playAudio(sound.base64Data)
      } else {
        logger.warn('指定された通知音が見つかりません。デフォルト音声を再生します', {
          component: 'NotificationSound',
          soundId,
        })
        await playDefaultSound()
      }
    } catch (error) {
      logger.error('通知音の再生に失敗しました', { component: 'NotificationSound', error })
      // エラー時はデフォルト音声を再生
      await playDefaultSound()
    }
  }

  /**
   * 通知音を追加
   */
  const addNotificationSound = async (file: File): Promise<string> => {
    try {
      // ファイルをBase64に変換
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const now = Date.now()
      const record: NotificationSoundRecord = {
        id: generateSoundId(),
        name: file.name.replace(/\.[^/.]+$/, ''), // 拡張子を除去
        mimeType: file.type,
        base64Data,
        size: file.size,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      }

      await db.notificationSounds.add(record)
      logger.info('通知音を追加しました', { component: 'NotificationSound', name: record.name })

      return record.id
    } catch (error) {
      logger.error('通知音の追加に失敗しました', { component: 'NotificationSound', error })
      throw error
    }
  }

  /**
   * 通知音を削除
   */
  const deleteNotificationSound = async (id: string): Promise<void> => {
    try {
      await db.notificationSounds.delete(id)
      logger.info('通知音を削除しました', { component: 'NotificationSound', id })

      // 削除した音声が選択されていた場合は設定をクリア
      if (settingsStore.settings.replySoundId === id) {
        settingsStore.settings.replySoundId = undefined
      }
    } catch (error) {
      logger.error('通知音の削除に失敗しました', { component: 'NotificationSound', error })
      throw error
    }
  }

  /**
   * 通知音一覧を取得
   */
  const getNotificationSounds = async (): Promise<NotificationSoundRecord[]> => {
    try {
      return await db.notificationSounds.orderBy('createdAt').reverse().toArray()
    } catch (error) {
      logger.error('通知音一覧の取得に失敗しました', { component: 'NotificationSound', error })
      return []
    }
  }

  /**
   * 通知音をプレビュー再生
   */
  const previewSound = async (id: string): Promise<void> => {
    try {
      const sound = await db.notificationSounds.get(id)
      if (sound) {
        await playAudio(sound.base64Data)
      }
    } catch (error) {
      logger.error('通知音のプレビュー再生に失敗しました', { component: 'NotificationSound', error })
    }
  }

  /**
   * デフォルト音声をプレビュー
   */
  const previewDefaultSound = async (): Promise<void> => {
    await playDefaultSound()
  }

  return {
    playReplySound,
    addNotificationSound,
    deleteNotificationSound,
    getNotificationSounds,
    previewSound,
    previewDefaultSound,
  }
}
