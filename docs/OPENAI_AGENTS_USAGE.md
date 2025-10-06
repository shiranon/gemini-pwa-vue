# OpenAI Agents API Composable Usage Guide

`useOpenAiAgentsApi` は、Gemini API (`useGeminiApi`) と互換性のあるインターフェースを持つ OpenAI Agents SDK ベースの composable です。

## 概要

このcomposableは、OpenAI の `@openai/agents` パッケージを使用してチャット機能を提供します。Gemini API との互換性を保つことで、既存のコードを最小限の変更で OpenAI に切り替えることができます。

## インストール

`@openai/agents` パッケージは既にインストール済みです（`package.json` を参照）:

```json
{
  "dependencies": {
    "@openai/agents": "0.1.9"
  }
}
```

## 基本的な使い方

### 1. 非ストリーミング生成

```typescript
import { useOpenAiAgentsApi } from '~/composables/useOpenAiAgentsApi'

const { generateContent } = useOpenAiAgentsApi()

const settings: OpenAiApiSettings = {
  apiKey: 'your-openai-api-key',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2000,
  topK: 40,
  topP: 0.95,
  systemPrompt: 'You are a helpful assistant',
  streamingOutput: false,
}

const messages: GeminiMessage[] = [
  {
    role: 'user',
    parts: [{ text: 'Hello, how are you?' }],
  },
]

const generationConfig = {
  temperature: settings.temperature,
  maxOutputTokens: settings.maxTokens,
  topP: settings.topP,
}

const systemInstruction = {
  role: 'system',
  parts: [{ text: settings.systemPrompt }],
}

const response = await generateContent(
  messages,
  generationConfig,
  systemInstruction,
  settings
)

console.log('Response:', response.text)
console.log('Function Calls:', response.functionCalls)
console.log('Function Results:', response.functionResults)
```

### 2. ストリーミング生成

```typescript
import { useOpenAiAgentsApi } from '~/composables/useOpenAiAgentsApi'

const { generateContentStream } = useOpenAiAgentsApi()

const settings: OpenAiApiSettings = {
  apiKey: 'your-openai-api-key',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2000,
  topK: 40,
  topP: 0.95,
  systemPrompt: 'You are a helpful assistant',
  streamingOutput: true,
}

const messages: GeminiMessage[] = [
  {
    role: 'user',
    parts: [{ text: 'Tell me a story about a cat.' }],
  },
]

const generationConfig = {
  temperature: settings.temperature,
  maxOutputTokens: settings.maxTokens,
  topP: settings.topP,
}

const systemInstruction = {
  role: 'system',
  parts: [{ text: settings.systemPrompt }],
}

let fullText = ''

for await (const chunk of generateContentStream(
  messages,
  generationConfig,
  systemInstruction,
  settings
)) {
  if (chunk.type === 'chunk') {
    fullText += chunk.contentText
    console.log('Chunk:', chunk.contentText)

    // Function Calls がある場合
    if (chunk.functionCalls) {
      console.log('Function Calls:', chunk.functionCalls)
    }

    // Function Results がある場合
    if (chunk.data.functionResults) {
      console.log('Function Results:', chunk.data.functionResults)
    }
  }
}

console.log('Full response:', fullText)
```

### 3. Function Calling

Function Calling を有効にするには、設定に `functionCalling` オプションを追加します:

```typescript
const settings: OpenAiApiSettings = {
  apiKey: 'your-openai-api-key',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2000,
  topK: 40,
  topP: 0.95,
  systemPrompt: 'You are a helpful TRPG assistant',
  streamingOutput: false,
  functionCalling: {
    enabled: true,
    mode: 'auto', // 'auto' | 'any' | 'none'
    allowedFunctionNames: ['rollDice', 'manageInventory'], // オプション: 使用可能な関数を制限
  },
}

// Function Calling が有効な場合、レスポンスに functionCalls と functionResults が含まれる
const response = await generateContent(
  messages,
  generationConfig,
  systemInstruction,
  settings
)

if (response.functionCalls) {
  console.log('Functions called by the AI:', response.functionCalls)
}

if (response.functionResults) {
  console.log('Results from functions:', response.functionResults)
}
```

### 4. API キーの検証

```typescript
import { useOpenAiAgentsApi } from '~/composables/useOpenAiAgentsApi'

const { validateApiKey } = useOpenAiAgentsApi()

const isValid = await validateApiKey('your-openai-api-key', 'gpt-4o-mini')

if (isValid) {
  console.log('API key is valid!')
} else {
  console.error('Invalid API key')
}
```

### 5. 利用可能なモデル一覧の取得

```typescript
import { useOpenAiAgentsApi } from '~/composables/useOpenAiAgentsApi'

const { getAvailableModels } = useOpenAiAgentsApi()

const models = await getAvailableModels('your-openai-api-key')

console.log('Available models:', models)
// Output: ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o', 'gpt-4o-mini', ...]
```

