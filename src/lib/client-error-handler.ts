// クライアントサイドエラーハンドリング

export interface ClientError {
  message: string
  code?: string
  details?: any
  timestamp: string
  url?: string
  userAgent?: string
}

export class ClientErrorHandler {
  private static errorLog: ClientError[] = []
  private static readonly MAX_LOG_SIZE = 100

  // エラーを記録
  static logError(error: any, context?: string): ClientError {
    const clientError: ClientError = {
      message: this.getErrorMessage(error),
      code: error.code || 'UNKNOWN_ERROR',
      details: {
        context,
        originalError: error.message || error,
        stack: error.stack
      },
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    }

    // ログに追加
    this.errorLog.unshift(clientError)
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE)
    }

    // コンソールに出力
    console.error(`[ClientError] ${clientError.message}`, clientError)

    return clientError
  }

  // エラーメッセージを取得
  private static getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error
    }
    if (error.message) {
      return error.message
    }
    if (error.error) {
      return error.error
    }
    return 'Unknown error occurred'
  }

  // ユーザーフレンドリーなメッセージを取得
  static getUserFriendlyMessage(error: any): string {
    const message = this.getErrorMessage(error)
    
    // ネットワークエラー
    if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
      return 'インターネット接続を確認してください'
    }
    
    // タイムアウトエラー
    if (message.includes('timeout') || message.includes('TIMEOUT')) {
      return 'リクエストがタイムアウトしました。しばらく待ってから再度お試しください'
    }
    
    // 認証エラー
    if (message.includes('auth') || message.includes('unauthorized') || error.code?.includes('AUTH')) {
      return 'ログインが必要です。再度ログインしてください'
    }
    
    // バリデーションエラー
    if (error.code?.includes('VALIDATION')) {
      return error.message || '入力内容に問題があります'
    }
    
    // サーバーエラー
    if (message.includes('500') || message.includes('Internal Server Error')) {
      return 'サーバーエラーが発生しました。しばらく待ってから再度お試しください'
    }
    
    // その他のエラー
    return error.message || 'エラーが発生しました。問題が続く場合は管理者に連絡してください'
  }

  // エラーログを取得
  static getErrorLog(): ClientError[] {
    return [...this.errorLog]
  }

  // エラーログをクリア
  static clearErrorLog(): void {
    this.errorLog = []
  }

  // APIエラーを処理
  static async handleApiError(response: Response): Promise<never> {
    let errorData: any = {}
    
    try {
      errorData = await response.json()
    } catch {
      errorData = { error: `HTTP ${response.status} ${response.statusText}` }
    }

    const error = {
      message: errorData.error || `HTTP ${response.status}`,
      code: errorData.code || `HTTP_${response.status}`,
      status: response.status,
      details: errorData
    }

    this.logError(error, 'API Request')
    throw error
  }

  // 非同期操作のエラーハンドリング
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    fallbackValue?: T
  ): Promise<T | undefined> {
    try {
      return await operation()
    } catch (error) {
      this.logError(error, context)
      
      if (fallbackValue !== undefined) {
        return fallbackValue
      }
      
      throw error
    }
  }

  // リトライ機能付きの操作実行
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: string
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) {
          this.logError(error, `${context} (final attempt ${attempt}/${maxRetries})`)
          throw error
        }
        
        console.warn(`[Retry ${attempt}/${maxRetries}] ${context}:`, error)
        
        // 指数バックオフ
        const waitTime = delay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    throw lastError
  }
}

// React Hook for error handling
export function useErrorHandler() {
  const handleError = (error: any, context?: string) => {
    const clientError = ClientErrorHandler.logError(error, context)
    return ClientErrorHandler.getUserFriendlyMessage(error)
  }

  const handleApiCall = async <T>(
    apiCall: () => Promise<Response>,
    context?: string
  ): Promise<T> => {
    try {
      const response = await apiCall()
      
      if (!response.ok) {
        await ClientErrorHandler.handleApiError(response)
      }
      
      return await response.json()
    } catch (error) {
      const friendlyMessage = handleError(error, context)
      throw new Error(friendlyMessage)
    }
  }

  return {
    handleError,
    handleApiCall,
    withRetry: ClientErrorHandler.withRetry,
    withErrorHandling: ClientErrorHandler.withErrorHandling
  }
}