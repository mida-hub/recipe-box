# レシピメモ (Recipe Box)

家族向けのシンプルな料理レシピメモアプリです。
レシピのメモ、料理本の写真、料理サイトのリンクを一つの場所で一元管理できます。

---

## 主な機能 & 想定ユースケース

1. **手入力メモ**: 材料・分量、調理手順を自由に記録
2. **料理本の写真添付**: スマホで撮影した料理本・レシピカードの写真をステップごとに添付
3. **料理サイトのリンク保存**: お気に入り料理サイトの URL を貼り、自分なりの注釈やアレンジをメモ
4. **クイックアクセス**: タイトル検索、五十音順ソート、お気に入りトグル（最上位表示）

---

## 技術スタック

- **フロントエンド**: React 19, Vite, Material-UI (MUI), PWA (Vite-plugin-pwa)
- **バックエンド**: Go (Golang 1.27), Google Cloud Run (Distroless)
- **データベース / 認証 / ストレージ**: 
  - Firebase Firestore
  - Firebase Authentication (Google ログイン)
  - Firebase Storage (料理画像)
- **ホスティング**: Firebase Hosting
- **テスト**: Vitest, React Testing Library, Go testing
- **IaC / デプロイ**: Terraform, Google Cloud Build, Docker

---

## システム構成・設計方針

- **疎結合な 3 層アーキテクチャ**:
  - フロントエンドは直接 Firestore にアクセスせず、すべてバックエンド（Cloud Run）経由でデータ操作を行います。
- **高速化の設計**:
  - **PWA (Workbox)**: 静的アセット（JS / CSS / HTML）の完全プリキャッシュ
  - **localStorage**: ログイン状態推定による App Shell 即時表示 & 直近のレシピサマリー復元
  - **ETag / 304 Not Modified**: 変更がない場合のサーバーデータ再送・不要な再レンダリングをスキップ
  - **オンデマンド詳細取得 (プロジェクション)**: 一覧表示時はタイトル等のサマリーのみ取得し、重い材料・手順・画像は詳細表示時に取得

---

## 開発環境のセットアップ

### 前提条件
- Node.js (v20 以上推奨、フロントエンド開発用)
- Go (v1.27 推奨、バックエンド開発用)
- Docker & Docker Compose
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud SDK (`gcloud`)

### ローカル開発（Firebase Emulator Suite 連携）
Firebase Emulator を含む全環境を Docker Compose で一括起動できます。

```bash
# 起動 (ビルド含む)
docker compose up --build

# 停止
docker compose down
```

#### 各サービスへのアクセス先
- **フロントエンド**: http://localhost:5173
- **バックエンド**: http://localhost:3000
- **Firebase Emulator Suite UI**: http://localhost:4000
  - Firestore: port 8080
  - Auth: port 9099
  - Storage: port 9199

---

## テストの実行

### バックエンド テスト (Go)
```bash
cd backend
go test -v ./...
```

### フロントエンド テスト (Vitest + React Testing Library)
五十音ソート、検索フィルタリング、カード操作、詳細ダイアログの表示を検証します。

```bash
cd frontend
npm test
```

### フロントエンドのビルド確認
```bash
cd frontend
npm run build
```

---

## デプロイ手順

### 1. バックエンドのデプロイ (Cloud Run)
コンテナイメージを Cloud Build でビルドし、Cloud Run に反映します。

```bash
# ビルド & イメージプッシュ
./build-image.sh

# Cloud Run サービスを更新
gcloud run services update recipe-box-backend \
  --region=asia-northeast1 \
  --image=asia-northeast1-docker.pkg.dev/recipe-box-474414/recipe-box-repo/recipe-box-backend:latest \
  --project=recipe-box-474414
```
*(※ Terraform を利用している場合は `cd terraform && terraform apply`)*

### 2. フロントエンドのデプロイ (Firebase Hosting)

```bash
cd frontend
npm run deploy
```
*(※ `npm run build && cd .. && firebase deploy --only hosting` が自動実行されます)*

---

## トラブルシューティング

### デプロイ時に `Assertion failed: resolving hosting target...` が出る場合
Firebase CLI の認証トークンが期限切れになっている可能性があります。再ログインしてください。
```bash
firebase login --reauth
```

### フロントエンドのセキュリティ脆弱性チェック
```bash
cd frontend && npm audit
```