### 6. GPT-5 モデルの高度な設定

GPT-5 モデルでは、**reasoning（推論）effort** と **text verbosity（詳細度）** をカスタマイズできます。

#### デフォルト設定（自動適用とマージ）

GPT-5モデルでは、`modelSettings` を指定しない場合、または部分的に指定した場合、デフォルト値が自動的に適用されます。

```typescript
// 完全にデフォルト設定を使用
const settings: OpenAiApiSettings = {
  apiKey: 'your-openai-api-key',
  model: 'gpt-5',
  temperature: 0.7,
  maxTokens: 2000,
  topK: 40,
  topP: 0.95,
  systemPrompt: 'You are a helpful assistant',
  streamingOutput: false,
  // modelSettings 未指定 → デフォルト値が使用されます:
  // reasoning: { effort: 'low' }
  // text: { verbosity: 'low' }
}

// 部分的に設定（残りはデフォルト値が使用される）
const settings2: OpenAiApiSettings = {
  apiKey: 'your-openai-api-key',
  model: 'gpt-5',
  temperature: 0.7,
  maxTokens: 2000,
  topK: 40,
  topP: 0.95,
  systemPrompt: 'You are a helpful assistant',
  streamingOutput: false,
  modelSettings: {
    reasoning: { effort: 'high' }, // カスタム設定
    // text は未指定 → デフォルト { verbosity: 'low' } が使用される
  },
}

// reasoning のみ未指定
const settings3: OpenAiApiSettings = {
  apiKey: 'your-openai-api-key',
  model: 'gpt-5',
  temperature: 0.7,
  maxTokens: 2000,
  topK: 40,
  topP: 0.95,
  systemPrompt: 'You are a helpful assistant',
  streamingOutput: false,
  modelSettings: {
    // reasoning は未指定 → デフォルト { effort: 'low' } が使用される
    text: { verbosity: 'high' }, // カスタム設定
  },
}
```

#### カスタム設定

```typescript
const settings: OpenAiApiSettings = {
  apiKey: 'your-openai-api-key',
  model: 'gpt-5',
  temperature: 0.7,
  maxTokens: 2000,
  topK: 40,
  topP: 0.95,
  systemPrompt: 'You are a helpful assistant',
  streamingOutput: false,
  // GPT-5 モデル専用設定
  modelSettings: {
    reasoning: {
      effort: 'high', // 'minimal' | 'low' | 'medium' | 'high'
    },
    text: {
      verbosity: 'medium', // 'low' | 'medium' | 'high'
    },
  },
}
```

#### Reasoning Effort の選択ガイド

- **`'minimal'`** - 最速の応答が必要な場合（一部ツールはサポートしない場合あり）
- **`'low'`** - 速度と品質のバランス（デフォルト）
- **`'medium'`** - より深い推論が必要な場合
- **`'high'`** - 最高品質の推論が必要な複雑なタスク

#### Text Verbosity の選択ガイド

- **`'low'`** - 簡潔な回答が必要な場合（デフォルト）
- **`'medium'`** - 適度な詳細度
- **`'high'`** - 詳細な説明が必要な場合

#### モデルバリアントの選択ガイド

```typescript
// 高性能・高精度が必要な場合
const settings: OpenAiApiSettings = {
  model: 'gpt-5',
  modelSettings: {
    reasoning: { effort: 'high' },
    text: { verbosity: 'high' },
  },
  // ...
}

// バランスの取れた性能（推奨）
const settings: OpenAiApiSettings = {
  model: 'gpt-5-mini',
  modelSettings: {
    reasoning: { effort: 'low' },
    text: { verbosity: 'low' },
  },
  // ...
}

// 最速のレスポンスが必要な場合
const settings: OpenAiApiSettings = {
  model: 'gpt-5-nano',
  modelSettings: {
    reasoning: { effort: 'minimal' },
    text: { verbosity: 'low' },
  },
  // ...
}
```

## Gemini API からの移行

既存の Gemini API コードを OpenAI Agents API に移行する場合:

### Before (Gemini)

```typescript
import { useGeminiApi } from '~/composables/useGeminiApi'

const { generateContent } = useGeminiApi()

const settings: GeminiApiSettings = {
  apiKey: 'your-gemini-api-key',
  model: 'gemini-2.5-flash',
  // ...
}

const response = await generateContent(messages, config, systemInstruction, settings)
```

### After (OpenAI)

```typescript
import { useOpenAiAgentsApi } from '~/composables/useOpenAiAgentsApi'

const { generateContent } = useOpenAiAgentsApi()

const settings: OpenAiApiSettings = {
  apiKey: 'your-openai-api-key',
  model: 'gpt-4o-mini', // モデル名を変更
  // ... その他の設定は同じ
}

const response = await generateContent(messages, config, systemInstruction, settings)
```

## OpenAI Agents SDK の特徴

### Agentベースのアーキテクチャ

