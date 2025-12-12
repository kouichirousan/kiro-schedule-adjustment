import { db, generateId } from './sqlite-db'
import type { User, UserSession } from './sqlite-db'
import { ErrorHandler, ErrorCode } from './error-handler'
import crypto from 'crypto'

// セッション有効期限（7日間）
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000

// ユーザー操作
export const UsersDB = {
  // 全ユーザー取得
  getAll: (): User[] => {
    const stmt = db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC')
    return stmt.all() as User[]
  },

  // ID指定でユーザー取得
  getById: (id: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
    return (stmt.get(id) as User) || null
  },

  // メールアドレスでユーザー検索
  getByEmail: (email: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
    return (stmt.get(email) as User) || null
  },

  // 名前でユーザー検索（重複チェック用）
  getByName: (name: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE name = ? AND is_active = 1')
    return (stmt.get(name) as User) || null
  },

  // セッショントークンでユーザー検索
  getBySessionToken: (token: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE session_token = ? AND is_active = 1')
    return (stmt.get(token) as User) || null
  },

  // ユーザー作成
  create: (userData: { 
    name: string; 
    email?: string; 
    googleId?: string; 
    avatarUrl?: string; 
    authProvider?: 'manual' | 'google' 
  }): User => {
    try {
      // バリデーション
      if (!userData.name || userData.name.trim().length === 0) {
        throw ErrorHandler.handleValidationError('name', userData.name, 'required')
      }
      if (userData.name.trim().length > 50) {
        throw ErrorHandler.handleValidationError('name', userData.name, 'maxLength')
      }
      if (userData.email && !isValidEmail(userData.email)) {
        throw ErrorHandler.handleValidationError('email', userData.email, 'email')
      }

      const id = generateId('user')
      const sessionToken = generateSessionToken()
      const now = new Date().toISOString()
      
      const user: User = {
        id,
        name: userData.name.trim(),
        email: userData.email?.trim(),
        session_token: sessionToken,
        last_active: now,
        created_at: now,
        is_active: true,
        google_id: userData.googleId,
        avatar_url: userData.avatarUrl,
        auth_provider: userData.authProvider || 'manual'
      }
      
      const stmt = db.prepare(`
        INSERT INTO users (id, name, email, session_token, last_active, created_at, is_active, google_id, avatar_url, auth_provider)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        user.id, user.name, user.email, user.session_token, user.last_active, 
        user.created_at, user.is_active ? 1 : 0, user.google_id, user.avatar_url, user.auth_provider
      )
      
      console.log(`✅ ユーザー作成成功: ${user.name} (${user.id})`)
      return user
    } catch (error: any) {
      if (error.code && error.userMessage) {
        // 既にAppErrorの場合はそのまま投げる
        throw error
      }
      // データベースエラーの場合
      const appError = ErrorHandler.handleDatabaseError(error, 'create user')
      throw appError
    }
  },

  // ユーザー更新
  update: (id: string, updates: Partial<User>): User | null => {
    const existing = UsersDB.getById(id)
    if (!existing) return null

    const fields = Object.keys(updates).filter(key => key !== 'id')
    if (fields.length === 0) return existing

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => (updates as any)[field])
    
    const stmt = db.prepare(`UPDATE users SET ${setClause}, last_active = ? WHERE id = ?`)
    stmt.run(...values, new Date().toISOString(), id)
    
    return UsersDB.getById(id)
  },

  // 最終アクティブ時刻を更新
  updateLastActive: (id: string): void => {
    const stmt = db.prepare('UPDATE users SET last_active = ? WHERE id = ?')
    stmt.run(new Date().toISOString(), id)
  },

  // ユーザー無効化（論理削除）
  deactivate: (id: string): boolean => {
    const stmt = db.prepare('UPDATE users SET is_active = 0 WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// セッション操作
export const SessionsDB = {
  // セッション作成
  create: (userId: string, ipAddress?: string, userAgent?: string): UserSession => {
    try {
      // ユーザーの存在確認
      const user = UsersDB.getById(userId)
      if (!user) {
        throw ErrorHandler.createError(
          ErrorCode.PARTICIPANT_NOT_FOUND,
          `User not found: ${userId}`,
          'ユーザーが見つかりません',
          { userId }
        )
      }

      const id = generateId('session')
      const sessionToken = generateSessionToken()
      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString()
      
      const session: UserSession = {
        id,
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt,
        created_at: now,
        last_used: now,
        ip_address: ipAddress,
        user_agent: userAgent
      }
      
      const stmt = db.prepare(`
        INSERT INTO user_sessions (id, user_id, session_token, expires_at, created_at, last_used, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        session.id, session.user_id, session.session_token, session.expires_at,
        session.created_at, session.last_used, session.ip_address, session.user_agent
      )
      
      // ユーザーテーブルのセッショントークンも更新
      const userStmt = db.prepare('UPDATE users SET session_token = ?, last_active = ? WHERE id = ?')
      userStmt.run(sessionToken, now, userId)
      
      console.log(`✅ セッション作成成功: ${userId}`)
      return session
    } catch (error: any) {
      if (error.code && error.userMessage) {
        throw error
      }
      const appError = ErrorHandler.handleDatabaseError(error, 'create session', userId)
      throw appError
    }
  },

  // セッション取得
  getByToken: (token: string): UserSession | null => {
    const stmt = db.prepare('SELECT * FROM user_sessions WHERE session_token = ?')
    return (stmt.get(token) as UserSession) || null
  },

  // セッション有効性チェック
  isValid: (token: string): boolean => {
    const session = SessionsDB.getByToken(token)
    if (!session) return false
    
    const now = new Date()
    const expiresAt = new Date(session.expires_at)
    
    return now < expiresAt
  },

  // セッション更新（最終使用時刻）
  updateLastUsed: (token: string): void => {
    const stmt = db.prepare('UPDATE user_sessions SET last_used = ? WHERE session_token = ?')
    stmt.run(new Date().toISOString(), token)
  },

  // セッション削除
  delete: (token: string): boolean => {
    const stmt = db.prepare('DELETE FROM user_sessions WHERE session_token = ?')
    const result = stmt.run(token)
    
    // ユーザーテーブルのセッショントークンもクリア
    const userStmt = db.prepare('UPDATE users SET session_token = NULL WHERE session_token = ?')
    userStmt.run(token)
    
    return result.changes > 0
  },

  // 期限切れセッションを削除
  cleanupExpired: (): number => {
    const now = new Date().toISOString()
    const stmt = db.prepare('DELETE FROM user_sessions WHERE expires_at < ?')
    const result = stmt.run(now)
    
    // ユーザーテーブルの期限切れトークンもクリア
    const userStmt = db.prepare(`
      UPDATE users SET session_token = NULL 
      WHERE session_token NOT IN (SELECT session_token FROM user_sessions)
    `)
    userStmt.run()
    
    return result.changes
  },

  // ユーザーの全セッション削除
  deleteByUserId: (userId: string): void => {
    const stmt = db.prepare('DELETE FROM user_sessions WHERE user_id = ?')
    stmt.run(userId)
    
    // ユーザーテーブルのセッショントークンもクリア
    const userStmt = db.prepare('UPDATE users SET session_token = NULL WHERE id = ?')
    userStmt.run(userId)
  }
}

// ユーティリティ関数
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 認証ヘルパー
export const AuthHelper = {
  // ユーザー登録またはログイン
  registerOrLogin: (
    name: string, 
    email?: string, 
    ipAddress?: string, 
    userAgent?: string,
    googleId?: string,
    avatarUrl?: string,
    authProvider?: 'manual' | 'google'
  ): { user: User; session: UserSession; isNewUser: boolean } => {
    // 既存ユーザーをチェック
    let existingUser: User | null = null
    
    if (googleId) {
      // Google IDで検索
      const stmt = db.prepare('SELECT * FROM users WHERE google_id = ? AND is_active = 1')
      existingUser = (stmt.get(googleId) as User) || null
    }
    
    if (!existingUser && email) {
      // メールアドレスで検索
      existingUser = UsersDB.getByEmail(email)
    }
    
    if (!existingUser && authProvider === 'manual') {
      // 手動登録の場合は名前でも検索
      existingUser = UsersDB.getByName(name)
    }
    
    if (existingUser) {
      // 既存ユーザーの場合、Google情報を更新
      if (googleId && !existingUser.google_id) {
        UsersDB.update(existingUser.id, {
          google_id: googleId,
          avatar_url: avatarUrl,
          auth_provider: authProvider || existingUser.auth_provider
        })
        existingUser = UsersDB.getById(existingUser.id)!
      }
      
      const session = SessionsDB.create(existingUser.id, ipAddress, userAgent)
      UsersDB.updateLastActive(existingUser.id)
      
      return {
        user: existingUser,
        session,
        isNewUser: false
      }
    } else {
      // 新規ユーザーの場合
      const user = UsersDB.create({ 
        name, 
        email, 
        googleId, 
        avatarUrl, 
        authProvider 
      })
      const session = SessionsDB.create(user.id, ipAddress, userAgent)
      
      return {
        user,
        session,
        isNewUser: true
      }
    }
  },

  // セッション検証
  validateSession: (token: string): User | null => {
    if (!SessionsDB.isValid(token)) {
      return null
    }
    
    const user = UsersDB.getBySessionToken(token)
    if (user) {
      SessionsDB.updateLastUsed(token)
      UsersDB.updateLastActive(user.id)
    }
    
    return user
  },

  // ログアウト
  logout: (token: string): boolean => {
    return SessionsDB.delete(token)
  },

  // 重複チェック
  checkDuplicateParticipation: (userId: string, eventId: string): boolean => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM participants p
      JOIN users u ON p.email = u.id OR p.name = u.name
      WHERE u.id = ? AND p.event_id = ?
    `)
    const result = stmt.get(userId, eventId) as { count: number }
    return result.count > 0
  }
}

// 定期クリーンアップ（1時間ごと）
setInterval(() => {
  const cleaned = SessionsDB.cleanupExpired()
  if (cleaned > 0) {
    console.log(`🧹 期限切れセッション ${cleaned}件を削除しました`)
  }
}, 60 * 60 * 1000)