# Topaz Deploy Action

リポジトリ内の Markdown ファイルを [Topaz](https://topaz.dev) プロジェクトの本文 (`body`) に自動デプロイする GitHub Action です。

push をトリガーに、記事の内容を Topaz に同期できます。

## 仕組み

```
Firebase Refresh Token
  ↓ securetoken.googleapis.com
Firebase ID Token
  ↓ createSessionCookie (AWS Lambda)
Session Cookie
  ↓ topaz.dev/api/auth/login
topaz_session
  ↓ GET /api/projects/{id}/edit  → 現在のプロジェクト JSON を取得
  ↓ body を Markdown の内容で差し替え
  ↓ PUT /api/projects/{id}       → 更新
```

## 使い方

### 1. GitHub Secrets を設定

リポジトリの Settings > Secrets and variables > Actions に以下を登録してください。

| Secret 名 | 内容 |
|---|---|
| `FIREBASE_API_KEY` | Firebase の API Key |
| `FIREBASE_REFRESH_TOKEN` | Firebase の Refresh Token |
| `TOPAZ_PROJECT_ID` | Topaz のプロジェクト ID（URL の末尾） |

### 2. ワークフローを作成

`.github/workflows/topaz-deploy.yml`:

```yaml
name: Topaz Deploy

on:
  push:
    branches: [main]
    paths:
      - 'docs/topaz.md'  # デプロイ対象のファイルパス

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: your-username/topaz-actions@v1
        with:
          firebase-api-key: ${{ secrets.FIREBASE_API_KEY }}
          firebase-refresh-token: ${{ secrets.FIREBASE_REFRESH_TOKEN }}
          topaz-project-id: ${{ secrets.TOPAZ_PROJECT_ID }}
          content-file-path: ./docs/topaz.md
```

これで `docs/topaz.md` を編集して main に push すると、Topaz のプロジェクトが自動更新されます。

## Inputs

| Name | Required | Description |
|------|----------|-------------|
| `firebase-api-key` | Yes | Firebase API Key |
| `firebase-refresh-token` | Yes | Firebase Refresh Token |
| `topaz-project-id` | Yes | Topaz プロジェクト ID |
| `content-file-path` | Yes | body に反映する Markdown ファイルのパス |

## Refresh Token の取得方法

1. ブラウザで [topaz.dev](https://topaz.dev) にログイン
2. 開発者ツール (F12) を開く
3. Application > IndexedDB > `firebaseLocalStorageDb` > `firebaseLocalStorage`
4. 該当エントリの `value.spiStorage.refresh_token` をコピー

## ローカルでのテスト

```bash
# 依存をインストール
npm install

# .env を作成
cp .env.example .env
# .env を編集して値を入れる

# テスト実行
source .env && npx tsx test-local.ts
```

## 開発

```bash
npm install
npm run build   # dist/index.js を生成
```

`dist/index.js` は Actions が直接実行するため、変更後は必ずビルドしてコミットしてください。
