#!/bin/bash

# セキュリティ診断スクリプト
# 使用方法: ./scripts/security-check.sh

echo "🔐 セキュリティ診断を開始します..."
echo "=================================="

ISSUES_FOUND=0
WARNINGS_FOUND=0

# 色付きメッセージ用の関数
print_ok() {
    echo "✅ $1"
}

print_warning() {
    echo "⚠️  $1"
    ((WARNINGS_FOUND++))
}

print_error() {
    echo "❌ $1"
    ((ISSUES_FOUND++))
}

print_info() {
    echo "ℹ️  $1"
}

echo ""
echo "📋 1. 環境変数の確認"
echo "-------------------"

# .env.localファイルの存在確認
if [ -f ".env.local" ]; then
    print_ok ".env.localファイルが存在します"
    
    # デフォルト値のチェック
    if grep -q "change-this-in-production" .env.local; then
        print_error "本番環境用でない設定が残っています（SESSION_SECRET, ENCRYPTION_KEY）"
    else
        print_ok "本番環境用の設定に更新済みです"
    fi
    
    if grep -q "GOCSPX-your-client-secret-here" .env.local; then
        print_warning "Google Client Secretが設定されていません"
    else
        print_ok "Google Client Secretが設定されています"
    fi
    
    if grep -q "NODE_ENV=production" .env.local; then
        print_info "本番環境モードです"
    else
        print_info "開発環境モードです"
    fi
    
else
    print_error ".env.localファイルが見つかりません"
fi

echo ""
echo "📁 2. ファイル権限の確認"
echo "---------------------"

# データディレクトリの権限確認
if [ -d "data" ]; then
    DATA_PERM=$(stat -c "%a" data 2>/dev/null || stat -f "%A" data 2>/dev/null)
    if [ "$DATA_PERM" = "700" ] || [ "$DATA_PERM" = "755" ]; then
        print_ok "dataディレクトリの権限が適切です ($DATA_PERM)"
    else
        print_warning "dataディレクトリの権限を確認してください (現在: $DATA_PERM, 推奨: 700)"
    fi
else
    print_warning "dataディレクトリが見つかりません"
fi

# SQLiteファイルの権限確認
if [ -f "data/schedule.db" ]; then
    DB_PERM=$(stat -c "%a" data/schedule.db 2>/dev/null || stat -f "%A" data/schedule.db 2>/dev/null)
    if [ "$DB_PERM" = "600" ] || [ "$DB_PERM" = "644" ]; then
        print_ok "データベースファイルの権限が適切です ($DB_PERM)"
    else
        print_warning "データベースファイルの権限を確認してください (現在: $DB_PERM, 推奨: 600)"
    fi
else
    print_warning "データベースファイルが見つかりません"
fi

# バックアップディレクトリの権限確認
if [ -d "backups" ]; then
    BACKUP_PERM=$(stat -c "%a" backups 2>/dev/null || stat -f "%A" backups 2>/dev/null)
    if [ "$BACKUP_PERM" = "700" ]; then
        print_ok "backupsディレクトリの権限が適切です ($BACKUP_PERM)"
    else
        print_warning "backupsディレクトリの権限を確認してください (現在: $BACKUP_PERM, 推奨: 700)"
    fi
else
    print_info "backupsディレクトリが見つかりません（必要に応じて作成してください）"
fi

echo ""
echo "🔒 3. 機密ファイルの保護確認"
echo "-------------------------"

# .gitignoreの確認
if [ -f ".gitignore" ]; then
    if grep -q ".env.local" .gitignore && grep -q "data/" .gitignore; then
        print_ok ".gitignoreで機密ファイルが保護されています"
    else
        print_warning ".gitignoreに機密ファイルの除外設定を追加してください"
    fi
else
    print_warning ".gitignoreファイルが見つかりません"
fi

echo ""
echo "🌐 4. ネットワークセキュリティ"
echo "----------------------------"

# ポート確認
if command -v lsof >/dev/null 2>&1; then
    LISTENING_PORTS=$(lsof -i -P -n | grep LISTEN | grep :3000 || true)
    if [ -n "$LISTENING_PORTS" ]; then
        print_info "アプリケーションがポート3000で動作中です"
        echo "   $LISTENING_PORTS"
    else
        print_info "アプリケーションは現在停止中です"
    fi
else
    print_info "lsofコマンドが利用できません（ポート確認をスキップ）"
fi

echo ""
echo "📦 5. 依存関係のセキュリティ"
echo "-------------------------"

# package.jsonの確認
if [ -f "package.json" ]; then
    print_ok "package.jsonが存在します"
    
    # npm auditの実行（利用可能な場合）
    if command -v npm >/dev/null 2>&1; then
        print_info "npm auditを実行中..."
        AUDIT_RESULT=$(npm audit --audit-level=high 2>/dev/null || echo "audit failed")
        if echo "$AUDIT_RESULT" | grep -q "found 0 vulnerabilities"; then
            print_ok "高リスクの脆弱性は見つかりませんでした"
        elif echo "$AUDIT_RESULT" | grep -q "vulnerabilities"; then
            print_warning "脆弱性が検出されました。npm audit fixを実行してください"
        else
            print_info "npm auditの実行に失敗しました"
        fi
    else
        print_info "npmが利用できません（脆弱性チェックをスキップ）"
    fi
else
    print_error "package.jsonが見つかりません"
fi

echo ""
echo "🔍 6. セキュリティ設定の確認"
echo "-------------------------"

# セキュリティ関連ファイルの存在確認
if [ -f "src/lib/security.ts" ]; then
    print_ok "セキュリティライブラリが実装されています"
else
    print_error "セキュリティライブラリが見つかりません"
fi

if [ -f "SECURITY_GUIDE.md" ]; then
    print_ok "セキュリティガイドが用意されています"
else
    print_warning "セキュリティガイドが見つかりません"
fi

echo ""
echo "📊 7. 診断結果サマリー"
echo "===================="

if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    print_ok "セキュリティ診断完了：問題は見つかりませんでした"
    echo ""
    echo "🎉 システムは本番環境での運用準備が整っています！"
elif [ $ISSUES_FOUND -eq 0 ]; then
    print_warning "セキュリティ診断完了：$WARNINGS_FOUND 件の警告があります"
    echo ""
    echo "⚠️  警告を確認して改善することを推奨しますが、運用は可能です"
else
    print_error "セキュリティ診断完了：$ISSUES_FOUND 件の重要な問題と $WARNINGS_FOUND 件の警告があります"
    echo ""
    echo "🚨 重要な問題を解決してから本番環境での運用を開始してください"
fi

echo ""
echo "📋 推奨アクション:"
echo "1. 重要な問題（❌）を最優先で解決"
echo "2. 警告（⚠️）を計画的に改善"
echo "3. SECURITY_GUIDE.mdを参照して追加対策を検討"
echo "4. 定期的にこの診断を実行（週1回推奨）"

echo ""
echo "🔧 クイック修正コマンド:"
echo "chmod 700 data backups"
echo "chmod 600 data/schedule.db"
echo "npm audit fix"

exit $ISSUES_FOUND