OpenAI Agents SDK では、各リクエストで Agent を作成します:

```typescript
const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant',
  model: 'gpt-4o-mini',
  tools: [...], // Function Calling のツール
})

const result = await run(agent, 'User input here')
```

### ストリーミングイベント

ストリーミング時には以下のイベントを受信します:

- `raw_model_stream_event`: モデルからのテキストチャンク
- `tool_call`: Function Call イベント
- その他のエージェント関連イベント

## 型定義

### Gpt5ReasoningSettings

```typescript
export interface Gpt5ReasoningSettings {
  effort?: 'minimal' | 'low' | 'medium' | 'high'
}
```

### Gpt5TextSettings

```typescript
export interface Gpt5TextSettings {
  verbosity?: 'low' | 'medium' | 'high'
}
```

### Gpt5ModelSettings

```typescript
export interface Gpt5ModelSettings {
  reasoning?: Gpt5ReasoningSettings
  text?: Gpt5TextSettings
}
```

### OpenAiApiSettings

```typescript
export interface OpenAiApiSettings extends Omit<GeminiApiSettings, 'model'> {
  model: string // OpenAI model name
  baseURL?: string // カスタムベースURL（オプション）
  organization?: string // Organization ID（オプション）
  modelSettings?: Gpt5ModelSettings // GPT-5 モデル専用設定（オプション）
}
```

### OpenAiStreamingChunk

```typescript
export interface OpenAiStreamingChunk {
  type: 'chunk'
  contentText: string
  thoughts?: string
  functionCalls?: FunctionCall[]
  data: Record<string, unknown> & {
    functionResults?: FunctionCallResult[]
  }
}
```

### OpenAiCombinedResponse

```typescript
export type OpenAiCombinedResponse = {
  text: string
  thoughts?: string
  functionCalls?: FunctionCall[]
  functionResults?: FunctionCallResult[]
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}
```

## 利用可能な OpenAI モデル

### GPT-5 モデル（最新・推奨）

- **`gpt-5`** - 最新の GPT-5 モデル（高性能・高精度）
- **`gpt-5-mini`** - 軽量で高速な GPT-5 モデル
- **`gpt-5-nano`** - 超高速・低レイテンシの GPT-5 モデル

### GPT-4o モデル

- `gpt-4o` - GPT-4 Optimized モデル
- `gpt-4o-mini` - 軽量で高速な GPT-4 Optimized モデル

### その他のモデル

- `gpt-4-turbo` - GPT-4 Turbo モデル
- `gpt-4` - 標準の GPT-4 モデル
- `gpt-3.5-turbo` - GPT-3.5 Turbo モデル
- `o1` - OpenAI o1 モデル
- `o1-mini` - OpenAI o1 Mini モデル

## 注意事項

1. **API キー**: OpenAI API キーが必要です（環境変数 `OPENAI_API_KEY` で設定可能）
2. **互換性**: Gemini API と同じインターフェースを提供していますが、一部の機能（思考プロセスなど）は完全に互換ではありません
3. **Function Calling**: OpenAI Agents SDK では自動的に Function Call の結果が処理されます
4. **モデル名**: OpenAI のモデル名を使用してください（例: `gpt-5-mini`, `gpt-4o-mini`）
5. **ツール定義**: OpenAI の Function Calling 形式に自動変換されます
6. **GPT-5 モデル**:
   - GPT-5 系モデルを使用する場合、`modelSettings` を指定しない場合は自動的にデフォルト設定（`effort: 'low'`, `verbosity: 'low'`）が適用されます
   - `effort: 'minimal'` は一部のツール（Function Calling など）でサポートされない場合があります
   - 最速のレスポンスが必要な場合は `gpt-5-nano` + `effort: 'minimal'` の組み合わせを使用してください
   - 高品質な推論が必要な場合は `gpt-5` + `effort: 'high'` の組み合わせを使用してください

## トラブルシューティング

### API キーエラー

```
Error: OpenAI Agents API call failed
```

- OpenAI API キーが正しく設定されているか確認してください
- API キーに十分な権限があるか確認してください

### モデルが見つからない

```
Error: Model not found
```

- 利用可能なモデル名を使用しているか確認してください
- アカウントがそのモデルにアクセスできるか確認してください

### Function Calling が動作しない

- `functionCalling.enabled` が `true` になっているか確認
- `useFunctionCalling` composable で関数が有効になっているか確認
- 関数定義が正しい形式か確認

## 参考リンク

- [OpenAI Agents SDK Documentation](https://openai.github.io/openai-agents-js/)
- [OpenAI Agents SDK - GPT-5 Models Guide](https://openai.github.io/openai-agents-js/guides/models/#gpt-5-models)
- [OpenAI Agents SDK GitHub](https://github.com/openai/openai-agents-js)
- [OpenAI Platform Documentation](https://platform.openai.com/docs/)

## サポート

問題が発生した場合は、GitHub Issues に報告してください。
