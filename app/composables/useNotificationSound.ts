/**
 * 通知音管理コンポーザブル
 * IndexedDBに保存された通知音の管理と再生機能を提供
 */

import type { NotificationSoundRecord } from '~/types/database'
import { logger } from '~/lib/logger'
import { db } from '~/lib/database'

export function useNotificationSound() {
  const settingsStore = useSettingsStore()

  /**
   * デフォルト音声を再生
   */
  const playDefaultSound = async () => {
    try {
      const audio = new Audio('/sound.mp3')
      await audio.play()
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
        const audio = new Audio(sound.base64Data)
        await audio.play()
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
        id: `sound-${now}`,
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
        const audio = new Audio(sound.base64Data)
        await audio.play()
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
