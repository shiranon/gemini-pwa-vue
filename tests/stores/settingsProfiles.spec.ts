import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { SettingsProfile } from '~/types/settings'

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
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト1',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
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
          modelName: 'gemini-1.5-flash',
          systemPrompt: 'デフォルトプロンプト',
          maxTokens: 2000,
          temperature: 0.5,
          topK: 20,
          topP: 0.9,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
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
      expect(store.activeProfile).toEqual(store.profiles[0])
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
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト1',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
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
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
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
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'エクスポートプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
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
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
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
          modelName: 'gemini-1.5-flash',
          systemPrompt: 'テストプロンプト2',
          maxTokens: 2000,
          temperature: 0.5,
          topK: 20,
          topP: 0.9,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
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
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'テストプロンプト',
          maxTokens: 1000,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          presencePenalty: 0,
          frequencyPenalty: 0,
          thinkingBudget: null,
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
})
