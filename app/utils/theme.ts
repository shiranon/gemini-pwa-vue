import type { ThemePresetId } from '~/types/settings'

export interface ThemePreset {
  id: ThemePresetId
  label: string
  description: string
  swatches: [string, string]
  userBubbleColor: string
  assistantBubbleColor: string
}

const themePresets: ThemePreset[] = [
  {
    id: 'default',
    label: 'ニュートラル',
    description: 'ニュートラルで柔らかいベーシックテーマ',
    swatches: ['#f8fafc', '#1d4ed8'],
    userBubbleColor: '#edf2ff',
    assistantBubbleColor: '#ffffff',
  },
  {
    id: 'midnight',
    label: 'ミッドナイトブルー',
    description: '青系アクセントのクールなテーマ',
    swatches: ['#0b1120', '#60a5fa'],
    userBubbleColor: '#1b2538',
    assistantBubbleColor: '#111a2d',
  },
  {
    id: 'forest',
    label: 'フォレスト',
    description: '自然を感じるグリーンベースのテーマ',
    swatches: ['#f6faf4', '#3f8f6b'],
    userBubbleColor: '#ecf4e6',
    assistantBubbleColor: '#fdfcf5',
  },
  {
    id: 'rose',
    label: 'ローズ',
    description: '柔らかいピンクトーンのテーマ',
    swatches: ['#fff1f6', '#f472b6'],
    userBubbleColor: '#fde5ef',
    assistantBubbleColor: '#fff7fb',
  },
  {
    id: 'noir',
    label: 'ノワール',
    description: '黒を基調としたハイコントラストテーマ',
    swatches: ['#050506', '#6366f1'],
    userBubbleColor: '#1e1f28',
    assistantBubbleColor: '#121217',
  },
]

export function getThemePreset(id: ThemePresetId | string | undefined): ThemePreset {
  const fallback = themePresets[0]
  if (!fallback) {
    throw new Error('No theme presets configured')
  }
  return themePresets.find((preset) => preset.id === id) ?? fallback
}

export function applyTheme(presetId: ThemePresetId) {
  if (!import.meta.client) return

  const preset = getThemePreset(presetId)
  const root = document.documentElement
  root.dataset.theme = preset.id
  root.style.removeProperty('color-scheme')
}

export function getThemePresetOptions() {
  return themePresets.map((preset) => ({
    label: preset.label,
    description: preset.description,
    value: preset.id,
    preview: {
      primary: preset.swatches[1],
      background: preset.swatches[0],
    },
  }))
}

export function getThemeBubbleColors(presetId: ThemePresetId | string | undefined) {
  const preset = getThemePreset(presetId)
  return {
    user: preset.userBubbleColor,
    assistant: preset.assistantBubbleColor,
  }
}
