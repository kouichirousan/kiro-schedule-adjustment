#!/usr/bin/env node

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

// データベースファイルのパス
const DB_PATH = path.join(process.cwd(), 'data', 'schedule.db')

console.log('🧹 データベースクリーンアップを開始します...')

if (!fs.existsSync(DB_PATH)) {
  console.log('❌ データベースファイルが見つかりません:', DB_PATH)
  process.exit(1)
}

try {
  const db = new Database(DB_PATH)
  
  // 現在のデータ数を確認
  const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count
  const participantCount = db.prepare('SELECT COUNT(*) as count FROM participants').get().count
  const availabilityCount = db.prepare('SELECT COUNT(*) as count FROM availabilities').get().count
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM user_sessions').get().count
  
  console.log('📊 現在のデータ数:')
  console.log(`  - イベント: ${eventCount}件`)
  console.log(`  - 参加者: ${participantCount}件`)
  console.log(`  - 空き状況: ${availabilityCount}件`)
  console.log(`  - ユーザー: ${userCount}件`)
  console.log(`  - セッション: ${sessionCount}件`)
  
  if (eventCount === 0 && participantCount === 0 && userCount === 0) {
    console.log('✅ データベースは既にクリーンです')
    db.close()
    process.exit(0)
  }
  
  // 確認メッセージ
  console.log('\n⚠️  全てのデータを削除します。続行しますか？')
  console.log('   この操作は取り消せません。')
  
  // 実際の削除処理
  console.log('\n🗑️  データを削除中...')
  
  // トランザクションで一括削除
  const deleteAll = db.transaction(() => {
    // 外部キー制約の順序に従って削除
    db.prepare('DELETE FROM availabilities').run()
    db.prepare('DELETE FROM participants').run()
    db.prepare('DELETE FROM events').run()
    db.prepare('DELETE FROM user_sessions').run()
    db.prepare('DELETE FROM users').run()
    
    // オートインクリメントのリセット（テーブルが存在する場合のみ）
    try {
      db.prepare('DELETE FROM sqlite_sequence').run()
    } catch (e) {
      // sqlite_sequenceテーブルが存在しない場合は無視
    }
  })
  
  deleteAll()
  
  // 削除後の確認
  const finalEventCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count
  const finalParticipantCount = db.prepare('SELECT COUNT(*) as count FROM participants').get().count
  const finalUserCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count
  
  console.log('\n✅ データベースクリーンアップ完了!')
  console.log('📊 削除後のデータ数:')
  console.log(`  - イベント: ${finalEventCount}件`)
  console.log(`  - 参加者: ${finalParticipantCount}件`)
  console.log(`  - ユーザー: ${finalUserCount}件`)
  
  // VACUUMでデータベースファイルサイズを最適化
  console.log('\n🔧 データベースを最適化中...')
  db.exec('VACUUM')
  
  db.close()
  
  console.log('✅ 全ての処理が完了しました!')
  console.log('💡 サーバーを再起動してキャッシュもクリアしてください')
  
} catch (error) {
  console.error('❌ エラーが発生しました:', error.message)
  process.exit(1)
}