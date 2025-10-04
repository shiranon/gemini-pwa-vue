/**
 * データベース関連の型定義
 * IndexedDB + DexieJSで使用するスキーマとデータ型
 */

import type { AttachedFile, ChatSession, Message } from './chat'

// ============================================================================
// データベーステーブル型
// ============================================================================

/** チャットテーブルのレコード */
export interface ChatRecord {
  /** チャットID（プライマリキー） */
  id: string
  /** チャットタイトル */
  title: string
  /** システムプロンプト */
  systemPrompt: string
  /** 永続的メモリ（JSON文字列） */
  persistentMemory: string
  /** チャット個別アバター設定（JSON文字列） */
  avatarSettings?: string
  /** 作成日時 */
  createdAt: number
  /** 更新日時 */
  updatedAt: number
  /** アーカイブフラグ */
  isArchived: boolean
  /** お気に入りフラグ */
  isFavorite: boolean
  /** メッセージ数（計算用） */
  messageCount: number
}

/** メッセージテーブルのレコード */
export interface MessageRecord {
  /** メッセージID（プライマリキー） */
  id: string
  /** 所属するチャットID */
  chatId: string
  /** メッセージのロール */
  role: 'user' | 'assistant' | 'system'
  /** メッセージ内容 */
  content: string
  /** 思考プロセス（JSON文字列） */
  thoughts?: string
  /** 思考プロセスの翻訳版 */
  translatedThoughts?: string
  /** Function Callingの結果（JSON文字列） */
  functionCalls?: string
  /** Function Callingの実行結果（JSON文字列） */
  functionResults?: string
  /** 検索結果の引用（JSON文字列） */
  citations?: string
  /** 校正前の元の内容 */
  originalContent?: string
  /** 校正フラグ */
  isProofread: boolean
  /** 要約フラグ */
  isSummary: boolean
  /** 作成日時 */
  createdAt: number
  /** 更新日時 */
  updatedAt?: number
  /** メッセージの順序 */
  order: number
}

/** 添付ファイルテーブルのレコード */
export interface AttachedFileRecord {
  /** ファイルID（プライマリキー） */
  id: string
  /** 所属するメッセージID */
  messageId: string
  /** 所属するチャットID（効率的なクエリのため） */
  chatId: string
  /** ファイル名 */
  name: string
  /** ファイルタイプ */
  type: string
  /** ファイルサイズ（バイト） */
  size: number
  /** Base64エンコードされたデータ */
  data: string
  /** プレビュー用のURL（画像の場合） */
  previewUrl?: string
  /** 作成日時 */
  createdAt: number
}

/** 設定テーブルのレコード */
export interface SettingsRecord {
  /** 設定ID（常に'app-settings'） */
  id: 'app-settings'
  /** 設定データ（JSON文字列） */
  data: string
  /** 更新日時 */
  updatedAt: number
  /** バージョン（マイグレーション用） */
  version: number
}

/** 設定プロファイルレコード型 */
export interface SettingsProfileRecord {
  /** プロファイルID */
  id: string
  /** プロファイル名 */
  name: string
  /** 説明 */
  description?: string
  /** 設定データ（JSON文字列） */
  data: string
  /** デフォルトプロファイルフラグ */
  isDefault: boolean
  /** 作成日時 */
  createdAt: number
  /** 更新日時 */
  updatedAt: number
}

/** プロファイル管理メタデータ */
export interface ProfilesMetaRecord {
  /** 常に'profiles-meta' */
  id: 'profiles-meta'
  /** アクティブなプロファイルID */
  activeProfileId: string | null
  /** 更新日時 */
  updatedAt: number
}

/** アプリメタデータテーブルのレコード */
export interface AppMetaRecord {
  /** メタデータキー（プライマリキー） */
  key: string
  /** メタデータ値（JSON文字列） */
  value: string
  /** 更新日時 */
  updatedAt: number
}

/** キャラクターテーブルのレコード */
export interface CharacterRecord {
  /** キャラクターID（プライマリキー） */
  id: string
  /** キャラクター名 */
  name: string
  /** キャラクター説明 */
  description?: string
  /** 作成日時 */
  createdAt: number
  /** 更新日時 */
  updatedAt: number
}

/** キャラクター衣装テーブルのレコード */
export interface CharacterOutfitRecord {
  /** 衣装ID（プライマリキー） */
  id: string
  /** 所属するキャラクターID（外部キー） */
  characterId: string
  /** 衣装名 */
  name: string
  /** 衣装説明 */
  description?: string
  /** 作成日時 */
  createdAt: number
  /** 更新日時 */
  updatedAt: number
}

