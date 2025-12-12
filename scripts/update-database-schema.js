const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

// パス設定
const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'schedule.db')

console.log('🔄 データベーススキーマを更新中...')

// データベース接続
const db = new Database(DB_PATH)

try {
  // 既存のユーザーデータをバックアップ
  console.log('💾 既存データをバックアップ中...')
  let existingUsers = []
  try {
    existingUsers = db.prepare('SELECT * FROM users').all()
    console.log(`📊 既存ユーザー: ${existingUsers.length}件`)
  } catch (error) {
    console.log('ℹ️ 既存のusersテーブルが見つかりません（初回実行）')
  }

  // usersテーブルを削除して再作成
  console.log('🔄 usersテーブルを再作成中...')
  db.exec('DROP TABLE IF EXISTS users')
  
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      session_token TEXT UNIQUE,
      last_active TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      auth_provider TEXT DEFAULT 'manual'
    )
  `)

  // インデックスを再作成
  db.exec(`
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_session_token ON users(session_token);
    CREATE INDEX idx_users_google_id ON users(google_id);
  `)

  // 既存データを復元（新しいカラムにデフォルト値を設定）
  if (existingUsers.length > 0) {
    console.log('🔄 既存データを復元中...')
    const insertStmt = db.prepare(`
      INSERT INTO users (id, name, email, session_token, last_active, created_at, is_active, google_id, avatar_url, auth_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const user of existingUsers) {
      insertStmt.run(
        user.id,
        user.name,
        user.email,
        user.session_token,
        user.last_active,
        user.created_at,
        user.is_active || 1,
        null, // google_id
        null, // avatar_url
        'manual' // auth_provider
      )
    }
    console.log(`✅ ${existingUsers.length}件のユーザーデータを復元しました`)
  }

  // user_sessionsテーブルも確認・作成
  console.log('🔄 user_sessionsテーブルを確認中...')
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
  `)

  console.log('✅ データベーススキーマの更新が完了しました')

  // 現在のテーブル構造を確認
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  console.log('📊 現在のテーブル:', tables.map(t => t.name).join(', '))

  const userColumns = db.prepare("PRAGMA table_info(users)").all()
  console.log('📊 usersテーブルのカラム:', userColumns.map(c => `${c.name}(${c.type})`).join(', '))

} catch (error) {
  console.error('❌ データベース更新エラー:', error)
} finally {
  db.close()
}