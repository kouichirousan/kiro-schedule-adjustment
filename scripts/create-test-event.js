#!/usr/bin/env node

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

// データベースファイルのパス
const DB_PATH = path.join(process.cwd(), 'data', 'schedule.db')

console.log('🎯 テスト用イベントを作成します...')

if (!fs.existsSync(DB_PATH)) {
  console.log('❌ データベースファイルが見つかりません:', DB_PATH)
  console.log('💡 まず開発サーバーを起動してデータベースを初期化してください')
  process.exit(1)
}

try {
  const db = new Database(DB_PATH)
  
  // テスト用のイベントデータ
  const eventId = 'event_test_' + Date.now()
  const now = new Date().toISOString()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1) // 明日から
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7) // 1週間後まで
  
  const eventData = {
    id: eventId,
    title: 'テスト用日程調整',
    description: 'これはテスト用のイベントです。参加者URLの動作確認に使用してください。',
    duration: 60,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '18:00',
    created_at: now,
    created_by: 'test_user',
    status: 'active'
  }
  
  // イベントを作成
  const stmt = db.prepare(`
    INSERT INTO events (
      id, title, description, duration, start_date, end_date, 
      start_time, end_time, created_at, created_by, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  
  stmt.run(
    eventData.id, eventData.title, eventData.description, eventData.duration,
    eventData.start_date, eventData.end_date, eventData.start_time, eventData.end_time,
    eventData.created_at, eventData.created_by, eventData.status
  )
  
  console.log('✅ テスト用イベントを作成しました!')
  console.log('')
  console.log('📋 イベント情報:')
  console.log(`  - ID: ${eventData.id}`)
  console.log(`  - タイトル: ${eventData.title}`)
  console.log(`  - 期間: ${eventData.start_date} 〜 ${eventData.end_date}`)
  console.log(`  - 時間: ${eventData.start_time} 〜 ${eventData.end_time}`)
  console.log('')
  console.log('🔗 参加者用URL:')
  console.log(`  http://localhost:3000/event/${eventData.id}`)
  console.log('')
  console.log('🔗 管理者用URL:')
  console.log(`  http://localhost:3000/event/${eventData.id}/admin`)
  console.log('')
  console.log('🔗 結果確認URL:')
  console.log(`  http://localhost:3000/event/${eventData.id}/result`)
  console.log('')
  console.log('💡 これらのURLをブラウザで開いて動作を確認してください')
  
  db.close()
  
} catch (error) {
  console.error('❌ エラーが発生しました:', error.message)
  process.exit(1)
}