import { NextRequest, NextResponse } from 'next/server'

// Google API設定テスト用エンドポイント
export async function GET(request: NextRequest) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? {
          exists: true,
          prefix: process.env.NEXT_PUBLIC_GOOGLE_API_KEY.substring(0, 10) + '...',
          length: process.env.NEXT_PUBLIC_GOOGLE_API_KEY.length
        } : { exists: false },
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? {
          exists: true,
          prefix: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 20) + '...',
          length: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length
        } : { exists: false }
      },
      request: {
        origin: request.headers.get('origin'),
        host: request.headers.get('host'),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer')
      },
      recommendations: []
    }

    // 診断とレコメンデーション
    if (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
      diagnostics.recommendations.push('❌ NEXT_PUBLIC_GOOGLE_API_KEY が設定されていません')
    }

    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      diagnostics.recommendations.push('❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID が設定されていません')
    }

    if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_API_KEY.startsWith('AIza')) {
      diagnostics.recommendations.push('⚠️ APIキーの形式が正しくない可能性があります（AIzaで始まる必要があります）')
    }

    if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
      diagnostics.recommendations.push('⚠️ クライアントIDの形式が正しくない可能性があります（.apps.googleusercontent.comで終わる必要があります）')
    }

    const currentOrigin = request.headers.get('origin') || `http://${request.headers.get('host')}`
    diagnostics.recommendations.push(`💡 Google Cloud Consoleの「Authorized JavaScript origins」に以下を追加してください: ${currentOrigin}`)

    if (diagnostics.recommendations.length === 1) {
      diagnostics.recommendations.unshift('✅ 基本的な設定は正常です')
    }

    return NextResponse.json({
      success: true,
      diagnostics
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnostics: null
    }, { status: 500 })
  }
}