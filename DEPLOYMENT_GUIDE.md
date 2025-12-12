# 🚀 本格運用デプロイガイド

## 現在の状況
- **サーバー**: あなたのMac (192.168.40.190:3000)
- **データ**: JSONファイル (data/)
- **適用範囲**: 同一WiFiネットワーク内のみ

## 推奨デプロイ方法

### 1. Vercel + PlanetScale（推奨）

#### Step 1: データベース準備
```bash
# Prismaセットアップ
npm install prisma @prisma/client
npx prisma init
```

#### Step 2: スキーマ定義
```prisma
// prisma/schema.prisma
model Event {
  id          String   @id @default(cuid())
  title       String
  description String?
  duration    Int
  dateRange   Json
  createdAt   DateTime @default(now())
  createdBy   String
  status      String
  
  participants   Participant[]
  availabilities Availability[]
}

model Participant {
  id          String   @id @default(cuid())
  eventId     String
  name        String
  email       String
  submittedAt DateTime @default(now())
  
  event          Event @relation(fields: [eventId], references: [id])
  availabilities Availability[]
}

model Availability {
  id            String  @id @default(cuid())
  eventId       String
  participantId String
  timeSlotId    String
  available     Boolean
  createdAt     DateTime @default(now())
  
  event       Event       @relation(fields: [eventId], references: [id])
  participant Participant @relation(fields: [participantId], references: [id])
}
```

#### Step 3: Vercelデプロイ
```bash
# Vercelにデプロイ
npm install -g vercel
vercel

# 環境変数設定
vercel env add DATABASE_URL
vercel env add COMMUNITY_PASSWORD
vercel env add NEXT_PUBLIC_GOOGLE_API_KEY
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

### 2. Railway（フルスタック）

```bash
# Railwayデプロイ
npm install -g @railway/cli
railway login
railway init
railway add postgresql
railway up
```

### 3. 簡単移行（Supabase）

```bash
# Supabaseセットアップ
npm install @supabase/supabase-js
```

## 移行時の注意点

### データ移行
```javascript
// 既存JSONデータをデータベースに移行
const migrateData = async () => {
  const events = JSON.parse(fs.readFileSync('data/events.json'))
  const participants = JSON.parse(fs.readFileSync('data/participants.json'))
  const availabilities = JSON.parse(fs.readFileSync('data/availabilities.json'))
  
  // データベースに挿入
  for (const event of events) {
    await prisma.event.create({ data: event })
  }
}
```

### 環境変数
```bash
# 本番環境用
DATABASE_URL="postgresql://..."
COMMUNITY_PASSWORD="your-secure-password"
NEXT_PUBLIC_BASE_URL="https://your-app.vercel.app"
```

## コスト比較

| サービス | 無料枠 | 有料プラン | データベース |
|---------|--------|-----------|-------------|
| Vercel | 無制限 | $20/月〜 | 別途必要 |
| Railway | $5/月まで | $5/月〜 | 込み |
| Render | 750時間/月 | $7/月〜 | 込み |
| Supabase | 2GB | $25/月〜 | 込み |

## 推奨構成（無料）

1. **Vercel** (フロントエンド)
2. **PlanetScale** (データベース - 無料枠)
3. **Cloudflare** (DNS - 無料)

## 今すぐできる改善

### 1. データバックアップ
```bash
# 定期バックアップスクリプト
cp -r data/ backup/$(date +%Y%m%d_%H%M%S)/
```

### 2. 環境変数化
```bash
# .env.local
NODE_ENV=production
MAX_CONCURRENT_USERS=50
```

### 3. パフォーマンス監視
```javascript
// 同時接続数制限
let activeConnections = 0
const MAX_CONNECTIONS = 50

app.use((req, res, next) => {
  if (activeConnections >= MAX_CONNECTIONS) {
    return res.status(503).json({ error: 'サーバーが混雑しています' })
  }
  activeConnections++
  res.on('finish', () => activeConnections--)
  next()
})
```