# Gemini PWA Vue

## 目次
*   [使い方](#使い方)
*   [主な機能](#主な機能)
*   [追加機能](#追加機能)
*   [アップデート予定](#アップデート予定)
*   [更新履歴](#更新履歴)
*   [Changelog](./docs/CHANGELOG.md)

## 使い方
### ローカルで使用する場合  
[Node](https://nodejs.org/ja/download) をインストール(node22 推奨)  
[Bun](https://bun.com/docs/installation) をインストール (Bun推奨 yarn or npm可)  

```bash
bun install
bun dev
```
  
### リモートで使用する場合  
リポジトリをFork、Cloneし、[Vercel](https://vercel.com/) 等にデプロイしてください。  
タグ切りリリースが必要ない場合は`vercel.json`, `.github` を削除してください。  
  
[デモサイト](https://gemini-pwa-vue.vercel.app/)

## 主な機能

[Gemini PWA Client Mk-II](https://github.com/kinkan04/Gemini-PWA-Mk-II) Ver 0.3時点をVueに移植した物です。  
マルチモーダルやプロファイル機能は今後対応予定です。

## 追加機能

- キャラクター画像表示機能  
チャット内でキャラクター画像を表示する機能を追加  
マークダウン記法で `![C-](:character/キャラクター名/衣装/表情やシーン名 "画像")` のように記述することで画像を表示  
画像管理ページでキャラクター・衣装・表情を事前に登録可能  
フォルダ一括アップロードや衣装画像一括アップロードに対応  
画像エクスポート機能で登録した画像をバックアップ可能  
  
- クイック設定機能  
クイック設定モーダルから一時的に設定を切り替える事が可能です。
プロファイル切り替えボタンの上のボタンからモーダルを開く事ができます。
<img width="244" height="525" alt="quicks" src="https://github.com/user-attachments/assets/b1f8b525-70b3-46b9-9ba6-74075dc2e5bd" />

- 任意のタイミングで要約する機能を追加  
要約実行後は要約以前のメッセージを送信しないことでコンテキスト量を節約できます。  
校正機能のように要約用モデルやプロンプトを調整可能です。  

- 思考プロセス翻訳設定  
思考プロセスの翻訳にGeminiとDeeplを選択できます。  
Deeplを使う場合にはDeepl用のAPIキーが必要です。  

- フォント設定  
フォントをプリセット(Google Font)から選択、システムフォントから選択、アップロードして使用することが出来ます。  
設定したフォントをプレビューできます。  

- Geminiモデルを公式から取得して設定  
有効なAPIが設定されていれば公式からモデル一覧を取得します。  
モデル名にgeminiが含まれるもののみ表示・設定可能にしています。  

- FunctionCallingツール選択設定
  - FunctionCalling機能でGeminiに送るツールを選択する事が出来ます。  

- Geminiの [groundingTool](https://ai.google.dev/gemini-api/docs/google-search?hl=ja) を使うことでGoogle検索用APIを設定不要にしました。

## アップデート予定(上から順に優先度高)
- トークン消費量を表示する
- 背景を事前に登録しFC機能で切り替えの呼び出しが出来るようにする
- コンテキスト量節約関連
  - 永続メモリの処理
    - システムプロンプトの末尾に永続メモリの情報を追加しAIに正確な判断をさせる
    - 要約することでチャット内から情報が欠けたとしても問題なくなるはず
- マルチモーダル対応
- チャット毎にアイコンを設定可能にする
- スワイプナビゲーション
- Gemini以外への対応

---
## Changelog
詳細な更新履歴は [CHANGELOG.md](./docs/CHANGELOG.md) をご確認ください。

## LICENSE MIT

