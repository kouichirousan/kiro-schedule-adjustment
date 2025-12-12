import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, SecurityAudit } from '@/lib/security'
import { ErrorHandler } from '@/lib/error-handler'

// セキュリティ状況の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const password = searchParams.get('password')
    
    // 管理者認証
    if (password !== process.env.COMMUNITY_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: '認証が必要です'
      }, { status: 401 })
    }
    
    // セキュリティ設定状況
    const securityConfig = {
      httpsEnabled: process.env.ENABLE_HTTPS === 'true',
      rateLimitingEnabled: process.env.ENABLE_RATE_LIMITING !== 'false',
      csrfProtectionEnabled: process.env.ENABLE_CSRF_PROTECTION !== 'false',
      securityHeadersEnabled: process.env.ENABLE_SECURITY_HEADERS !== 'false',
      securityAuditEnabled: process.env.ENABLE_SECURITY_AUDIT !== 'false',
      environment: process.env.NODE_ENV || 'development'
    }
    
    // 最近のセキュリティイベント（過去24時間）
    const recentLogs = SecurityAudit.getLogs(100)
    const last24h = recentLogs.filter(log => 
      Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
    )
    
    // セキュリティ統計
    const securityStats = {
      totalEvents: recentLogs.length,
      last24hEvents: last24h.length,
      criticalEvents: last24h.filter(log => 
        ['SQL_INJECTION_ATTEMPT', 'XSS_ATTEMPT', 'RATE_LIMIT_EXCEEDED'].includes(log.event)
      ).length,
      uniqueIPs: new Set(last24h.map(log => log.ip).filter(Boolean)).size,
      topThreats: Object.entries(
        last24h.reduce((acc, log) => {
          acc[log.event] = (acc[log.event] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      )
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
    }
    
    // 環境変数の安全性チェック
    const securityChecks = {
      hasCustomSessionSecret: process.env.SESSION_SECRET !== 'change-this-in-production-to-a-long-random-string',
      hasCustomEncryptionKey: process.env.ENCRYPTION_KEY !== 'change-this-encryption-key-in-production-environment',
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'GOCSPX-your-client-secret-here',
      isProductionReady: process.env.NODE_ENV === 'production' && 
                        process.env.SESSION_SECRET !== 'change-this-in-production-to-a-long-random-string' &&
                        process.env.ENCRYPTION_KEY !== 'change-this-encryption-key-in-production-environment'
    }
    
    // 推奨セキュリティアクション
    const recommendations = []
    
    if (!securityChecks.hasCustomSessionSecret) {
      recommendations.push({
        priority: 'high',
        action: 'SESSION_SECRETを本番用の長いランダム文字列に変更してください',
        description: 'セッションの安全性を確保するため'
      })
    }
    
    if (!securityChecks.hasCustomEncryptionKey) {
      recommendations.push({
        priority: 'high',
        action: 'ENCRYPTION_KEYを本番用の安全なキーに変更してください',
        description: 'データ暗号化の安全性を確保するため'
      })
    }
    
    if (!securityConfig.httpsEnabled && process.env.NODE_ENV === 'production') {
      recommendations.push({
        priority: 'critical',
        action: 'HTTPS通信を有効にしてください',
        description: '通信内容の暗号化のため'
      })
    }
    
    if (securityStats.criticalEvents > 0) {
      recommendations.push({
        priority: 'medium',
        action: '攻撃の試行が検出されています。ログを確認してください',
        description: 'セキュリティ監視の強化が必要'
      })
    }
    
    return NextResponse.json({
      success: true,
      securityConfig,
      securityStats,
      securityChecks,
      recommendations,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const appError = ErrorHandler.handleSystemError(error, 'security status')
    return NextResponse.json({
      success: false,
      error: appError.userMessage
    }, { status: 500 })
  }
}