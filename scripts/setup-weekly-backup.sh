#!/bin/bash

# 週次自動バックアップ設定スクリプト
# 毎週日曜日の午前2時にバックアップを実行

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔧 週次自動バックアップの設定"
echo "プロジェクトディレクトリ: $PROJECT_DIR"
echo ""

# 現在のcrontabを確認
echo "📋 現在のcrontab設定:"
crontab -l 2>/dev/null || echo "   (crontabが設定されていません)"
echo ""

# 新しいcronジョブ
CRON_JOB="0 2 * * 0 cd $PROJECT_DIR && ./scripts/backup.sh weekly >> logs/backup.log 2>&1"

echo "📅 追加する週次バックアップ設定:"
echo "   毎週日曜日 午前2時に実行"
echo "   $CRON_JOB"
echo ""

# ログディレクトリを作成
mkdir -p "$PROJECT_DIR/logs"

# 確認
read -p "この設定を追加しますか？ (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ 設定をキャンセルしました"
    exit 1
fi

# 既存のcrontabを取得し、新しいジョブを追加
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ 週次自動バックアップを設定しました"
echo ""
echo "📋 設定後のcrontab:"
crontab -l
echo ""
echo "📝 ログファイル: $PROJECT_DIR/logs/backup.log"
echo "🔍 バックアップ確認: ls -la $PROJECT_DIR/backups/"
echo ""
echo "💡 手動バックアップ実行方法:"
echo "   cd $PROJECT_DIR"
echo "   ./scripts/backup.sh manual"
echo ""
echo "🗑️  自動バックアップを削除する場合:"
echo "   crontab -e で該当行を削除"