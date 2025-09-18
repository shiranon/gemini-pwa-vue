/**
 * 全データのバックアップ・復元機能
 */

import { useDatabase } from '~/composables/useDatabase'
import { downloadJson } from '~/lib/file'
import { useSettingsStore } from '~/stores/settings'
import type { ChatSession } from '~/types/chat'
import type { AppSettings } from '~/types/settings'

export interface FullBackupData {
  version: string
  exportedAt: number
  application: string
  data: {
    chats: ChatSession[]
    settings: AppSettings
    stats: {
      totalChats: number
      totalMessages: number
    }
  }
}

export interface ImportResult {
  success: boolean
  imported: {
    chats: number
    settings: boolean
  }
  errors: string[]
  warnings: string[]
}

function sanitizeSettingsForImport(settings: AppSettings, warnings: string[]): AppSettings {
  const safe = { ...settings }
  if (safe.apiKey) {
    safe.apiKey = ''
    warnings.push('セキュリティのためAPIキーはインポートされませんでした')
  }
  return safe
}

async function maybeClearExistingChats(database: ReturnType<typeof useDatabase>, replaceExisting: boolean, importChats: boolean, warnings: string[], errors: string[]) {
  if (!replaceExisting || !importChats) return
  try {
    await database.clearAllChats()
    warnings.push('既存のチャットデータを削除しました')
  } catch (err) {
    errors.push('既存データの削除に失敗しました: ' + (err instanceof Error ? err.message : String(err)))
  }
}

async function importChatsData(database: ReturnType<typeof useDatabase>, chats: ChatSession[], replaceExisting: boolean, result: ImportResult) {
  for (const chat of chats) {
    if (!replaceExisting) {
      const existingChat = await database.getChat(chat.id)
      if (existingChat) {
        result.warnings.push(`チャット「${chat.title}」は既に存在するためスキップしました`)
        continue
      }
    }

    if (!chat.id || !chat.title || !Array.isArray(chat.messages)) {
      result.warnings.push(`無効なチャットデータをスキップしました: ${chat.title || '不明'}`)
      continue
    }

    await database.saveChat(chat)
    result.imported.chats++
  }
}

/**
 * 全データをエクスポート
 */
export const exportFullData = async (): Promise<FullBackupData> => {
  const database = useDatabase()
  const settingsStore = useSettingsStore()

  const chats = await database.getChats({ limit: 10000 })

  await database.refreshStats()
  const stats = database.stats.value

  const backupData: FullBackupData = {
    version: '1.0.1',
    exportedAt: Date.now(),
    application: 'Gemini TRPG Assistant',
    data: {
      chats,
      settings: settingsStore.exportSettings(),
      stats: stats || { totalChats: 0, totalMessages: 0 },
    },
  }

  return backupData
}

/**
 * 全データをインポート
 */
export const importFullData = async (
  backupData: FullBackupData,
  options: {
    replaceExisting?: boolean
    importChats?: boolean
    importSettings?: boolean
  } = {}
): Promise<ImportResult> => {
  const { replaceExisting = false, importChats = true, importSettings = true } = options

  const result: ImportResult = {
    success: true,
    imported: {
      chats: 0,
      settings: false,
    },
    errors: [],
    warnings: [],
  }

  try {
    if (!backupData.version) {
      result.warnings.push('バックアップデータのバージョン情報がありません')
    }
    if (!backupData.data) {
      result.errors.push('無効なバックアップデータです')
      result.success = false
      return result
    }

    const database = useDatabase()
    const settingsStore = useSettingsStore()

    await maybeClearExistingChats(database, replaceExisting, importChats, result.warnings, result.errors)

    if (importChats && backupData.data.chats) {
      try {
        await importChatsData(database, backupData.data.chats, replaceExisting, result)
      } catch (err) {
        result.errors.push('チャットデータのインポートに失敗しました: ' + (err instanceof Error ? err.message : String(err)))
        result.success = false
      }
    }

    if (importSettings && backupData.data.settings) {
      try {
        const safeSettings = sanitizeSettingsForImport(backupData.data.settings, result.warnings)
        settingsStore.importSettings(safeSettings)
        result.imported.settings = true
      } catch (err) {
        result.errors.push('設定のインポートに失敗しました: ' + (err instanceof Error ? err.message : String(err)))
      }
    }

    if (importChats) {
      await database.refreshStats()
    }
  } catch (err) {
    result.errors.push('インポート処理中にエラーが発生しました: ' + (err instanceof Error ? err.message : String(err)))
    result.success = false
  }

  return result
}

/**
 * バックアップデータを検証
 */
export const validateBackupData = (data: unknown): data is FullBackupData => {
  if (!data || typeof data !== 'object') {
    return false
  }

  const backup = data as Partial<FullBackupData>

  // 必須フィールドの確認
  if (!backup.exportedAt || !backup.data) {
    return false
  }

  // データ構造の確認
  const backupData = backup.data
  if (!backupData || typeof backupData !== 'object') {
    return false
  }

  // チャットデータの確認
  if (backupData.chats && !Array.isArray(backupData.chats)) {
    return false
  }

  return true
}

/**
 * ファイルからバックアップデータを読み込み
 */
export const loadBackupFromFile = (file: File): Promise<FullBackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        if (!validateBackupData(data)) {
          reject(new Error('無効なバックアップファイルです'))
          return
        }

        resolve(data)
      } catch (err) {
        reject(new Error('バックアップファイルの読み込みに失敗しました: ' + (err instanceof Error ? err.message : String(err))))
      }
    }

    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'))
    }

    reader.readAsText(file)
  })
}

/**
 * バックアップデータをファイルとしてダウンロード
 */
export const downloadBackup = async (filename?: string) => {
  try {
    const backupData = await exportFullData()
    downloadJson(backupData, filename || `gemini-trpg-backup-${new Date().toISOString().slice(0, 10)}.json`)
  } catch (err) {
    throw new Error('バックアップのダウンロードに失敗しました: ' + (err instanceof Error ? err.message : String(err)))
  }
}
