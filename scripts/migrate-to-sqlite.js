const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

// パス設定
const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'schedule.db')
const EVENTS_JSON = path.join(DATA_DIR, 'events.json')
const PARTICIPANTS_JSON = path.join(DATA_DIR, 'participants.json')
const AVAILABILITIES_JSON = path.join(DATA_DIR, 'availabilities.json')

console.log('🚀 JSONからSQLiteへのデータ移行を開始します...')

// 既存のSQLiteファイルを削除（クリーンスタート）
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH)
  console.log('📁 既存のSQLiteファイルを削除しました')
}

// データベース接続
const db = new Database(DB_PATH)

// WALモード設定
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

console.log('📊 SQLiteデータベースを作成中...')

// テーブル作成
db.exec(`
  CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  )
`)

db.exec(`
  CREATE TABLE participants (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    UNIQUE(event_id, email)
  )
`)

db.exec(`
  CREATE TABLE availabilities (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    time_slot_id TEXT NOT NULL,
    available BOOLEAN NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants (id) ON DELETE CASCADE,
    UNIQUE(participant_id, time_slot_id)
  )
`)

// インデックス作成
db.exec(`
  CREATE INDEX idx_participants_event_id ON participants(event_id);
  CREATE INDEX idx_participants_email ON participants(email);
  CREATE INDEX idx_availabilities_event_id ON availabilities(event_id);
  CREATE INDEX idx_availabilities_participant_id ON availabilities(participant_id);
`)

console.log('✅ テーブルとインデックスを作成しました')

// JSONデータ読み込み関数
function readJsonFile(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(data)
    }
    return defaultValue
  } catch (error) {
    console.error(`❌ ${filePath} の読み込みエラー:`, error.message)
    return defaultValue
  }
}

// データ移行開始
console.log('📦 JSONデータを読み込み中...')

const events = readJsonFile(EVENTS_JSON)
const participants = readJsonFile(PARTICIPANTS_JSON)
const availabilities = readJsonFile(AVAILABILITIES_JSON)

console.log(`📊 データ統計:`)
console.log(`   - イベント: ${events.length}件`)
console.log(`   - 参加者: ${participants.length}件`)
console.log(`   - 空き状況: ${availabilities.length}件`)

// イベントデータ移行
console.log('🔄 イベントデータを移行中...')
const insertEvent = db.prepare(`
  INSERT INTO events (
    id, title, description, duration, start_date, end_date,
    start_time, end_time, created_at, created_by, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const eventTransaction = db.transaction((events) => {
  let migrated = 0
  for (const event of events) {
    try {
      insertEvent.run(
        event.id,
        event.title,
        event.description || '',
        event.duration,
        event.dateRange.startDate,
        event.dateRange.endDate,
        event.dateRange.startTime,
        event.dateRange.endTime,
        event.createdAt,
        event.createdBy,
        event.status || 'active'
      )
      migrated++
    } catch (error) {
      console.error(`❌ イベント移行エラー (${event.id}):`, error.message)
    }
  }
  return migrated
})

const migratedEvents = eventTransaction(events)
console.log(`✅ イベント ${migratedEvents}/${events.length}件を移行しました`)

// 参加者データ移行
console.log('🔄 参加者データを移行中...')
const insertParticipant = db.prepare(`
  INSERT INTO participants (id, event_id, name, email, submitted_at)
  VALUES (?, ?, ?, ?, ?)
`)

const participantTransaction = db.transaction((participants) => {
  let migrated = 0
  for (const participant of participants) {
    try {
      insertParticipant.run(
        participant.id,
        participant.eventId,
        participant.name,
        participant.email,
        participant.submittedAt
      )
      migrated++
    } catch (error) {
      console.error(`❌ 参加者移行エラー (${participant.id}):`, error.message)
    }
  }
  return migrated
})

const migratedParticipants = participantTransaction(participants)
console.log(`✅ 参加者 ${migratedParticipants}/${participants.length}件を移行しました`)

// 空き状況データ移行
console.log('🔄 空き状況データを移行中...')
const insertAvailability = db.prepare(`
  INSERT INTO availabilities (id, event_id, participant_id, time_slot_id, available, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const availabilityTransaction = db.transaction((availabilities) => {
  let migrated = 0
  for (const availability of availabilities) {
    try {
      insertAvailability.run(
        availability.id,
        availability.eventId,
        availability.participantId,
        availability.timeSlotId,
        availability.available ? 1 : 0, // SQLiteではBOOLEANは0/1
        availability.createdAt
      )
      migrated++
    } catch (error) {
      console.error(`❌ 空き状況移行エラー (${availability.id}):`, error.message)
    }
  }
  return migrated
})

const migratedAvailabilities = availabilityTransaction(availabilities)
console.log(`✅ 空き状況 ${migratedAvailabilities}/${availabilities.length}件を移行しました`)

// 移行結果確認
console.log('🔍 移行結果を確認中...')
const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count
const participantCount = db.prepare('SELECT COUNT(*) as count FROM participants').get().count
const availabilityCount = db.prepare('SELECT COUNT(*) as count FROM availabilities').get().count

console.log(`📊 SQLiteデータベース統計:`)
console.log(`   - イベント: ${eventCount}件`)
console.log(`   - 参加者: ${participantCount}件`)
console.log(`   - 空き状況: ${availabilityCount}件`)

// JSONファイルをバックアップ
const backupDir = path.join(DATA_DIR, 'json-backup-' + new Date().toISOString().split('T')[0])
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir)
}

if (fs.existsSync(EVENTS_JSON)) {
  fs.copyFileSync(EVENTS_JSON, path.join(backupDir, 'events.json'))
}
if (fs.existsSync(PARTICIPANTS_JSON)) {
  fs.copyFileSync(PARTICIPANTS_JSON, path.join(backupDir, 'participants.json'))
}
if (fs.existsSync(AVAILABILITIES_JSON)) {
  fs.copyFileSync(AVAILABILITIES_JSON, path.join(backupDir, 'availabilities.json'))
}

console.log(`💾 JSONファイルを ${backupDir} にバックアップしました`)

db.close()

console.log('🎉 データ移行が完了しました！')
console.log(`📁 SQLiteファイル: ${DB_PATH}`)
console.log(`📁 JSONバックアップ: ${backupDir}`)
console.log('')
console.log('次のステップ:')
console.log('1. アプリケーションコードをSQLite用に更新')
console.log('2. 動作確認')
console.log('3. 問題なければJSONファイルを削除')