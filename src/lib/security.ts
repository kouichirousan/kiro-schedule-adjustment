// セキュリティ強化システム

import crypto from 'crypto'
import { ErrorHandler, ErrorCode } from './error-handler'

// セキュリティ設定
export const SECURITY_CONFIG = {
  // セッション設定
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7日間
  SESSION_REFRESH_THRESHOLD: 24 * 60 * 60 * 1000, // 24時間
  
  // CSRF設定
  CSRF_TOKEN_LENGTH: 32,
  CSRF_TOKEN_DURATION: 60 * 60 * 1000, // 1時間
  
  // レート制限
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15分
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // パスワード設定
  MIN_PASSWORD_LENGTH: 8,
  PASSWORD_SALT_ROUNDS: 12,
  
  // 暗号化設定
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  KEY_DERIVATION_ITERATIONS: 100000
}

// 暗号化ユーティリティ
export class CryptoHelper {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  
  // データを暗号化
  static encrypt(text: string): string {
    try {
      const algorithm = SECURITY_CONFIG.ENCRYPTION_ALGORITHM
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32)
      const iv = crypto.randomBytes(16)
      
      const cipher = crypto.createCipher(algorithm, key)
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      return iv.toString('hex') + ':' + encrypted
    } catch (error) {
      console.error('暗号化エラー:', error)
      throw ErrorHandler.createError(
        ErrorCode.SYSTEM_INTERNAL_ERROR,
        'Encryption failed',
        'データの暗号化に失敗しました'
      )
    }
  }
  
  // データを復号化
  static decrypt(encryptedText: string): string {
    try {
      const algorithm = SECURITY_CONFIG.ENCRYPTION_ALGORITHM
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32)
      
      const parts = encryptedText.split(':')
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted format')
      }
      
      const iv = Buffer.from(parts[0], 'hex')
      const encrypted = parts[1]
      
      const decipher = crypto.createDecipher(algorithm, key)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('復号化エラー:', error)
      throw ErrorHandler.createError(
        ErrorCode.SYSTEM_INTERNAL_ERROR,
        'Decryption failed',
        'データの復号化に失敗しました'
      )
    }
  }
  
  // ハッシュ生成
  static hash(text: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(text, actualSalt, SECURITY_CONFIG.KEY_DERIVATION_ITERATIONS, 64, 'sha512')
    return actualSalt + ':' + hash.toString('hex')
  }
  
  // ハッシュ検証
  static verifyHash(text: string, hashedText: string): boolean {
    try {
      const parts = hashedText.split(':')
      if (parts.length !== 2) return false
      
      const salt = parts[0]
      const hash = parts[1]
      const newHash = crypto.pbkdf2Sync(text, salt, SECURITY_CONFIG.KEY_DERIVATION_ITERATIONS, 64, 'sha512')
      
      return hash === newHash.toString('hex')
    } catch (error) {
      return false
    }
  }
  
  // 安全なランダム文字列生成
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }
}

// 入力値検証
export class InputValidator {
  // SQLインジェクション対策
  static sanitizeSQL(input: string): string {
    if (typeof input !== 'string') return ''
    
    // 危険な文字をエスケープ
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/xp_/g, '')
      .replace(/sp_/g, '')
  }
  
  // XSS対策
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return ''
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }
  
  // メールアドレス検証
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return emailRegex.test(email) && email.length <= 254
  }
  
  // 名前検証
  static isValidName(name: string): boolean {
    if (typeof name !== 'string') return false
    const trimmed = name.trim()
    return trimmed.length >= 1 && trimmed.length <= 50 && !/[<>\"'&]/.test(trimmed)
  }
  
  // URL検証
  static isValidURL(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }
  
  // 日付検証
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }
}

// CSRFトークン管理
export class CSRFManager {
  private static tokens = new Map<string, { token: string; expires: number }>()
  
  // CSRFトークン生成
  static generateToken(sessionId: string): string {
    const token = CryptoHelper.generateSecureToken(SECURITY_CONFIG.CSRF_TOKEN_LENGTH)
    const expires = Date.now() + SECURITY_CONFIG.CSRF_TOKEN_DURATION
    
    this.tokens.set(sessionId, { token, expires })
    
    // 期限切れトークンをクリーンアップ
    this.cleanupExpiredTokens()
    
    return token
  }
  