/** キャラクター画像テーブルのレコード */
export interface CharacterImageRecord {
  /** 画像ID（プライマリキー） */
  id: string
  /** 所属するキャラクターID（外部キー） */
  characterId: string
  /** 所属する衣装ID（外部キー） */
  outfitId: string
  /** 表情・シーン名 */
  expression: string
  /** MIMEタイプ */
  mimeType: string
  /** Base64エンコードされた画像データ */
  base64Data: string
  /** ファイルサイズ（バイト） */
  size: number
  /** 作成日時 */
  createdAt: number
  /** 更新日時 */
  updatedAt: number
}

// ============================================================================
// インデックス定義型
// ============================================================================

/** データベースのインデックス定義 */
export interface DatabaseIndexes {
  chats: {
    /** 更新日時でのソート用 */
    updatedAt: number
    /** 作成日時でのソート用 */
    createdAt: number
    /** アーカイブ状態での絞り込み用 */
    isArchived: boolean
    /** お気に入り状態での絞り込み用 */
    isFavorite: boolean
    /** 複合インデックス: アーカイブ + 更新日時 */
    '[isArchived+updatedAt]': [boolean, number]
  }

  messages: {
    /** チャットIDでのグループ化用 */
    chatId: string
    /** チャット内でのソート用 */
    '[chatId+order]': [string, number]
    /** 作成日時でのソート用 */
    createdAt: number
    /** ロールでの絞り込み用 */
    role: string
  }

  attachedFiles: {
    /** メッセージIDでのグループ化用 */
    messageId: string
    /** チャットIDでのグループ化用 */
    chatId: string
    /** ファイルタイプでの絞り込み用 */
    type: string
    /** 作成日時でのソート用 */
    createdAt: number
  }

  settings: {
    /** 更新日時でのソート用 */
    updatedAt: number
  }

  appMeta: {
    /** 更新日時でのソート用 */
    updatedAt: number
  }

  characters: {
    /** キャラクター名での絞り込み用 */
    name: string
    /** 作成日時でのソート用 */
    createdAt: number
    /** 更新日時でのソート用 */
    updatedAt: number
  }

  characterOutfits: {
    /** キャラクターIDでの絞り込み用 */
    characterId: string
    /** 衣装名での絞り込み用 */
    name: string
    /** 複合インデックス: キャラクター + 衣装名 */
    '[characterId+name]': [string, string]
    /** 作成日時でのソート用 */
    createdAt: number
    /** 更新日時でのソート用 */
    updatedAt: number
  }

  characterImages: {
    /** キャラクターIDでの絞り込み用 */
    characterId: string
    /** 衣装IDでの絞り込み用 */
    outfitId: string
    /** 表情名での絞り込み用 */
    expression: string
    /** 複合インデックス: キャラクター + 衣装 */
    '[characterId+outfitId]': [string, string]
    /** 複合インデックス: キャラクター + 衣装 + 表情 */
    '[characterId+outfitId+expression]': [string, string, string]
    /** 作成日時でのソート用 */
    createdAt: number
    /** 更新日時でのソート用 */
    updatedAt: number
  }
}

// ============================================================================
// クエリ関連型
// ============================================================================

/** チャット検索のオプション */
export interface ChatQueryOptions {
  /** 検索キーワード */
  query?: string
  /** アーカイブ状態での絞り込み */
  archived?: boolean
  /** お気に入り状態での絞り込み */
  favorite?: boolean
  /** ソート順 */
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  /** 昇順/降順 */
  order?: 'asc' | 'desc'
  /** 取得制限 */
  limit?: number
  /** オフセット */
  offset?: number
}

/** メッセージ検索のオプション */
export interface MessageQueryOptions {
  /** 対象のチャットID */
  chatId?: string
  /** ロールでの絞り込み */
  role?: 'user' | 'assistant' | 'system'
  /** 検索キーワード */
  query?: string
  /** 日付範囲（開始） */
  dateFrom?: number
  /** 日付範囲（終了） */
  dateTo?: number
  /** 取得制限 */
  limit?: number
  /** オフセット */
  offset?: number
}

/** ファイル検索のオプション */
export interface FileQueryOptions {
  /** 対象のチャットID */
  chatId?: string
  /** 対象のメッセージID */
  messageId?: string
  /** ファイルタイプでの絞り込み */
  type?: string
  /** ファイルサイズの範囲（最小） */
  minSize?: number
  /** ファイルサイズの範囲（最大） */
  maxSize?: number
  /** 取得制限 */
  limit?: number
  /** オフセット */
  offset?: number
}

// ============================================================================
// バックアップ・エクスポート関連型
// ============================================================================

