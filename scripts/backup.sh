#!/bin/bash

# 45人プログラミング学習コミュニティ用データバックアップスクリプト
# 使用方法: ./scripts/backup.sh [weekly|manual]

BACKUP_TYPE=${1:-manual}
BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/${BACKUP_TYPE}_$DATE"

echo "🔄 バックアップ開始 (タイプ: $BACKUP_TYPE)"

# バックアップディレクトリ作成
mkdir -p "$BACKUP_PATH"

# SQLiteデータベースをバックアップ（安全にコピー）
if [ -f "data/schedule.db" ]; then
    echo "📦 SQLiteデータベースをバックアップ中..."
    sqlite3 data/schedule.db ".backup $BACKUP_PATH/schedule.db"
    
    # WALファイルも存在する場合はコピー
    if [ -f "data/schedule.db-wal" ]; then
        cp "data/schedule.db-wal" "$BACKUP_PATH/"
    fi
    if [ -f "data/schedule.db-shm" ]; then
        cp "data/schedule.db-shm" "$BACKUP_PATH/"
    fi
else
    echo "⚠️  SQLiteデータベースが見つかりません"
fi

# JSONファイルもバックアップ（互換性のため）
if [ -d "data" ]; then
    echo "📄 JSONファイルをバックアップ中..."
    cp data/*.json "$BACKUP_PATH/" 2>/dev/null || true
fi

# バックアップ情報ファイルを作成
cat > "$BACKUP_PATH/backup_info.txt" << EOF
バックアップ情報
================
作成日時: $(date)
バックアップタイプ: $BACKUP_TYPE
サーバー: $(hostname)
ディスク使用量: $(du -sh data/ 2>/dev/null || echo "不明")

データ統計:
EOF

# SQLiteからデータ統計を取得
if [ -f "$BACKUP_PATH/schedule.db" ]; then
    echo "   - イベント数: $(sqlite3 "$BACKUP_PATH/schedule.db" "SELECT COUNT(*) FROM events;")" >> "$BACKUP_PATH/backup_info.txt"
    echo "   - 参加者数: $(sqlite3 "$BACKUP_PATH/schedule.db" "SELECT COUNT(*) FROM participants;")" >> "$BACKUP_PATH/backup_info.txt"
    echo "   - 回答数: $(sqlite3 "$BACKUP_PATH/schedule.db" "SELECT COUNT(*) FROM availabilities;")" >> "$BACKUP_PATH/backup_info.txt"
    echo "   - ユーザー数: $(sqlite3 "$BACKUP_PATH/schedule.db" "SELECT COUNT(*) FROM users WHERE is_active = 1;")" >> "$BACKUP_PATH/backup_info.txt"
fi

# 古いバックアップを削除
if [ "$BACKUP_TYPE" = "weekly" ]; then
    # 週次バックアップは8週間保持
    find "$BACKUP_DIR" -name "weekly_*" -type d -mtime +56 -exec rm -rf {} + 2>/dev/null
    echo "🧹 8週間以上前の週次バックアップを削除"
else
    # 手動バックアップは30日保持
    find "$BACKUP_DIR" -name "manual_*" -type d -mtime +30 -exec rm -rf {} + 2>/dev/null
    echo "🧹 30日以上前の手動バックアップを削除"
fi

# 結果表示
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo ""
echo "✅ バックアップ完了!"
echo "📁 保存先: $BACKUP_PATH"
echo "💾 サイズ: $BACKUP_SIZE"
echo ""
echo "📊 バックアップ内容:"
cat "$BACKUP_PATH/backup_info.txt" | tail -n +6

# 復旧方法の案内
echo ""
echo "🔧 復旧方法:"
echo "   1. アプリを停止"
echo "   2. cp $BACKUP_PATH/schedule.db data/"
echo "   3. アプリを再起動"