  // CSRFトークン検証
  static verifyToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId)
    if (!stored) return false
    
    if (Date.now() > stored.expires) {
      this.tokens.delete(sessionId)
      return false
    }
    
    return stored.token === token
  }
  
  // 期限切れトークンをクリーンアップ
  private static cleanupExpiredTokens(): void {
    const now = Date.now()
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId)
      }
    }
  }
  
  // セッション終了時のトークン削除
  static removeToken(sessionId: string): void {
    this.tokens.delete(sessionId)
  }
}

// レート制限
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>()
  
  // リクエスト制限チェック
  static checkLimit(identifier: string, maxRequests: number = SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS): boolean {
    const now = Date.now()
    const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW
    
    let requestData = this.requests.get(identifier)
    
    // 新しいウィンドウの場合はリセット
    if (!requestData || requestData.resetTime < windowStart) {
      requestData = { count: 0, resetTime: now }
    }
    
    // リクエスト数をチェック
    if (requestData.count >= maxRequests) {
      return false
    }
    
    // リクエスト数を増加
    requestData.count++
    this.requests.set(identifier, requestData)
    
    return true
  }
  
  // 残りリクエスト数を取得
  static getRemainingRequests(identifier: string, maxRequests: number = SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS): number {
    const requestData = this.requests.get(identifier)
    if (!requestData) return maxRequests
    
    return Math.max(0, maxRequests - requestData.count)
  }
  
  // リセット時刻を取得
  static getResetTime(identifier: string): number {
    const requestData = this.requests.get(identifier)
    if (!requestData) return Date.now()
    
    return requestData.resetTime + SECURITY_CONFIG.RATE_LIMIT_WINDOW
  }
}

// セキュリティヘッダー
export class SecurityHeaders {
  // セキュリティヘッダーを取得
  static getHeaders(): Record<string, string> {
    return {
      // XSS保護
      'X-XSS-Protection': '1; mode=block',
      
      // コンテンツタイプスニッフィング防止
      'X-Content-Type-Options': 'nosniff',
      
      // フレーム埋め込み防止
      'X-Frame-Options': 'DENY',
      
      // HTTPS強制（本番環境）
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // リファラーポリシー
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // 権限ポリシー
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      
      // コンテンツセキュリティポリシー
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://accounts.google.com https://www.googleapis.com",
        "frame-src https://accounts.google.com"
      ].join('; ')
    }
  }
}

// セキュリティ監査ログ
export class SecurityAudit {
  private static logs: Array<{
    timestamp: string
    event: string
    userId?: string
    ip?: string
    userAgent?: string
    details?: any
  }> = []
  
  // セキュリティイベントをログ
  static log(event: string, userId?: string, ip?: string, userAgent?: string, details?: any): void {
    this.logs.unshift({
      timestamp: new Date().toISOString(),
      event,
      userId,
      ip,
      userAgent,
      details
    })
    
    // ログサイズ制限
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000)
    }
    
    // 重要なセキュリティイベントはコンソールにも出力
    if (this.isCriticalEvent(event)) {
      console.warn(`🚨 セキュリティイベント: ${event}`, { userId, ip, details })
    }
  }
  
  // 重要なイベントかどうか判定
  private static isCriticalEvent(event: string): boolean {
    const criticalEvents = [
      'FAILED_LOGIN_ATTEMPT',
      'RATE_LIMIT_EXCEEDED',
      'CSRF_TOKEN_MISMATCH',
      'INVALID_SESSION',
      'SQL_INJECTION_ATTEMPT'
    ]
    return criticalEvents.includes(event)
  }
  
  // セキュリティログを取得
  static getLogs(limit: number = 50): typeof SecurityAudit.logs {
    return this.logs.slice(0, limit)
  }
  
  // 特定ユーザーのログを取得
  static getUserLogs(userId: string, limit: number = 20): typeof SecurityAudit.logs {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(0, limit)
  }
}

// 定期クリーンアップ（5分ごと）
setInterval(() => {
  CSRFManager['cleanupExpiredTokens']()
}, 5 * 60 * 1000)