// 統一エラーハンドリングシステム

export enum ErrorCode {
  // 認証関連
  AUTH_INVALID_SESSION = 'AUTH_INVALID_SESSION',
  AUTH_EXPIRED_SESSION = 'AUTH_EXPIRED_SESSION',
  AUTH_GOOGLE_FAILED = 'AUTH_GOOGLE_FAILED',
  AUTH_INVALID_PASSWORD = 'AUTH_INVALID_PASSWORD',
  
  // データベース関連
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  DB_TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  
  // イベント関連
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  EVENT_CREATION_FAILED = 'EVENT_CREATION_FAILED',
  EVENT_UPDATE_FAILED = 'EVENT_UPDATE_FAILED',
  EVENT_DELETE_FAILED = 'EVENT_DELETE_FAILED',
  
  // 参加者関連
  PARTICIPANT_DUPLICATE = 'PARTICIPANT_DUPLICATE',
  PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',
  PARTICIPANT_INVALID_DATA = 'PARTICIPANT_INVALID_DATA',
  
  // バリデーション関連
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',
  
  // システム関連
  SYSTEM_INTERNAL_ERROR = 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_RATE_LIMIT = 'SYSTEM_RATE_LIMIT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  
  // ネットワーク関連
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_ERROR = 'NETWORK_CONNECTION_ERROR'
}

export interface AppError {
  code: ErrorCode
  message: string
  userMessage: string
  details?: any
  timestamp: string
  userId?: string
  requestId?: string
  stack?: string
}

export class ErrorHandler {
  private static errorLog: AppError[] = []
  private static readonly MAX_LOG_SIZE = 1000

  // エラーを作成
  static createError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    details?: any,
    userId?: string,
    requestId?: string
  ): AppError {
    const error: AppError = {
      code,
      message,
      userMessage,
      details,
      timestamp: new Date().toISOString(),
      userId,
      requestId,
      stack: new Error().stack
    }

    // ログに記録
    this.logError(error)
    
    return error
  }

  // エラーをログに記録
  private static logError(error: AppError): void {
    // メモリログに追加
    this.errorLog.unshift(error)
    
    // ログサイズ制限
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE)
    }

    // コンソールログ
    console.error(`[${error.code}] ${error.message}`, {
      userMessage: error.userMessage,
      details: error.details,
      userId: error.userId,
      requestId: error.requestId,
      timestamp: error.timestamp
    })

    // 重要なエラーは別途記録
    if (this.isCriticalError(error.code)) {
      this.logCriticalError(error)
    }
  }

  // 重要なエラーかどうか判定
  private static isCriticalError(code: ErrorCode): boolean {
    const criticalErrors = [
      ErrorCode.DB_CONNECTION_FAILED,
      ErrorCode.DB_TRANSACTION_FAILED,
      ErrorCode.SYSTEM_INTERNAL_ERROR
    ]
    return criticalErrors.includes(code)
  }

  // 重要なエラーの特別処理
  private static logCriticalError(error: AppError): void {
    // 将来的にはSlackやメール通知などを実装
    console.error('🚨 CRITICAL ERROR:', error)
  }

  // エラーログを取得
  static getErrorLog(limit: number = 50): AppError[] {
    return this.errorLog.slice(0, limit)
  }

  // 特定ユーザーのエラーログを取得
  static getUserErrorLog(userId: string, limit: number = 20): AppError[] {
    return this.errorLog
      .filter(error => error.userId === userId)
      .slice(0, limit)
  }

  // エラー統計を取得
  static getErrorStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {}
    
    this.errorLog.forEach(error => {
      stats[error.code] = (stats[error.code] || 0) + 1
    })
    
    return stats
  }

  // データベースエラーの処理
  static handleDatabaseError(error: any, operation: string, userId?: string): AppError {
    let code: ErrorCode
    let userMessage: string

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      code = ErrorCode.DB_CONSTRAINT_VIOLATION
      userMessage = '既に登録済みのデータです'
    } else if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      code = ErrorCode.DB_CONSTRAINT_VIOLATION
      userMessage = '関連するデータが見つかりません'
    } else if (error.message?.includes('database is locked')) {
      code = ErrorCode.DB_CONNECTION_FAILED
      userMessage = 'データベースが一時的に利用できません。しばらく待ってから再度お試しください'
    } else {
      code = ErrorCode.DB_QUERY_FAILED
      userMessage = 'データの処理中にエラーが発生しました'
    }

    return this.createError(
      code,
      `Database error in ${operation}: ${error.message}`,
      userMessage,
      { operation, originalError: error.message },
      userId
    )
  }

  // バリデーションエラーの処理
  static handleValidationError(field: string, value: any, rule: string, userId?: string): AppError {
    const userMessages: { [key: string]: string } = {
      required: `${field}は必須項目です`,
      email: 'メールアドレスの形式が正しくありません',
      minLength: `${field}は最低限の文字数が必要です`,
      maxLength: `${field}が長すぎます`,
      dateRange: '日付の範囲が正しくありません',
      timeRange: '時間の範囲が正しくありません'
    }

    return this.createError(
      ErrorCode.VALIDATION_INVALID_FORMAT,
      `Validation failed for ${field}: ${rule}`,
      userMessages[rule] || `${field}の入力内容に問題があります`,
      { field, value, rule },
      userId
    )
  }

  // 認証エラーの処理
  static handleAuthError(type: 'session' | 'google' | 'password', details?: any, userId?: string): AppError {
    const errorMap = {
      session: {
        code: ErrorCode.AUTH_INVALID_SESSION,
        message: 'Invalid or expired session',
        userMessage: 'セッションが無効です。再度ログインしてください'
      },
      google: {
        code: ErrorCode.AUTH_GOOGLE_FAILED,
        message: 'Google authentication failed',
        userMessage: 'Google認証に失敗しました。再度お試しください'
      },
      password: {
        code: ErrorCode.AUTH_INVALID_PASSWORD,
        message: 'Invalid password',
        userMessage: 'パスワードが正しくありません'
      }
    }

    const errorInfo = errorMap[type]
    return this.createError(
      errorInfo.code,
      errorInfo.message,
      errorInfo.userMessage,
      details,
      userId
    )
  }

  // システムエラーの処理
  static handleSystemError(error: any, context: string, userId?: string): AppError {
    return this.createError(
      ErrorCode.SYSTEM_INTERNAL_ERROR,
      `System error in ${context}: ${error.message}`,
      'システムエラーが発生しました。管理者に連絡してください',
      { context, originalError: error.message, stack: error.stack },
      userId
    )
  }

  // エラーログをクリア
  static clearErrorLog(): void {
    this.errorLog = []
    console.log('✅ エラーログをクリアしました')
  }
}

// リクエストID生成ユーティリティ
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// ユーザーフレンドリーなエラーメッセージの取得
export function getUserFriendlyMessage(error: any): string {
  if (error instanceof Error) {
    // 既知のエラーパターンをチェック
    if (error.message.includes('fetch')) {
      return 'ネットワーク接続に問題があります。インターネット接続を確認してください'
    }
    if (error.message.includes('timeout')) {
      return 'リクエストがタイムアウトしました。しばらく待ってから再度お試しください'
    }
    if (error.message.includes('404')) {
      return '要求されたデータが見つかりません'
    }
    if (error.message.includes('500')) {
      return 'サーバーエラーが発生しました。しばらく待ってから再度お試しください'
    }
  }
  
  return 'エラーが発生しました。問題が続く場合は管理者に連絡してください'
}