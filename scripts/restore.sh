#!/bin/bash

# データ復旧スクリプト
# 使用方法: ./scripts/restore.sh [バックアップディレクトリ]

if [ $# -eq 0 ]; then
    echo "🔍 利用可能なバックアップ:"
    echo ""
    ls -la backups/ | grep "^d" | tail -n +2 | while read line; do
        backup_name=$(echo $line | awk '{print $9}')
        if [ "$backup_name" != "." ] && [ "$backup_name" != ".." ]; then
            backup_path="backups/$backup_name"
            if [ -f "$backup_path/backup_info.txt" ]; then
                echo "📦 $backup_name"
                echo "   $(head -n 4 "$backup_path/backup_info.txt" | tail -n 1)"
                echo "   $(grep "イベント数" "$backup_path/backup_info.txt" || echo "   データ統計なし")"
                echo ""
            fi
        fi
    done
    echo "使用方法: ./scripts/restore.sh [バックアップディレクトリ名]"
    echo "例: ./scripts/restore.sh weekly_20251213_120000"
    exit 1
fi

BACKUP_NAME=$1
BACKUP_PATH="backups/$BACKUP_NAME"

# バックアップの存在確認
if [ ! -d "$BACKUP_PATH" ]; then
    echo "❌ バックアップが見つかりません: $BACKUP_PATH"
    exit 1
fi

# バックアップ情報を表示
if [ -f "$BACKUP_PATH/backup_info.txt" ]; then
    echo "📋 復旧するバックアップの情報:"
    cat "$BACKUP_PATH/backup_info.txt"
    echo ""
fi

# 確認
read -p "このバックアップから復旧しますか？ (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ 復旧をキャンセルしました"
    exit 1
fi

echo "🔄 データ復旧を開始..."

# 現在のデータをバックアップ
CURRENT_BACKUP="backups/before_restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$CURRENT_BACKUP"
if [ -f "data/schedule.db" ]; then
    echo "💾 現在のデータを緊急バックアップ中..."
    sqlite3 data/schedule.db ".backup $CURRENT_BACKUP/schedule.db"
    echo "   緊急バックアップ: $CURRENT_BACKUP"
fi

# データディレクトリを作成
mkdir -p data

# SQLiteデータベースを復旧
if [ -f "$BACKUP_PATH/schedule.db" ]; then
    echo "📦 SQLiteデータベースを復旧中..."
    cp "$BACKUP_PATH/schedule.db" "data/schedule.db"
    
    # WAL/SHMファイルも復旧
    if [ -f "$BACKUP_PATH/schedule.db-wal" ]; then
        cp "$BACKUP_PATH/schedule.db-wal" "data/"
    fi
    if [ -f "$BACKUP_PATH/schedule.db-shm" ]; then
        cp "$BACKUP_PATH/schedule.db-shm" "data/"
    fi
    
    echo "✅ SQLiteデータベース復旧完了"
else
    echo "⚠️  SQLiteデータベースがバックアップに含まれていません"
fi

# JSONファイルも復旧（存在する場合）
if ls "$BACKUP_PATH"/*.json 1> /dev/null 2>&1; then
    echo "📄 JSONファイルを復旧中..."
    cp "$BACKUP_PATH"/*.json "data/" 2>/dev/null || true
    echo "✅ JSONファイル復旧完了"
fi

# 復旧後の統計を表示
if [ -f "data/schedule.db" ]; then
    echo ""
    echo "📊 復旧後のデータ統計:"
    echo "   - イベント数: $(sqlite3 data/schedule.db "SELECT COUNT(*) FROM events;")"
    echo "   - 参加者数: $(sqlite3 data/schedule.db "SELECT COUNT(*) FROM participants;")"
    echo "   - 回答数: $(sqlite3 data/schedule.db "SELECT COUNT(*) FROM availabilities;")"
    echo "   - ユーザー数: $(sqlite3 data/schedule.db "SELECT COUNT(*) FROM users WHERE is_active = 1;")"
fi

echo ""
echo "✅ データ復旧完了!"
echo "🔄 アプリケーションを再起動してください"
echo ""
echo "💡 問題が発生した場合の緊急復旧:"
echo "   cp $CURRENT_BACKUP/schedule.db data/"