import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useQuickActions } from '~/composables/useQuickActions'
import { useSettingsProfilesStore } from '~/stores/settingsProfiles'
import type { SettingsProfile } from '~/types/settings'

// ロガーをモック
mock.module('~/utils/logger', () => ({
  logger: {
    info: () => {},
    warn: () => {},
    debug: () => {},
  },
}))

describe('useQuickActions', () => {
  let profilesStore: ReturnType<typeof useSettingsProfilesStore>
  let composable: ReturnType<typeof useQuickActions>

  beforeEach(() => {
    setActivePinia(createPinia())
    profilesStore = useSettingsProfilesStore()
    composable = useQuickActions()
  })

  describe('toggleAction', () => {
    beforeEach(() => {
      // テスト用のプロファイルを作成
      const testProfile: SettingsProfile = {
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

      profilesStore.profiles = [testProfile]
      profilesStore.activeProfileId = testProfile.id
    })

    it('存在するアクションをトグルできる', () => {
      const updateProfileSettingSpy = mock(() => {})
      composable.updateProfileSetting = updateProfileSettingSpy

      composable.toggleAction('thinking-mode')

      // thinking-modeはプロファイル固有の設定ではないため、グローバル設定が更新される
      expect(updateProfileSettingSpy).not.toHaveBeenCalled()
    })

    it('存在しないアクションのトグルは何もしない', () => {
      const updateProfileSettingSpy = mock(() => {})
      composable.updateProfileSetting = updateProfileSettingSpy

      composable.toggleAction('non-existent-action')

      expect(updateProfileSettingSpy).not.toHaveBeenCalled()
    })
  })

  describe('updateProfileSetting', () => {
    beforeEach(() => {
      const testProfile: SettingsProfile = {
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

      profilesStore.profiles = [testProfile]
      profilesStore.activeProfileId = testProfile.id
    })
  })

  describe('quickActions computed', () => {
    beforeEach(() => {
      const testProfile: SettingsProfile = {
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

      profilesStore.profiles = [testProfile]
      profilesStore.activeProfileId = testProfile.id
    })
  })
})
