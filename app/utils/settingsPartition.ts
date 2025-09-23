import type { AppSettings, SettingsProfileData } from '~/types/settings'

export const PROFILE_SETTING_KEYS = [
  'modelName',
  'systemPrompt',
  'maxTokens',
  'temperature',
  'topK',
  'topP',
  'presencePenalty',
  'frequencyPenalty',
  'thinkingBudget',
  'geminiEnableFunctionCalling',
  'functionCallingMode',
  'enabledFunctionTools',
  'geminiEnableGrounding',
  'enableDummyUserPrompt',
  'dummyUserPrompt',
  'enableDummyModelPrompt',
  'dummyModelPrompt',
  'prependDummyModelToResponse',
  'profileImage',
] as const satisfies readonly (keyof SettingsProfileData)[]

export type ProfileSettingKey = (typeof PROFILE_SETTING_KEYS)[number]

export type GlobalSettingKey = Exclude<keyof AppSettings, ProfileSettingKey>

export type GlobalSettingsSnapshot = Pick<AppSettings, GlobalSettingKey>

export const cloneProfileSettings = (settings: SettingsProfileData): SettingsProfileData => ({
  ...settings,
  enabledFunctionTools: [...settings.enabledFunctionTools],
})

export const mergeProfilePartial = (base: SettingsProfileData, partial: Partial<Record<ProfileSettingKey, unknown>>): SettingsProfileData => {
  const next: SettingsProfileData = {
    ...base,
    enabledFunctionTools: [...base.enabledFunctionTools],
  }

  for (const key of PROFILE_SETTING_KEYS) {
    const value = partial[key]
    if (value === undefined) {
      continue
    }

    switch (key) {
      case 'enabledFunctionTools': {
        if (Array.isArray(value)) {
          next.enabledFunctionTools = value.filter((item): item is string => typeof item === 'string')
        }
        break
      }
      case 'modelName':
      case 'systemPrompt':
      case 'dummyUserPrompt':
      case 'dummyModelPrompt':
      case 'profileImage': {
        if (typeof value === 'string' || value === undefined) {
          next[key] = value
        }
        break
      }
      case 'functionCallingMode': {
        if (value === 'auto' || value === 'any' || value === 'none') {
          next.functionCallingMode = value
        }
        break
      }
      case 'maxTokens':
      case 'temperature':
      case 'topK':
      case 'topP':
      case 'presencePenalty':
      case 'frequencyPenalty':
      case 'thinkingBudget': {
        if (typeof value === 'number' || value === null) {
          next[key] = value
        }
        break
      }
      case 'geminiEnableFunctionCalling':
      case 'geminiEnableGrounding':
      case 'enableDummyUserPrompt':
      case 'enableDummyModelPrompt':
      case 'prependDummyModelToResponse': {
        if (typeof value === 'boolean') {
          next[key] = value
        }
        break
      }
    }
  }

  return next
}

export const extractProfileSettings = (settings: AppSettings | SettingsProfileData): SettingsProfileData => {
  const {
    modelName,
    systemPrompt,
    maxTokens,
    temperature,
    topK,
    topP,
    presencePenalty,
    frequencyPenalty,
    thinkingBudget,
    geminiEnableFunctionCalling,
    functionCallingMode,
    enabledFunctionTools,
    geminiEnableGrounding,
    enableDummyUserPrompt,
    dummyUserPrompt,
    enableDummyModelPrompt,
    dummyModelPrompt,
    prependDummyModelToResponse,
    profileImage,
  } = settings as AppSettings & SettingsProfileData

  return {
    modelName,
    systemPrompt,
    maxTokens,
    temperature,
    topK,
    topP,
    presencePenalty,
    frequencyPenalty,
    thinkingBudget,
    geminiEnableFunctionCalling,
    functionCallingMode,
    enabledFunctionTools: [...enabledFunctionTools],
    geminiEnableGrounding,
    enableDummyUserPrompt,
    dummyUserPrompt,
    enableDummyModelPrompt,
    dummyModelPrompt,
    prependDummyModelToResponse,
    profileImage,
  }
}

export const extractGlobalSettings = (settings: AppSettings): GlobalSettingsSnapshot => {
  const {
    modelName: _modelName,
    systemPrompt: _systemPrompt,
    maxTokens: _maxTokens,
    temperature: _temperature,
    topK: _topK,
    topP: _topP,
    presencePenalty: _presencePenalty,
    frequencyPenalty: _frequencyPenalty,
    thinkingBudget: _thinkingBudget,
    geminiEnableFunctionCalling: _geminiEnableFunctionCalling,
    functionCallingMode: _functionCallingMode,
    enabledFunctionTools: _enabledFunctionTools,
    geminiEnableGrounding: _geminiEnableGrounding,
    enableDummyUserPrompt: _enableDummyUserPrompt,
    dummyUserPrompt: _dummyUserPrompt,
    enableDummyModelPrompt: _enableDummyModelPrompt,
    dummyModelPrompt: _dummyModelPrompt,
    prependDummyModelToResponse: _prependDummyModelToResponse,
    ...globalSettings
  } = settings

  if (globalSettings.defaultUserAvatar) {
    globalSettings.defaultUserAvatar = { ...globalSettings.defaultUserAvatar }
  }
  if (globalSettings.defaultAssistantAvatar) {
    globalSettings.defaultAssistantAvatar = { ...globalSettings.defaultAssistantAvatar }
  }
  if (globalSettings.uploadedFont) {
    globalSettings.uploadedFont = { ...globalSettings.uploadedFont }
  }

  return globalSettings
}

export const mergeSettingsFromSlices = (base: AppSettings, global: Partial<GlobalSettingsSnapshot>, profile: Partial<SettingsProfileData>): AppSettings => {
  const merged: AppSettings = {
    ...base,
    ...global,
    ...profile,
  }

  if (profile.enabledFunctionTools) {
    merged.enabledFunctionTools = [...profile.enabledFunctionTools]
  }

  return merged
}
