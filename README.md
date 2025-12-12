# Calendar Scheduler

GoogleカレンダーとTappyを連携した日程調整Webアプリです。

## 機能

- 📅 カレンダー表示（月表示・週表示）
- ➕ 予定の追加・編集・削除
- 🔗 Googleカレンダー連携（予定）
- 📊 予定統計表示
- 🎨 レスポンシブデザイン

## 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript
- **スタイリング**: Tailwind CSS
- **カレンダー**: react-calendar
- **日付処理**: date-fns

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. 開発サーバーの起動:
```bash
npm run dev
```

3. ブラウザで http://localhost:3000 を開く

## 今後の実装予定

- [ ] Googleカレンダー API連携
- [ ] Tappy API連携
- [ ] 日程調整機能
- [ ] 空き時間自動検出
- [ ] 通知機能
- [ ] ユーザー認証

## プロジェクト構造

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── components/
    ├── Calendar.tsx
    ├── EventList.tsx
    └── ScheduleForm.tsx
```