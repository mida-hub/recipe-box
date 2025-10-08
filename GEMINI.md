# プロジェクト概要
レシピメモアプリ

# 目的
家族向けのシンプルな料理レシピメモアプリを開発する。レシピのメモ、料理本の写真、料理サイトのリンクを一つの場所で管理できるようにする。
ただし、Google Cloud の組織設定により、組織内のユーザー(家族)のみの利用を担保している。

# 想定ケース
1. 自分で材料や手順をメモする
2. 料理本を写メで撮って画像を貼り付ける
3. 料理サイトのリンクを貼り、少し注釈を追記する

# 技術スタック
- フロントエンド: React (Vite)
- CSSフレームワーク: Material-UI (MUI)
- バックエンド: Cloud Run
- データベース: Firebase Firestore, Firebase Storage
- 認証: Firebase Authentication
- ホスティング: Firebase Hosting

# 機能要件
1. 認証機能
- Firebase Authenticationを用いたユーザーログイン機能。
- Googleアカウントなど外部プロバイダーでの認証に対応。

2. レシピCRUD: レシピの作成 (Create)、閲覧 (Read)、更新 (Update)、削除 (Delete) 機能。
- 作成: フォームからの入力と、画像アップロード機能。
- 閲覧: レシピ詳細画面で、テキスト、画像、リンクを整形して表示。
3. 画像管理: Firebase Storage に画像をアップロードし、そのURLを Cloud Firestore に保存。

4. リスト表示:
- タイトル五十音順にソート。
- お気に入り (isFavorite: true) のレシピをリストの最上位に表示。

# 画面構成
ログイン後画面
- ヘッダー:
  - 検索バー: タイトルで検索
  - 新規レシピ追加ボタン
  - ログアウトボタン
- レシピリスト:
  - 並び替え: タイトル五十音順 (お気に入りが最上位)
  - レシピカード: タイトル、お気に入りボタンを表示
- フローティングボタン: 画面右下に常に表示されるレシピ追加ボタン

# データモデル（Firestore）
recipesコレクション
- id (string): ドキュメントID
- title (string): レシピのタイトル
- isFavorite (boolean): お気に入りフラグ
- notes (string): レシピ全体に関するメモや注釈
- link (string): 料理サイトのURL
- ingredients (array of objects): 材料と分量
  - name (string): 材料名
  - quantity (string): 分量
- steps (array of objects): 手順
  - description (string): 手順の詳細
  - imageUrls (array of strings): 手順ごとの画像URLリスト

# 開発環境
- ローカル開発: Docker Composeを用いたFirebase Emulator Suiteの利用。
- デプロイ:
  - フロントエンド: Firebase Hosting
  - バックエンド: Cloud Run

## ローカル開発手順
```sh
docker compose up --build
docker compose down
```

# Google Cloud 設定
- project_id: recipe-box-474414 (本番/開発共通プロジェクト)

# MCP Server
- Serena: Language Server Protocol. 構文解析を実行し、コード編集は Serena のツールを利用して行う

# コード編集について
- MCP Server (Serena) を利用してコード編集を行うこと
