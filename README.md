# Gemini PWA Vue

## 目次
*   [使い方](#使い方)
*   [主な機能](#主な機能)
*   [追加機能](#追加機能)
*   [移植しきれていない機能](#移植しきれていない機能)
*   [アップデート予定](#アップデート予定)

## 使い方
ローカルで使用する場合  
[Node](https://nodejs.org/ja/download)をインストール  
[Bun](https://bun.com/docs/installation)をインストール (Bun推奨 yarn or npm可)  

```bash
bun install
bun run build
bun preview
```
  
リモートで使用する場合  
リポジトリを作成し、[Vercel](https://vercel.com/)等にデプロイしてください。

## 主な機能

[Gemini PWA Client Mk-II](https://github.com/kinkan04/Gemini-PWA-Mk-II)をVueに移植した物です。

## 追加機能

- 思考プロセス翻訳設定  
思考プロセスの翻訳にGeminiとDeeplを選択できます。  
Deeplを使う場合にはDeepl用のAPIキーが必要です。  

- フォント設定  
フォントをプリセット(Google Font)から選択、システムフォントから選択、アップロードして使用することが出来ます。  
設定したフォントをプレビューできます。  

- Geminiモデルを公式から取得して設定  
有効なAPIが設定されていれば公式からモデル一覧を取得します。  
モデル名にgeminiが含まれるもののみ表示・設定可能にしています。  

## 移植しきれていない機能(上から順に優先度高)
- スワイプナビゲーション
- 自動リトライ機能

## アップデート予定(上から順に優先度高)
- チャット画面で一部機能の設定を変更可能にする
  - ダミー設定やFunction Calling、検索機能を設定へ行き来せず変更可能にしたい
- Function Callingで使いたいツールのみ有効にする
  - 一律で全てを有効にせず、有効にしたいツールを選択できるようにする
- チャット毎にアイコンを設定可能にする
- 画像表示時のサイズをユーザーが設定可能にする(現在はブラウザ幅)
- Gemini以外にも対応する

---

## 更新履歴
### Version 0.1.0-beta (2025-9-16)  

---
## LICENSE MIT

