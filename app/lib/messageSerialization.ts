/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Message } from '~/types/chat'
import type { MessageRecord } from '~/types/database'

/**
 * アシスタントメッセージの拡張フィールドをMessageRecordへシリアライズ
 */
export function serializeAssistantExtras(message: Message): Partial<MessageRecord> {
  // roleチェックは呼び出し側で行う前提
  const m = message as Message & {
    thoughts?: string
    translatedThoughts?: string
    functionCalls?: unknown
    functionResults?: unknown
    citations?: unknown
    originalContent?: string
    isProofread?: boolean
  }

  const toJson = (v: unknown): string | undefined => {
    if (v === undefined) return undefined
    try {
      return JSON.stringify(v)
    } catch {
      return undefined
    }
  }

  return {
    thoughts: m.thoughts,
    translatedThoughts: m.translatedThoughts,
    functionCalls: toJson(m.functionCalls),
    functionResults: toJson(m.functionResults),
    citations: toJson(m.citations),
    originalContent: m.originalContent,
    isProofread: m.isProofread ?? false,
  }
}

/**
 * MessageRecordからアシスタントメッセージ拡張フィールドをデシリアライズ
 */
export function deserializeAssistantExtras(record: MessageRecord): Partial<Message> {
  const parseJson = <T = unknown>(s?: string): T | undefined => {
    if (!s) return undefined
    try {
      return JSON.parse(s) as T
    } catch {
      return undefined
    }
  }

  return {
    thoughts: record.thoughts,
    translatedThoughts: record.translatedThoughts,
    // 型上は必要箇所のみで使用される想定
    functionCalls: parseJson<any>(record.functionCalls) as any,
    functionResults: parseJson<any>(record.functionResults) as any,
    citations: parseJson<any>(record.citations) as any,
    originalContent: record.originalContent as any,
    isProofread: record.isProofread as any,
  }
}
