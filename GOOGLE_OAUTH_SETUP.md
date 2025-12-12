# Google OAuth 2.0 設定ガイド

## 1. Google Cloud Console設定

### 既存の設定確認
- プロジェクト: 既存のプロジェクトを使用
- Client ID: `115857349824-76pvjqfgnbflm9r0get55puuhm5o6jrj.apps.googleusercontent.com`

### 追加で必要な設定

#### A. 承認済みのリダイレクトURI
Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs で以下を追加：

```
http://localhost:3000/api/auth/google/callback
http://192.168.40.190:3000/api/auth/google/callback
```

#### B. 承認済みのJavaScript生成元
```
http://localhost:3000
http://192.168.40.190:3000
```

#### C. Client Secretの取得
1. Google Cloud Console > APIs & Services > Credentials
2. OAuth 2.0 Client IDをクリック
3. Client Secretをコピー
4. `.env.local`の`GOOGLE_CLIENT_SECRET`に設定

## 2. 必要なAPIの有効化

以下のAPIが有効になっていることを確認：
- Google+ API (または People API)
- Google OAuth2 API

## 3. スコープ設定

アプリケーションが要求するスコープ：
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

## 4. テスト用ユーザー設定

開発中は「テストユーザー」として以下を追加：
- あなたのGoogleアカウント
- コミュニティメンバーのGoogleアカウント

## 5. 本番公開時の注意

本番環境では：
1. 承認済みドメインを本番URLに変更
2. OAuth同意画面を「公開」に変更
3. プライバシーポリシーとサービス利用規約のURLを設定

## 6. セキュリティ設定

- Client Secretは絶対に公開しない
- 本番環境では環境変数で管理
- 定期的にCredentialsをローテーション

## 7. 現在の設定状況

✅ Google API Key: 設定済み
✅ Google Client ID: 設定済み
⚠️ Google Client Secret: 要設定
⚠️ リダイレクトURI: 要追加
⚠️ JavaScript生成元: 要追加