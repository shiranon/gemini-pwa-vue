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
] as const satisfies readonly (keyof AppSettings)[]

export type ProfileSettingKey = (typeof PROFILE_SETTING_KEYS)[number]

export type GlobalSettingKey = Exclude<keyof AppSettings, ProfileSettingKey>

export type GlobalSettingsSnapshot = Pick<AppSettings, GlobalSettingKey>

const PROFILE_SETTING_KEY_SET = new Set<string>(PROFILE_SETTING_KEYS as readonly string[])

export const extractProfileSettings = (settings: AppSettings): SettingsProfileData => {
  const profile: Record<string, unknown> = {}
  for (const key of PROFILE_SETTING_KEYS) {
    const value = settings[key]
    if (key === 'enabledFunctionTools' && Array.isArray(value)) {
      profile[key] = [...value]
    } else if (key === 'geminiEnableFunctionCalling' && typeof value === 'boolean') {
      profile[key] = value
    } else {
      profile[key as string] = value as unknown
    }
  }
  if (!Array.isArray(profile.enabledFunctionTools)) {
    profile.enabledFunctionTools = []
  }
  return profile as unknown as SettingsProfileData
}

export const extractGlobalSettings = (settings: AppSettings): GlobalSettingsSnapshot => {
  const global: Record<string, unknown> = {}
  for (const key of Object.keys(settings) as (keyof AppSettings)[]) {
    if (PROFILE_SETTING_KEY_SET.has(key as string)) {
      continue
    }
    const value = settings[key]
    if (key === 'defaultUserAvatar' || key === 'defaultAssistantAvatar') {
      global[key as string] = value ? { ...(value as Record<string, unknown>) } : {}
    } else if (key === 'uploadedFont' && value) {
      global[key as string] = { ...(value as Record<string, unknown>) }
    } else {
      global[key as string] = value as unknown
    }
  }
  return global as GlobalSettingsSnapshot
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
