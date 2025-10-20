# Function Calling システム

このディレクトリには、Gemini AIのFunction Calling機能で使用される関数群が含まれています。  
AIが適切なタイミングでこれらの関数を呼び出し、アプリケーションの機能を拡張します。

## 📁 ディレクトリ構造

```
app/function-calling/
├── README.md                 # このファイル
├── registry.ts              # 関数登録システム
├── validation.ts            # バリデーション用ユーティリティ
├── random.ts                # ランダム生成ユーティリティ
├── selection.ts             # 関数選択ロジック
├── defaults.ts              # デフォルト設定
└── functions/               # 個別関数の実装
    ├── datetime.ts          # 日時取得
    ├── rollDice.ts          # ダイスロール
    ├── manageInventory.ts   # インベントリ管理
    ├── manageCharacterStatus.ts # ステータス管理
    ├── manageScene.ts       # シーン管理
    ├── manageFlags.ts       # フラグ管理
    ├── manageRelationship.ts # 関係値管理
    ├── manageStyleProfile.ts # スタイルプロファイル管理
    └── ... (その他の関数)
```

## 🚀 新しい関数の追加方法

### 1. 関数ファイルの作成

`functions/` ディレクトリに新しい関数ファイルを作成します。

```typescript
// functions/myNewFunction.ts
import { Type } from '@google/genai'
import type { FunctionCallArgs, FunctionDeclaration, FunctionExecutionContext } from '~/types/function-calling'
import { logger } from '~/lib/logger'

/**
 * 新しい関数の実装
 */
export async function myNewFunction(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<{ result: string } | { error: string }> {
  logger.info('[Function Calling] myNewFunctionが呼び出されました', { component: 'myNewFunction' }, context)
  
  // 関数の実装
  const result = '処理結果'
  
  return { result }
}

/**
 * 関数の宣言（Gemini AI用）
 */
export const myNewFunctionDeclaration: FunctionDeclaration = {
  name: 'myNewFunction',
  description: '新しい関数の説明',
  parameters: {
    type: Type.OBJECT,
    properties: {
      param1: {
        type: Type.STRING,
        description: 'パラメータ1の説明',
      },
    },
    required: ['param1'],
  },
}
```

### 2. レジストリへの登録

`registry.ts` に新しい関数を追加します。

```typescript
// registry.ts の import セクションに追加
import { myNewFunction, myNewFunctionDeclaration } from './functions/myNewFunction'

// functionToolDefinitions 配列に追加
export const functionToolDefinitions: FunctionToolDefinition[] = [
  // ... 既存の関数
  {
    declaration: myNewFunctionDeclaration,
    handler: myNewFunction,
    meta: {
      id: 'myNewFunction',
      displayName: '新しい関数',
      description: '新しい関数の詳細説明',
      category: 'utility',
      tags: ['new', 'function'],
      defaultEnabled: false,
      argsHint: 'param1 - パラメータの説明',
      contextHint: 'この関数の使用場面の説明',
    },
  },
]
```

## 📋 関数の実装パターン

### 基本的な構造

```typescript
export async function functionName(
  args: FunctionCallArgs,
  context: FunctionExecutionContext
): Promise<SuccessResult | ErrorResult> {
  // 1. ログ出力
  logger.info('[Function Calling] functionNameが呼び出されました', { component: 'functionName' }, context)
  
  // 2. 引数の検証
  if (!args.requiredParam) {
    return { error: '必須パラメータが不足しています' }
  }
  
  // 3. メイン処理
  try {
    const result = await mainProcess(args)
    return { result }
  } catch (error) {
    return { error: `エラーが発生しました: ${error.message}` }
  }
}
```

### エラーハンドリング

```typescript
// バリデーションエラー
if (!isValidInput(args.input)) {
  return { error: '無効な入力です' }
}

// 実行時エラー
try {
  const result = await riskyOperation()
  return { result }
} catch (error) {
  logger.error('処理中にエラーが発生', { component: 'functionName' }, error)
  return { error: `エラー: ${error.message}` }
}
```

### 永続メモリの使用

```typescript
// 永続メモリへのアクセス
const persistentMemory = context.persistentMemory || {}
const data = persistentMemory.myData || {}

// データの更新
persistentMemory.myData = updatedData
```

## 🏷️ メタデータの設定

各関数には以下のメタデータを設定できます：

```typescript
meta: {
  id: 'uniqueFunctionId',           // 一意のID
  displayName: '表示名',             // UI表示用の名前
  description: '関数の説明',         // 詳細説明
  category: 'game',                 // カテゴリ（game, utility, story, character等）
  tags: ['tag1', 'tag2'],           // タグ
  defaultEnabled: false,           // デフォルトで有効かどうか
  argsHint: '引数のヒント',          // 引数の説明
  contextHint: '使用場面の説明',     // 使用場面の説明
}
```

## 🔧 ユーティリティ関数

### バリデーション (`validation.ts`)

```typescript
import { isInteger, isPositiveInteger, isNonEmptyString } from '~/function-calling/validation'

// 使用例
if (!isPositiveInteger(args.count)) {
  return { error: '個数は正の整数である必要があります' }
}
```

### ランダム生成 (`random.ts`)

```typescript
import { getRandomInt, getRandomElement, getRandomString } from '~/function-calling/random'

// 使用例
const randomNumber = getRandomInt(1, 6)  // 1-6のランダム整数
const randomItem = getRandomElement(items)  // 配列からランダム選択
const randomString = getRandomString(10)  // 10文字のランダム文字列
```

## 🧪 テストの追加

新しい関数には必ずテストを追加してください：

```typescript
// tests/function-calling/functions/myNewFunction.spec.ts
import { describe, it, expect } from 'bun:test'
import { myNewFunction } from '~/function-calling/functions/myNewFunction'

describe('myNewFunction', () => {
  it('正常な引数で実行できる', async () => {
    const args = { param1: 'test' }
    const context = { timestamp: Date.now() }
    
    const result = await myNewFunction(args, context)
    
    expect(result).toHaveProperty('result')
  })
  
  it('必須パラメータが不足している場合はエラーを返す', async () => {
    const args = {}
    const context = { timestamp: Date.now() }
    
    const result = await myNewFunction(args, context)
    
    expect(result).toHaveProperty('error')
  })
})
```

## 📚 既存の関数例

### シンプルな関数（`rollDice.ts`）
- ダイスロールの実行
- 引数検証とエラーハンドリング
- 結果の構造化

### 複雑な関数（`manageInventory.ts`）
- 永続メモリの使用
- 複数のアクション（add/remove/check）
- データの整合性管理

### 非同期関数（`manageBackground.ts`）
- データベースからの動的データ取得
- 非同期での宣言生成

## ⚠️ 注意事項

1. **関数名の一意性**: 各関数は一意の名前を持つ必要があります
2. **エラーハンドリング**: 必ず適切なエラーハンドリングを実装してください
3. **ログ出力**: デバッグのために適切なログを出力してください
4. **型安全性**: TypeScriptの型を適切に使用してください
5. **テスト**: 新しい関数には必ずテストを追加してください
6. **ドキュメント**: 関数の目的と使用方法を明確にドキュメント化してください

## 🔄 関数の更新・削除

- **更新**: 関数の実装を変更した後、`registry.ts`のメタデータも更新してください
- **削除**: 関数を削除する場合は、`registry.ts`からも削除し、関連するテストも削除してください

このシステムにより、AIが適切なタイミングで必要な機能を呼び出し、ユーザーエクスペリエンスを向上させることができます。
