import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// データベースファイルのパス
const DB_PATH = path.join(process.cwd(), 'data', 'schedule.db')
const DB_DIR = path.dirname(DB_PATH)

// データベースディレクトリを作成
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

// データベース接続
const db = new Database(DB_PATH)

// WALモードを有効にして同時アクセス性能を向上
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = 1000')
db.pragma('temp_store = memory')

// テーブル作成
const createTables = () => {
  // イベントテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
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
      status TEXT NOT NULL DEFAULT 'active',
      CHECK (status IN ('active', 'completed', 'cancelled'))
    )
  `)

  // 参加者テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      UNIQUE(event_id, email)
    )
  `)

  // 空き状況テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS availabilities (
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

  // ユーザーテーブル（セッション管理用）
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      session_token TEXT UNIQUE,
      last_active TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      auth_provider TEXT DEFAULT 'manual'
    )
  `)

  // セッションテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `)

  // インデックス作成（パフォーマンス向上）
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
    CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
    CREATE INDEX IF NOT EXISTS idx_availabilities_event_id ON availabilities(event_id);
    CREATE INDEX IF NOT EXISTS idx_availabilities_participant_id ON availabilities(participant_id);
    CREATE INDEX IF NOT EXISTS idx_availabilities_time_slot ON availabilities(time_slot_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
  `)

  console.log('✅ SQLiteデータベーステーブルを作成しました')
}

// 初期化
createTables()

// 型定義
export interface Event {
  id: string
  title: string
  description: string
  duration: number
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  created_at: string
  created_by: string
  status: 'active' | 'completed' | 'cancelled'
}

export interface Participant {
  id: string
  event_id: string
  name: string
  email: string
  submitted_at: string
}

export interface Availability {
  id: string
  event_id: string
  participant_id: string
  time_slot_id: string
  available: boolean
  created_at: string
}

export interface User {
  id: string
  name: string
  email?: string
  session_token?: string
  last_active: string
  created_at: string
  is_active: boolean
  google_id?: string
  avatar_url?: string
  auth_provider: 'manual' | 'google'
}

export interface UserSession {
  id: string
  user_id: string
  session_token: string
  expires_at: string
  created_at: string
  last_used: string
  ip_address?: string
  user_agent?: string
}

// ユーティリティ関数
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

// データベースエクスポート
export { db }
export default db