# 🔐 セキュリティガイド

45人プログラミング学習コミュニティ向け日程調整システムのセキュリティ対策ガイドです。

## 🚨 現在のセキュリティレベル

### ✅ 実装済みのセキュリティ機能

1. **入力値検証・サニタイゼーション**
   - SQLインジェクション対策
   - XSS（クロスサイトスクリプティング）対策
   - パストラバーサル攻撃対策

2. **認証・セッション管理**
   - Google OAuth 2.0認証
   - セキュアなセッション管理
   - セッション有効期限管理

3. **レート制限**
   - IP別リクエスト制限
   - 同時接続数制限
   - 自動攻撃検出・ブロック

4. **セキュリティヘッダー**
   - XSS保護ヘッダー
   - コンテンツタイプスニッフィング防止
   - フレーム埋め込み防止
   - HTTPS強制（本番環境）

5. **データ保護**
   - データベース暗号化
   - 機密情報のハッシュ化
   - セキュアなトークン生成

6. **監査・ログ**
   - セキュリティイベントログ
   - 攻撃試行の検出・記録
   - アクセス履歴の追跡

## ⚠️ セキュリティリスクと対策

### 高リスク（即座に対応が必要）

#### 1. 本番環境での機密情報露出
**リスク**: デフォルトのパスワードやキーが使用されている
```bash
# 対策: 環境変数を本番用に変更
SESSION_SECRET=your-very-long-random-string-here
ENCRYPTION_KEY=your-secure-encryption-key-here
COMMUNITY_PASSWORD=your-secure-community-password
```

#### 2. HTTPS未対応
**リスク**: 通信内容が平文で送信される
```bash
# 対策: SSL証明書の設定
ENABLE_HTTPS=true
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### 中リスク（計画的に対応）

#### 3. データベースファイルの直接アクセス
**リスク**: SQLiteファイルが外部からアクセス可能
```bash
# 対策: ファイル権限の設定
chmod 600 data/schedule.db
chown www-data:www-data data/schedule.db
```

#### 4. バックアップファイルの保護
**リスク**: バックアップファイルが外部からアクセス可能
```bash
# 対策: バックアップディレクトリの保護
chmod 700 backups/
# Webサーバー設定でbackups/へのアクセスを拒否
```

### 低リスク（余裕があるときに対応）

#### 5. ログファイルの肥大化
**リスク**: ディスク容量の圧迫
```bash
# 対策: ログローテーションの設定
# logrotateの設定など
```

## 🛡️ セキュリティ設定の確認

### 管理者用セキュリティ状況確認
```bash
# ブラウザで以下にアクセス（管理者パスワード必要）
http://localhost:3000/api/security/status?password=posse2024
```

### セキュリティ監査ログの確認
```bash
# 最新50件のセキュリティイベントを確認
http://localhost:3000/api/security/audit?password=posse2024&limit=50
```

## 🔧 本番環境への移行手順

### 1. 環境変数の設定
```bash
# .env.local を本番用に更新
cp .env.local .env.production

# 以下の値を必ず変更
SESSION_SECRET=（64文字以上のランダム文字列）
ENCRYPTION_KEY=（32文字以上のランダム文字列）
COMMUNITY_PASSWORD=（強力なパスワード）
NODE_ENV=production
ENABLE_HTTPS=true
```

### 2. SSL証明書の設定
```bash
# Let's Encryptを使用する場合
sudo apt install certbot
sudo certbot --nginx -d yourdomain.com
```

### 3. ファイル権限の設定
```bash
# データベースファイルの保護
chmod 600 data/schedule.db
chmod 700 data/
chmod 700 backups/

# アプリケーションファイルの権限
chown -R www-data:www-data /path/to/app
chmod -R 755 /path/to/app
chmod -R 644 /path/to/app/src
```

### 4. Webサーバー設定（Nginx例）
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    # SSL設定
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # セキュリティヘッダー
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # 機密ファイルへのアクセス拒否
    location ~ /\.(env|git) {
        deny all;
    }
    
    location /data/ {
        deny all;
    }
    
    location /backups/ {
        deny all;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 セキュリティ監視

### 定期チェック項目（週1回）

1. **セキュリティログの確認**
   - 攻撃試行の有無
   - 異常なアクセスパターン
   - レート制限の発動状況

2. **システム更新の確認**
   - Node.jsの更新
   - 依存パッケージの脆弱性チェック
   - OSのセキュリティアップデート

3. **バックアップの確認**
   - バックアップファイルの整合性
   - 復旧テストの実施

### 緊急時の対応手順

#### セキュリティインシデント発生時
1. **即座に実行**
   ```bash
   # アプリケーションを停止
   pm2 stop all
   
   # 現在のデータをバックアップ
   ./scripts/backup.sh emergency
   
   # ログを保存
   cp logs/* /secure/location/
   ```

2. **状況の調査**
   - セキュリティログの分析
   - 影響範囲の特定
   - 攻撃手法の特定

3. **対策の実施**
   - 脆弱性の修正
   - セキュリティ設定の強化
   - 必要に応じてデータの復旧

4. **再開前の確認**
   - セキュリティテストの実施
   - 設定の再確認
   - 監視体制の強化

## 🔍 セキュリティテスト

### 基本的なセキュリティテスト
```bash
# SQLインジェクションテスト
curl "http://localhost:3000/api/events?title='; DROP TABLE events; --"

# XSSテスト
curl "http://localhost:3000/?search=<script>alert('xss')</script>"

# レート制限テスト
for i in {1..150}; do curl http://localhost:3000/; done
```

### 推奨セキュリティツール
- **OWASP ZAP**: Webアプリケーション脆弱性スキャナー
- **nmap**: ネットワークスキャナー
- **sqlmap**: SQLインジェクション検出ツール

## 📞 セキュリティサポート

### 問題発生時の連絡先
1. システム管理者への連絡
2. セキュリティログの保存
3. 影響範囲の最小化

### 参考資料
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

## ⚡ クイックセキュリティチェック

本番環境移行前に以下を確認してください：

- [ ] SESSION_SECRETを変更済み
- [ ] ENCRYPTION_KEYを変更済み
- [ ] COMMUNITY_PASSWORDを変更済み
- [ ] HTTPS通信を有効化済み
- [ ] データベースファイルの権限設定済み
- [ ] バックアップディレクトリの保護済み
- [ ] セキュリティヘッダーの設定済み
- [ ] セキュリティログの監視体制構築済み

**重要**: 上記すべてにチェックが入るまで本番環境での運用は推奨しません。