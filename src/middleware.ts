import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RateLimiter, SecurityHeaders, SecurityAudit, InputValidator } from './lib/security'

// 45人コミュニティ向け負荷制限
const connectionCounts = new Map<string, number>()
const connectionTimestamps = new Map<string, number>()
const MAX_CONNECTIONS_PER_IP = 25
const GLOBAL_MAX_CONNECTIONS = 30
const RESET_INTERVAL = 10 * 60 * 1000 // 10分
const CONNECTION_TIMEOUT = 5 * 60 * 1000 // 5分

// セキュリティ設定
const SECURITY_ENABLED = {
  rateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
  securityHeaders: process.env.ENABLE_SECURITY_HEADERS !== 'false',
  securityAudit: process.env.ENABLE_SECURITY_AUDIT !== 'false'
}

// 古い接続を自動クリーンアップする関数
const cleanupOldConnections = () => {
  const now = Date.now()
  const cutoffTime = now - RESET_INTERVAL
  
  for (const [ip, timestamp] of connectionTimestamps.entries()) {
    if (timestamp < cutoffTime) {
      connectionCounts.delete(ip)
      connectionTimestamps.delete(ip)
    }
  }
  
  for (const [ip, count] of connectionCounts.entries()) {
    const recentConnections = Math.max(0, count - Math.floor((now - (connectionTimestamps.get(ip) || now)) / CONNECTION_TIMEOUT))
    if (recentConnections <= 0) {
      connectionCounts.delete(ip)
      connectionTimestamps.delete(ip)
    } else {
      connectionCounts.set(ip, recentConnections)
    }
  }
}

// 疑わしいリクエストを検出
function detectSuspiciousActivity(request: NextRequest): string | null {
  const url = request.nextUrl.pathname + request.nextUrl.search
  const userAgent = request.headers.get('user-agent') || ''
  
  // SQLインジェクション試行の検出
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\'.*OR.*\'.*=.*\')/i,
    /(--|\#|\/\*|\*\/)/
  ]
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(url)) {
      return 'SQL_INJECTION_ATTEMPT'
    }
  }
  
  // XSS試行の検出
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /eval\s*\(/i
  ]
  
  for (const pattern of xssPatterns) {
    if (pattern.test(url)) {
      return 'XSS_ATTEMPT'
    }
  }
  
  // 異常なUser-Agent
  if (!userAgent || userAgent.length < 10 || /bot|crawler|spider/i.test(userAgent)) {
    return 'SUSPICIOUS_USER_AGENT'
  }
  
  // パストラバーサル試行
  if (/\.\.\/|\.\.\\/.test(url)) {
    return 'PATH_TRAVERSAL_ATTEMPT'
  }
  
  return null
}

export function middleware(request: NextRequest) {
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || ''
  const pathname = request.nextUrl.pathname
  
  // セキュリティヘッダーを追加
  const response = NextResponse.next()
  if (SECURITY_ENABLED.securityHeaders) {
    const securityHeaders = SecurityHeaders.getHeaders()
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }
  
  // 疑わしい活動の検出
  const suspiciousActivity = detectSuspiciousActivity(request)
  if (suspiciousActivity) {
    if (SECURITY_ENABLED.securityAudit) {
      SecurityAudit.log(suspiciousActivity, undefined, clientIP, userAgent, {
        url: request.nextUrl.toString(),
        method: request.method
      })
    }
    
    // 重要な攻撃は即座にブロック
    if (['SQL_INJECTION_ATTEMPT', 'XSS_ATTEMPT', 'PATH_TRAVERSAL_ATTEMPT'].includes(suspiciousActivity)) {
      return new NextResponse('不正なリクエストが検出されました', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      })
    }
  }
  
  // レート制限チェック
  if (SECURITY_ENABLED.rateLimiting && !RateLimiter.checkLimit(clientIP)) {
    if (SECURITY_ENABLED.securityAudit) {
      SecurityAudit.log('RATE_LIMIT_EXCEEDED', undefined, clientIP, userAgent, {
        pathname,
        remaining: RateLimiter.getRemainingRequests(clientIP)
      })
    }
    
    return new NextResponse('リクエスト制限に達しました。しばらく待ってから再度お試しください。', {
      status: 429,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '900', // 15分
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': RateLimiter.getResetTime(clientIP).toString()
      }
    })
  }
  
  // 認証が必要なパス
  const protectedPaths = ['/']
  const isProtectedPath = protectedPaths.some(path => 
    pathname === path || pathname.startsWith('/event')
  )

  if (isProtectedPath) {
    // 古い接続をクリーンアップ
    cleanupOldConnections()
    
    const currentConnections = connectionCounts.get(clientIP) || 0
    const totalConnections = Array.from(connectionCounts.values()).reduce((sum, count) => sum + count, 0)
    
    // 接続制限チェック
    if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
      if (SECURITY_ENABLED.securityAudit) {
        SecurityAudit.log('CONNECTION_LIMIT_EXCEEDED', undefined, clientIP, userAgent, {
          currentConnections,
          maxConnections: MAX_CONNECTIONS_PER_IP
        })
      }
      
      if (process.env.NODE_ENV !== 'development') {
        return new NextResponse(`同じWiFiから${MAX_CONNECTIONS_PER_IP}人以上が同時にアクセスしています。\n\n現在の接続数: ${currentConnections}人\n\n30秒後に再度お試しください。`, {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Retry-After': '30'
          }
        })
      }
    }
    
    if (totalConnections >= GLOBAL_MAX_CONNECTIONS) {
      return new NextResponse('サーバーが混雑しています（現在 ' + totalConnections + ' 人が利用中）。しばらく待ってから再度お試しください。', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Retry-After': '60'
        }
      })
    }

    // セッション検証
    const authCookie = request.cookies.get('community-auth')
    const sessionCookie = request.cookies.get('user-session')
    
    if (!authCookie || authCookie.value !== 'authenticated' || !sessionCookie) {
      if (SECURITY_ENABLED.securityAudit) {
        SecurityAudit.log('UNAUTHORIZED_ACCESS_ATTEMPT', undefined, clientIP, userAgent, {
          pathname,
          hasAuthCookie: !!authCookie,
          hasSessionCookie: !!sessionCookie
        })
      }
      
      return NextResponse.redirect(new URL('/auth', request.url))
    }
    
    // セッションの有効性をチェック
    if (sessionCookie.value.length < 10) {
      if (SECURITY_ENABLED.securityAudit) {
        SecurityAudit.log('INVALID_SESSION_TOKEN', undefined, clientIP, userAgent, {
          sessionLength: sessionCookie.value.length
        })
      }
      
      return NextResponse.redirect(new URL('/auth', request.url))
    }

    // 接続数をカウント
    connectionCounts.set(clientIP, currentConnections + 1)
    connectionTimestamps.set(clientIP, Date.now())
    
    // 個別接続の自動減算
    setTimeout(() => {
      const current = connectionCounts.get(clientIP) || 0
      if (current > 0) {
        connectionCounts.set(clientIP, current - 1)
      }
    }, CONNECTION_TIMEOUT)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
}