/** エクスポートするデータの種類 */
export type ExportDataType = 'chats' | 'messages' | 'files' | 'settings' | 'all'

/** エクスポートのオプション */
export interface ExportOptions {
  /** エクスポートするデータタイプ */
  types: ExportDataType[]
  /** 日付範囲（開始） */
  dateFrom?: number
  /** 日付範囲（終了） */
  dateTo?: number
  /** 特定のチャットIDのみ */
  chatIds?: string[]
  /** ファイルデータを含めるか */
  includeFiles: boolean
  /** 圧縮するか */
  compress: boolean
}

/** エクスポートされたデータの構造 */
export interface ExportedData {
  /** エクスポート情報 */
  meta: {
    /** エクスポート日時 */
    exportedAt: number
    /** アプリバージョン */
    appVersion: string
    /** データベースバージョン */
    dbVersion: number
    /** エクスポートしたデータタイプ */
    types: ExportDataType[]
  }
  /** チャットデータ */
  chats?: ChatRecord[]
  /** メッセージデータ */
  messages?: MessageRecord[]
  /** 添付ファイルデータ */
  files?: AttachedFileRecord[]
  /** 設定データ */
  settings?: SettingsRecord
  /** アプリメタデータ */
  appMeta?: AppMetaRecord[]
}

/** インポートの結果 */
export interface ImportResult {
  /** 成功したか */
  success: boolean
  /** インポートした件数 */
  counts: {
    chats: number
    messages: number
    files: number
    settings: number
    appMeta: number
  }
  /** エラー情報 */
  errors: string[]
  /** 警告情報 */
  warnings: string[]
}

// ============================================================================
// マイグレーション関連型
// ============================================================================

/** データベースのバージョン情報 */
export interface DatabaseVersion {
  /** バージョン番号 */
  version: number
  /** バージョン説明 */
  description: string
  /** マイグレーション関数 */
  migrate?: (db: object) => Promise<void>
}

/** マイグレーションの結果 */
export interface MigrationResult {
  /** 成功したか */
  success: boolean
  /** 旧バージョン */
  fromVersion: number
  /** 新バージョン */
  toVersion: number
  /** エラー情報 */
  error?: string
  /** 実行時間（ミリ秒） */
  duration: number
}

// ============================================================================
// パフォーマンス関連型
// ============================================================================

/** データベース操作の統計情報 */
export interface DatabaseStats {
  /** 総チャット数 */
  totalChats: number
  /** 総メッセージ数 */
  totalMessages: number
  /** 総ファイル数 */
  totalFiles: number
  /** 総データサイズ（バイト） */
  totalSize: number
  /** アクティブなチャット数 */
  activeChats: number
  /** アーカイブされたチャット数 */
  archivedChats: number
  /** 最古のチャット日時 */
  oldestChatDate?: number
  /** 最新のチャット日時 */
  newestChatDate?: number
}

/** クエリのパフォーマンス情報 */
export interface QueryPerformance {
  /** クエリの種類 */
  queryType: string
  /** 実行時間（ミリ秒） */
  executionTime: number
  /** 結果件数 */
  resultCount: number
  /** 使用されたインデックス */
  usedIndex?: string
}

// ============================================================================
// ユーティリティ型
// ============================================================================

/** データベース操作の結果 */
export interface DatabaseOperationResult<T = object> {
  /** 成功したか */
  success: boolean
  /** 結果データ */
  data?: T
  /** エラー情報 */
  error?: string
  /** パフォーマンス情報 */
  performance?: QueryPerformance
}

/** バッチ操作の設定 */
export interface BatchOperationConfig {
  /** バッチサイズ */
  batchSize: number
  /** 進捗コールバック */
  onProgress?: (progress: number, total: number) => void
  /** エラー時の動作 */
  onError?: 'stop' | 'continue' | 'rollback'
}

// ============================================================================
// 型変換ユーティリティ
// ============================================================================

/** ChatSessionからChatRecordへの変換 */
export type ChatSessionToRecord = Omit<ChatSession, 'messages' | 'persistentMemory'> & {
  persistentMemory: string
  messageCount: number
}

/** MessageからMessageRecordへの変換 */
export type MessageToRecord = Omit<Message, 'attachments'> & {
  chatId: string
  thoughts?: string
  translatedThoughts?: string
  functionCalls?: string
  functionResults?: string
  citations?: string
  isProofread: boolean
  isSummary: boolean
  order: number
}

/** AttachedFileからAttachedFileRecordへの変換 */
export type AttachedFileToRecord = AttachedFile & {
  messageId: string
  chatId: string
}
