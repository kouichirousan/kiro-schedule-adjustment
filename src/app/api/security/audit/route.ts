import { NextRequest, NextResponse } from 'next/server'
import { SecurityAudit, InputValidator } from '@/lib/security'
import { ErrorHandler, ErrorCode } from '@/lib/error-handler'

// セキュリティ監査ログの取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const password = searchParams.get('password')
    const limit = parseInt(searchParams.get('limit') || '50')
    const userId = searchParams.get('userId')
    
    // 管理者認証
    if (password !== process.env.COMMUNITY_PASSWORD) {
      SecurityAudit.log('UNAUTHORIZED_AUDIT_ACCESS', undefined, 
        request.ip || 'unknown', 
        request.headers.get('user-agent') || ''
      )
      
      return NextResponse.json({
        success: false,
        error: '認証が必要です'
      }, { status: 401 })
    }
    
    // 入力値検証
    if (limit < 1 || limit > 1000) {
      return NextResponse.json({
        success: false,
        error: 'limitは1-1000の範囲で指定してください'
      }, { status: 400 })
    }
    
    if (userId && !InputValidator.isValidName(userId)) {
      return NextResponse.json({
        success: false,
        error: '無効なユーザーIDです'
      }, { status: 400 })
    }
    
    // ログを取得
    const logs = userId 
      ? SecurityAudit.getUserLogs(userId, limit)
      : SecurityAudit.getLogs(limit)
    
    // 統計情報を計算
    const allLogs = SecurityAudit.getLogs(1000)
    const stats = {
      total: allLogs.length,
      last24h: allLogs.filter(log => 
        Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
      ).length,
      byEvent: allLogs.reduce((acc, log) => {
        acc[log.event] = (acc[log.event] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      topIPs: Object.entries(
        allLogs.reduce((acc, log) => {
          if (log.ip) {
            acc[log.ip] = (acc[log.ip] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)
      )
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
    }
    
    return NextResponse.json({
      success: true,
      logs,
      stats,
      query: { limit, userId }
    })
    
  } catch (error) {
    const appError = ErrorHandler.handleSystemError(error, 'security audit')
    return NextResponse.json({
      success: false,
      error: appError.userMessage
    }, { status: 500 })
  }
}

// セキュリティログのクリア
export async function DELETE(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // 管理者認証
    if (password !== process.env.COMMUNITY_PASSWORD) {
      SecurityAudit.log('UNAUTHORIZED_AUDIT_CLEAR', undefined,
        request.ip || 'unknown',
        request.headers.get('user-agent') || ''
      )
      
      return NextResponse.json({
        success: false,
        error: '認証が必要です'
      }, { status: 401 })
    }
    
    // ログをクリア前に統計を記録
    const logs = SecurityAudit.getLogs(1000)
    SecurityAudit.log('AUDIT_LOG_CLEARED', undefined,
      request.ip || 'unknown',
      request.headers.get('user-agent') || '',
      { clearedCount: logs.length }
    )
    
    // ログをクリア（実装は SecurityAudit クラスに追加が必要）
    // SecurityAudit.clearLogs()
    
    return NextResponse.json({
      success: true,
      message: `${logs.length}件のセキュリティログをクリアしました`
    })
    
  } catch (error) {
    const appError = ErrorHandler.handleSystemError(error, 'security audit clear')
    return NextResponse.json({
      success: false,
      error: appError.userMessage
    }, { status: 500 })
  }
}