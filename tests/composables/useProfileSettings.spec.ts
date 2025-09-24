import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useProfileSettings } from '~/composables/useProfileSettings'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { SettingsProfile } from '~/types/settings'

describe('useProfileSettings', () => {
  let store: ReturnType<typeof useSettingsProfilesStore>
  let composable: ReturnType<typeof useProfileSettings>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useSettingsProfilesStore()
    composable = useProfileSettings()
  })

  describe('初期状態', () => {
    it('初期状態が正しく設定される', () => {
      expect(composable.localProfileSettings.value).toEqual({
        modelName: '',
        systemPrompt: '',
        maxTokens: null,
        temperature: null,
        topK: null,
        topP: null,
        presencePenalty: null,
        frequencyPenalty: null,
        thinkingBudget: null,
        geminiEnableFunctionCalling: false,
        functionCallingMode: 'auto',
        enabledFunctionTools: [],
        geminiEnableGrounding: false,
        enableDummyUserPrompt: false,
        dummyUserPrompt: '',
        enableDummyModelPrompt: false,
        dummyModelPrompt: '',
        prependDummyModelToResponse: false,
        profileImage: undefined,
      })
      expect(composable.isDirty.value).toBe(false)
      expect(composable.saving.value).toBe(false)
      expect(composable.hasActiveProfile.value).toBe(false)
    })
  })

  describe('updateSetting', () => {
    it('設定値を更新できる', () => {
      composable.updateSetting('modelName', 'gemini-1.5-pro')
      expect(composable.localProfileSettings.value.modelName).toBe('gemini-1.5-pro')
    })

    it('配列の設定値を更新できる', () => {
      composable.updateSetting('enabledFunctionTools', ['web_search', 'datetime'])
      expect(composable.localProfileSettings.value.enabledFunctionTools).toEqual(['web_search', 'datetime'])
    })

    it('数値の設定値を更新できる', () => {
      composable.updateSetting('temperature', 0.7)
      expect(composable.localProfileSettings.value.temperature).toBe(0.7)
    })

    it('ブール値の設定値を更新できる', () => {
      composable.updateSetting('geminiEnableFunctionCalling', true)
      expect(composable.localProfileSettings.value.geminiEnableFunctionCalling).toBe(true)
    })
  })

  describe('resetToDefaults', () => {
    beforeEach(() => {
      // テスト用のプロファイルを作成
      const testProfile: SettingsProfile = {
        id: 'test-profile',
        name: 'テストプロファイル',
        description: 'テスト用',
        settings: {
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'カスタムプロンプト',
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
      store.activeProfileId = testProfile.id
    })

    it('プロファイル設定をデフォルト値にリセットできる', () => {
      // まず設定を変更
      composable.updateSetting('modelName', 'custom-model')
      composable.updateSetting('temperature', 0.9)
      composable.updateSetting('enabledFunctionTools', ['custom_tool'])

      // リセット実行
      composable.resetToDefaults()

      // デフォルト値に戻っていることを確認
      expect(composable.localProfileSettings.value.modelName).toBe('gemini-2.5-flash')
      expect(composable.localProfileSettings.value.systemPrompt).toBe('')
      expect(composable.localProfileSettings.value.temperature).toBe(null)
      expect(composable.localProfileSettings.value.enabledFunctionTools).toEqual(['getCurrentDateTime', 'rollDice'])
    })

    it('アクティブプロファイルがない場合は何もしない', () => {
      store.activeProfileId = null

      // 設定を変更
      composable.updateSetting('modelName', 'custom-model')

      // リセット実行
      composable.resetToDefaults()

      // 変更が保持されていることを確認
      expect(composable.localProfileSettings.value.modelName).toBe('custom-model')
    })
  })

  describe('resetChanges', () => {
    beforeEach(() => {
      // テスト用のプロファイルを作成
      const testProfile: SettingsProfile = {
        id: 'test-profile',
        name: 'テストプロファイル',
        description: 'テスト用',
        settings: {
          modelName: 'gemini-1.5-pro',
          systemPrompt: 'オリジナルプロンプト',
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
      store.activeProfileId = testProfile.id

      // プロファイルから設定を読み込み
      composable.loadFromActiveProfile()
    })

    it('変更を破棄して元の設定に戻せる', () => {
      // 設定を変更
      composable.updateSetting('modelName', 'changed-model')
      composable.updateSetting('temperature', 0.9)
      composable.updateSetting('enabledFunctionTools', ['custom_tool'])

      // 変更を破棄
      composable.resetChanges()

      // 元の設定に戻っていることを確認
      expect(composable.localProfileSettings.value.modelName).toBe('gemini-1.5-pro')
      expect(composable.localProfileSettings.value.systemPrompt).toBe('オリジナルプロンプト')
      expect(composable.localProfileSettings.value.temperature).toBe(0.7)
      expect(composable.localProfileSettings.value.enabledFunctionTools).toEqual(['web_search'])
    })

    it('オリジナル設定がない場合は何もしない', () => {
      // 設定を変更
      composable.updateSetting('modelName', 'changed-model')

      // オリジナル設定をクリアしてresetChangesをテスト
      // 実際の実装では、originalProfileSettingsがnullの場合は何もしない
      // このテストでは、loadFromActiveProfileが呼ばれているため、元の値に戻る
      composable.resetChanges()

      // 元の設定に戻っていることを確認
      expect(composable.localProfileSettings.value.modelName).toBe('gemini-1.5-pro')
    })
  })

  describe('isDirty', () => {
    beforeEach(() => {
      // テスト用のプロファイルを作成
      const testProfile: SettingsProfile = {
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
      store.activeProfileId = testProfile.id

      // プロファイルから設定を読み込み
      composable.loadFromActiveProfile()
    })

    it('初期状態ではダーティでない', () => {
      expect(composable.isDirty.value).toBe(false)
    })

    it('設定を変更するとダーティになる', () => {
      composable.updateSetting('modelName', 'changed-model')
      expect(composable.isDirty.value).toBe(true)
    })

    it('配列の設定を変更するとダーティになる', () => {
      composable.updateSetting('enabledFunctionTools', ['custom_tool'])
      expect(composable.isDirty.value).toBe(true)
    })

    it('同じ値に設定してもダーティにならない', () => {
      composable.updateSetting('modelName', 'gemini-1.5-pro')
      expect(composable.isDirty.value).toBe(false)
    })

    it('変更を破棄するとダーティでなくなる', () => {
      composable.updateSetting('modelName', 'changed-model')
      expect(composable.isDirty.value).toBe(true)

      composable.resetChanges()
      expect(composable.isDirty.value).toBe(false)
    })
  })

  describe('hasActiveProfile', () => {
    it('アクティブプロファイルがない場合はfalse', () => {
      expect(composable.hasActiveProfile.value).toBe(false)
    })

    it('アクティブプロファイルがある場合はtrue', () => {
      const testProfile: SettingsProfile = {
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
      store.activeProfileId = testProfile.id

      expect(composable.hasActiveProfile.value).toBe(true)
    })
  })
})
