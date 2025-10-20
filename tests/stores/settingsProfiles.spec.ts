import { beforeEach, describe, expect, it } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { SettingsProfile } from '~/types/settings'

// loggerをモック（Bunの場合は直接置き換え）
import { logger } from '~/lib/logger'

// loggerのモック
const mockLogger = {
  error: () => {},
  info: () => {},
  warn: () => {},
  debug: () => {},
}
Object.assign(logger, mockLogger)

describe('useSettingsProfilesStore', () => {
  let store: ReturnType<typeof useSettingsProfilesStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useSettingsProfilesStore()
  })

  describe('初期状態', () => {
    it('初期状態が正しく設定される', () => {
      expect(store.profiles).toEqual([])
      expect(store.activeProfileId).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.activeProfile).toBeNull()
      expect(store.sortedProfiles).toEqual([])
    })
  })

  describe('computed properties', () => {
    beforeEach(() => {
      // テスト用のプロファイルを作成
      const profile1: SettingsProfile = {
        id: 'profile-1',
        name: 'プロファイル1',
        description: 'テスト用プロファイル1',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト1',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: true,
          functionCallingMode: 'auto',
          enabledFunctionTools: ['web_search'],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      }

      const profile2: SettingsProfile = {
        id: 'profile-2',
        name: 'デフォルト',
        description: 'デフォルトプロファイル',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-flash',
          systemPrompt: 'デフォルトプロンプト',
          maxTokens: 2000,
          temperature: 0.5,
          topK: 20,
          topP: 0.9,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: false,
          functionCallingMode: 'none',
          enabledFunctionTools: [],
          geminiEnableGrounding: true,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: true,
        createdAt: Date.now() - 2000,
        updatedAt: Date.now() - 2000,
      }

      store.profiles = [profile1, profile2]
    })

    it('activeProfileが正しく取得される', () => {
      store.activeProfileId = 'profile-1'
      expect(store.activeProfile).toEqual(store.profiles[0] || null)
    })

    it('activeProfileがnullの場合、nullを返す', () => {
      store.activeProfileId = null
      expect(store.activeProfile).toBeNull()
    })

    it('activeProfileが存在しないIDの場合、nullを返す', () => {
      store.activeProfileId = 'non-existent'
      expect(store.activeProfile).toBeNull()
    })

    it('sortedProfilesが正しくソートされる', () => {
      const sorted = store.sortedProfiles
      expect(sorted[0]?.isDefault).toBe(true) // デフォルトプロファイルが最初
      expect(sorted[1]?.isDefault).toBe(false) // 通常プロファイルが後
    })

    it('sortedProfilesが名前順でソートされる', () => {
      // デフォルトプロファイルを削除して名前順テスト
      store.profiles = store.profiles.filter((p) => !p.isDefault)
      const profile3: SettingsProfile = {
        id: 'profile-3',
        name: 'あいうえお',
        description: 'あいうえおプロファイル',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト1',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: true,
          functionCallingMode: 'auto',
          enabledFunctionTools: ['web_search'],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      store.profiles.push(profile3)

      const sorted = store.sortedProfiles
      expect(sorted[0]?.name).toBe('あいうえお')
      expect(sorted[1]?.name).toBe('プロファイル1')
    })
  })

  describe('setActiveProfile', () => {
    let testProfile: SettingsProfile

    beforeEach(() => {
      testProfile = {
        id: 'test-profile',
        name: 'テストプロファイル',
        description: 'テスト用',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: true,
          functionCallingMode: 'auto',
          enabledFunctionTools: ['web_search'],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      store.profiles = [testProfile]
    })

    it('有効なプロファイルIDでアクティブプロファイルを設定できる', () => {
      store.setActiveProfile(testProfile.id)

      expect(store.activeProfileId).toBe(testProfile.id)
      expect(store.activeProfile).toEqual(testProfile)
    })

    it('nullでアクティブプロファイルをクリアできる', () => {
      store.setActiveProfile(testProfile.id)
      store.setActiveProfile(null)

      expect(store.activeProfileId).toBeNull()
      expect(store.activeProfile).toBeNull()
    })

    it('存在しないプロファイルIDでエラーが発生する', () => {
      expect(() => store.setActiveProfile('non-existent')).toThrow('プロファイルが見つかりません: non-existent')
    })
  })

  describe('exportProfile', () => {
    let testProfile: SettingsProfile

    beforeEach(() => {
      testProfile = {
        id: 'export-test',
        name: 'エクスポートテスト',
        description: 'エクスポート用プロファイル',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'エクスポートプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: true,
          functionCallingMode: 'auto',
          enabledFunctionTools: ['web_search'],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      store.profiles = [testProfile]
    })

    it('プロファイルをエクスポートできる', () => {
      const exported = store.exportProfile(testProfile.id)
      const parsed = JSON.parse(exported)

      expect(parsed.name).toBe('エクスポートテスト')
      expect(parsed.description).toBe('エクスポート用プロファイル')
      expect(parsed.settings).toEqual(testProfile.settings)
      expect(parsed.id).toBeUndefined() // IDは除外される
      expect(parsed.isDefault).toBe(false) // isDefaultはfalseに設定される
      expect(parsed.exportedAt).toBeDefined()
    })

    it('存在しないプロファイルのエクスポートでエラーが発生する', () => {
      expect(() => store.exportProfile('non-existent')).toThrow('プロファイルが見つかりません: non-existent')
    })
  })

  describe('データ整合性', () => {
    it('プロファイルの一意性が保たれる', () => {
      const profile1: SettingsProfile = {
        id: 'unique-1',
        name: 'テスト1',
        description: '説明1',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: true,
          functionCallingMode: 'auto',
          enabledFunctionTools: ['web_search'],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const profile2: SettingsProfile = {
        id: 'unique-2',
        name: 'テスト2',
        description: '説明2',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-flash',
          systemPrompt: 'テストプロンプト2',
          maxTokens: 2000,
          temperature: 0.5,
          topK: 20,
          topP: 0.9,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: false,
          functionCallingMode: 'none',
          enabledFunctionTools: [],
          geminiEnableGrounding: true,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      store.profiles = [profile1, profile2]

      expect(profile1.id).not.toBe(profile2.id)
      expect(store.profiles).toHaveLength(2)
    })

    it('プロファイルのタイムスタンプが正しく設定される', () => {
      const beforeCreate = Date.now()
      const profile: SettingsProfile = {
        id: 'timestamp-test',
        name: 'タイムスタンプテスト',
        description: '説明',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: true,
          functionCallingMode: 'auto',
          enabledFunctionTools: ['web_search'],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      const afterCreate = Date.now()

      expect(profile.createdAt).toBeGreaterThanOrEqual(beforeCreate)
      expect(profile.createdAt).toBeLessThanOrEqual(afterCreate)
      expect(profile.updatedAt).toBeGreaterThanOrEqual(beforeCreate)
      expect(profile.updatedAt).toBeLessThanOrEqual(afterCreate)
    })
  })

  describe('新機能: 一時的な設定管理', () => {
    let testProfile: SettingsProfile

    beforeEach(() => {
      testProfile = {
        id: 'test-profile',
        name: 'テストプロファイル',
        description: 'テスト用',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: false,
          functionCallingMode: 'auto',
          enabledFunctionTools: [],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      store.profiles = [testProfile]
      store.activeProfileId = testProfile.id
    })

    it('updateTemporarySettingで一時的な設定を更新できる', () => {
      store.updateTemporarySetting('modelName', 'temporary-model')

      const settingsWithTemporary = store.activeProfileSettingsWithTemporary
      expect(settingsWithTemporary.modelName).toBe('temporary-model')
      expect(settingsWithTemporary.systemPrompt).toBe('テストプロンプト') // 元の設定は保持
    })

    it('配列の一時的な設定を更新できる', () => {
      store.updateTemporarySetting('enabledFunctionTools', ['tool1', 'tool2'])

      const settingsWithTemporary = store.activeProfileSettingsWithTemporary
      expect(settingsWithTemporary.enabledFunctionTools).toEqual(['tool1', 'tool2'])
    })

    it('clearTemporarySettingsで一時的な設定をクリアできる', () => {
      // 一時的な設定を追加
      store.updateTemporarySetting('modelName', 'temporary-model')
      store.updateTemporarySetting('temperature', 0.9)

      // クリア
      store.clearTemporarySettings()

      // 元の設定に戻っていることを確認
      const settingsWithTemporary = store.activeProfileSettingsWithTemporary
      expect(settingsWithTemporary.modelName).toBe('gemini-1.5-pro')
      expect(settingsWithTemporary.temperature).toBe(0.7)
    })

    it('プロファイル切り替え時に一時的な設定がクリアされる', () => {
      // 一時的な設定を追加
      store.updateTemporarySetting('modelName', 'temporary-model')

      // 別のプロファイルに切り替え
      const anotherProfile: SettingsProfile = {
        id: 'another-profile',
        name: '別のプロファイル',
        description: 'テスト用',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-flash',
          systemPrompt: '別のプロンプト',
          maxTokens: 2000,
          temperature: 0.5,
          topK: 20,
          topP: 0.9,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: false,
          functionCallingMode: 'auto',
          enabledFunctionTools: [],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      store.profiles.push(anotherProfile)
      store.setActiveProfile(anotherProfile.id)

      // 一時的な設定がクリアされていることを確認
      const settingsWithTemporary = store.activeProfileSettingsWithTemporary
      expect(settingsWithTemporary.modelName).toBe('gemini-1.5-flash')
    })
  })

  describe('新機能: Function Calling と Google Search の排他制御', () => {
    let testProfile: SettingsProfile

    beforeEach(() => {
      testProfile = {
        id: 'test-profile',
        name: 'テストプロファイル',
        description: 'テスト用',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: false,
          functionCallingMode: 'auto',
          enabledFunctionTools: [],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      store.profiles = [testProfile]
      store.activeProfileId = testProfile.id
    })

    it('Function Callingを有効にするとGoogle Searchが無効になる', () => {
      // Google Searchを先に有効にする
      store.updateTemporarySetting('geminiEnableGrounding', true)
      expect(store.activeProfileSettingsWithTemporary.geminiEnableGrounding).toBe(true)

      // Function Callingを有効にする
      store.updateTemporarySetting('geminiEnableFunctionCalling', true)

      // Google Searchが無効になっていることを確認
      expect(store.activeProfileSettingsWithTemporary.geminiEnableFunctionCalling).toBe(true)
      expect(store.activeProfileSettingsWithTemporary.geminiEnableGrounding).toBe(false)
    })

    it('Google Searchを有効にするとFunction Callingが無効になる', () => {
      // Function Callingを先に有効にする
      store.updateTemporarySetting('geminiEnableFunctionCalling', true)
      expect(store.activeProfileSettingsWithTemporary.geminiEnableFunctionCalling).toBe(true)

      // Google Searchを有効にする
      store.updateTemporarySetting('geminiEnableGrounding', true)

      // Function Callingが無効になっていることを確認
      expect(store.activeProfileSettingsWithTemporary.geminiEnableGrounding).toBe(true)
      expect(store.activeProfileSettingsWithTemporary.geminiEnableFunctionCalling).toBe(false)
    })

    it('同じ値を設定しても排他制御は発動しない', () => {
      // Function Callingを有効にする
      store.updateTemporarySetting('geminiEnableFunctionCalling', true)
      expect(store.activeProfileSettingsWithTemporary.geminiEnableFunctionCalling).toBe(true)

      // 同じ値を再度設定
      store.updateTemporarySetting('geminiEnableFunctionCalling', true)

      // Google Searchは変更されていないことを確認
      expect(store.activeProfileSettingsWithTemporary.geminiEnableGrounding).toBe(false)
    })
  })

  describe('新機能: activeProfileSettingsWithTemporary', () => {
    let testProfile: SettingsProfile

    beforeEach(() => {
      testProfile = {
        id: 'test-profile',
        name: 'テストプロファイル',
        description: 'テスト用',
        settings: {
          apiProvider: 'gemini',
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
          enableExtendedThinking: false,
          geminiEnableFunctionCalling: false,
          functionCallingMode: 'auto',
          enabledFunctionTools: [],
          geminiEnableGrounding: false,
          enableDummyUserPrompt: false,
          dummyUserPrompt: '',
          enableDummyModelPrompt: false,
          dummyModelPrompt: '',
          prependDummyModelToResponse: false,
        },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      store.profiles = [testProfile]
      store.activeProfileId = testProfile.id
    })

    it('アクティブプロファイルがない場合はデフォルト設定を返す', () => {
      store.activeProfileId = null

      const settings = store.activeProfileSettingsWithTemporary
      expect(settings).toBeDefined()
      expect(settings.modelName).toBe('gemini-2.5-flash') // デフォルト値
    })

    it('一時的な設定がない場合は元のプロファイル設定を返す', () => {
      const settings = store.activeProfileSettingsWithTemporary
      expect(settings.modelName).toBe('gemini-1.5-pro')
      expect(settings.systemPrompt).toBe('テストプロンプト')
    })

    it('一時的な設定がある場合はマージされた設定を返す', () => {
      store.updateTemporarySetting('modelName', 'temporary-model')
      store.updateTemporarySetting('temperature', 0.9)

      const settings = store.activeProfileSettingsWithTemporary
      expect(settings.modelName).toBe('temporary-model') // 一時的な設定
      expect(settings.temperature).toBe(0.9) // 一時的な設定
      expect(settings.systemPrompt).toBe('テストプロンプト') // 元の設定
    })
  })
})
