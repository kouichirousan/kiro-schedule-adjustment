# Google Calendar API セットアップガイド

このアプリでGoogleカレンダー連携を使用するには、Google Cloud Consoleでの設定が必要です。

## 1. Google Cloud Consoleでプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. プロジェクト名を設定（例: "Schedule Coordination App"）

## 2. Google Calendar APIを有効化

1. Google Cloud Consoleで「APIs & Services」→「Library」に移動
2. "Google Calendar API" を検索
3. 「Google Calendar API」をクリックして「有効にする」

## 3. 認証情報を作成

### APIキーの作成
1. 「APIs & Services」→「Credentials」に移動
2. 「+ CREATE CREDENTIALS」→「API key」をクリック
3. 作成されたAPIキーをコピー

### OAuth 2.0 クライアントIDの作成
1. 「+ CREATE CREDENTIALS」→「OAuth client ID」をクリック
2. アプリケーションの種類で「Web application」を選択
3. 名前を入力（例: "Schedule App Web Client"）
4. 「Authorized JavaScript origins」に以下を追加:
   - `http://localhost:3000` (開発環境)
   - `https://your-domain.com` (本番環境)
   
   ⚠️ **重要**: 「Authorized redirect URIs」は設定しないでください。
   このアプリはJavaScript APIを使用するため、redirect URIは不要です。
6. 「作成」をクリック
7. 作成されたクライアントIDをコピー

## 4. 環境変数を設定

1. プロジェクトルートに `.env.local` ファイルを作成
2. 以下の内容を記入:

```bash
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 5. OAuth同意画面の設定

1. 「APIs & Services」→「OAuth consent screen」に移動
2. 「External」を選択（個人用の場合）
3. 必要な情報を入力:
   - App name: アプリ名
   - User support email: サポートメール
   - Developer contact information: 開発者メール
4. スコープの設定で以下を追加:
   - `https://www.googleapis.com/auth/calendar.readonly`
5. テストユーザーを追加（開発中は必要）

## 6. 動作確認

1. 開発サーバーを起動: `npm run dev`
2. ブラウザで `http://localhost:3000` にアクセス
3. 「参加者画面テスト」→「予定を登録する」
4. Googleカレンダー連携ボタンをクリック
5. Googleアカウントでサインインして権限を許可

## トラブルシューティング

### よくあるエラー

1. **"API key not valid"**
   - APIキーが正しく設定されているか確認
   - Google Calendar APIが有効になっているか確認

2. **"redirect_uri_mismatch"**
   - OAuth設定の「Authorized redirect URIs」を確認
   - 現在のURLが登録されているか確認

3. **"access_blocked"**
   - OAuth同意画面の設定を確認
   - テストユーザーに追加されているか確認

### セキュリティ注意事項

- APIキーとクライアントIDは公開リポジトリにコミットしない
- 本番環境では適切なドメイン制限を設定
- 必要最小限の権限のみを要求する

## 参考リンク

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)