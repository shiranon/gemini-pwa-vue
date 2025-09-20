import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FunctionCallArgs, FunctionExecutionContext } from '~/types/function-calling'
import { manageStyleProfile, manageStyleProfileDeclaration } from '~/utils/functions/manageStyleProfile'

describe('manageStyleProfile', () => {
  let mockContext: FunctionExecutionContext

  beforeEach(() => {
    mockContext = {
      persistentMemory: {},
      timestamp: Date.now(),
    }
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('プリセットを設定できる', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        characterName: 'テストキャラ',
        profileName: 'polite',
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.message).toContain('テストキャラの口調プロファイルを更新しました')
      expect(result.profile).toEqual({
        firstPerson: '私',
        politeness: 0.8,
        sentenceEnder: 'です,ます',
        dialect: 'standard',
        description: '丁寧語',
      })
    })

    it('プリセットに上書き設定を適用できる', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        characterName: 'テストキャラ',
        profileName: 'polite',
        overrides: {
          firstPerson: 'わたくし',
          politeness: 0.9,
        },
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.profile).toEqual({
        firstPerson: 'わたくし',
        politeness: 0.9,
        sentenceEnder: 'です,ます',
        dialect: 'standard',
        description: '丁寧語',
      })
    })

    it('既存のプロファイルを上書きできる', async () => {
      // 最初にプロファイルを設定
      await manageStyleProfile(
        {
          action: 'set',
          characterName: 'テストキャラ',
          profileName: 'polite',
        },
        mockContext
      )

      // 上書き設定を適用
      const args: FunctionCallArgs = {
        action: 'set',
        characterName: 'テストキャラ',
        overrides: {
          firstPerson: '俺',
          politeness: 0.3,
        },
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.profile).toEqual({
        firstPerson: '俺',
        politeness: 0.3,
        sentenceEnder: 'です,ます',
        dialect: 'standard',
        description: '丁寧語',
      })
    })

    it('プロファイルを取得できる', async () => {
      // 最初にプロファイルを設定
      await manageStyleProfile(
        {
          action: 'set',
          characterName: 'テストキャラ',
          profileName: 'tsundere',
        },
        mockContext
      )

      const args: FunctionCallArgs = {
        action: 'get',
        characterName: 'テストキャラ',
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.profile).toEqual({
        firstPerson: 'アタシ',
        politeness: 0.6,
        sentenceEnder: 'なんだからね！',
        dialect: 'standard',
        description: 'ツンデレ',
      })
    })

    it('利用可能なプリセット一覧を取得できる', async () => {
      const args: FunctionCallArgs = {
        action: 'list',
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.success).toBe(true)
      expect(result.availablePresets).toBeDefined()
      expect((result.availablePresets as Record<string, unknown>).polite).toBeDefined()
      expect((result.availablePresets as Record<string, unknown>).casual).toBeDefined()
      expect((result.availablePresets as Record<string, unknown>).tsundere).toBeDefined()
    })
  })

  describe('異常系', () => {
    it('actionが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {}

      const result = await manageStyleProfile(args, mockContext)

      expect(result.error).toBe("引数 'action' は必須です。")
    })

    it('setアクションでcharacterNameが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        profileName: 'polite',
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.error).toBe("アクション 'set' には 'characterName' が必須です。")
    })

    it('getアクションでcharacterNameが未指定の場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'get',
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.error).toBe("アクション 'get' には 'characterName' が必須です。")
    })

    it('存在しないプリセット名を指定した場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'set',
        characterName: 'テストキャラ',
        profileName: 'invalid_preset',
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.error).toBe("指定されたプリセット名 'invalid_preset' は存在しません。")
    })

    it('設定されていないキャラクターのプロファイルを取得しようとした場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'get',
        characterName: '存在しないキャラ',
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.success).toBe(false)
      expect(result.message).toBe('存在しないキャラの口調プロファイルは設定されていません。')
    })

    it('無効なアクションを指定した場合はエラーを返す', async () => {
      const args: FunctionCallArgs = {
        action: 'invalid_action',
        characterName: 'テストキャラ',
      }

      const result = await manageStyleProfile(args, mockContext)

      expect(result.error).toBe('無効なアクションです: invalid_action')
    })
  })

  describe('永続メモリの管理', () => {
    it('persistentMemoryが未初期化の場合は自動で初期化する', async () => {
      const contextWithoutMemory: FunctionExecutionContext = {
        timestamp: Date.now(),
      }

      const args: FunctionCallArgs = {
        action: 'set',
        characterName: 'テストキャラ',
        profileName: 'polite',
      }

      const result = await manageStyleProfile(args, contextWithoutMemory)

      expect(result.success).toBe(true)
      expect(contextWithoutMemory.persistentMemory).toBeDefined()
      expect(contextWithoutMemory.persistentMemory!.styleProfiles).toBeDefined()
    })

    it('複数のキャラクターのプロファイルを独立して管理できる', async () => {
      // キャラクター1のプロファイルを設定
      await manageStyleProfile(
        {
          action: 'set',
          characterName: 'キャラ1',
          profileName: 'polite',
        },
        mockContext
      )

      // キャラクター2のプロファイルを設定
      await manageStyleProfile(
        {
          action: 'set',
          characterName: 'キャラ2',
          profileName: 'casual',
        },
        mockContext
      )

      // それぞれのプロファイルを取得して確認
      const result1 = await manageStyleProfile(
        {
          action: 'get',
          characterName: 'キャラ1',
        },
        mockContext
      )

      const result2 = await manageStyleProfile(
        {
          action: 'get',
          characterName: 'キャラ2',
        },
        mockContext
      )

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.profile).not.toEqual(result2.profile)
    })
  })

  describe('FunctionDeclaration', () => {
    it('正しい宣言が定義されている', () => {
      expect(manageStyleProfileDeclaration.name).toBe('manageStyleProfile')
      expect(manageStyleProfileDeclaration.description).toContain('キャラクターの口調')
      expect(manageStyleProfileDeclaration.parameters?.type).toBe('OBJECT')
      expect(manageStyleProfileDeclaration.parameters?.required).toContain('action')
    })
  })
})
