import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuthHelper } from '@/lib/google-auth'
import { AuthHelper } from '@/lib/user-management'
import { ErrorHandler, ErrorCode, generateRequestId, getUserFriendlyMessage } from '@/lib/error-handler'

// Google OAuth認証
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  let userId: string | undefined

  try {
    console.log(`🔍 [${requestId}] Google認証開始`)
    
    const { idToken, userInfo } = await request.json()
    
    if (!idToken) {
      const error = ErrorHandler.createError(
        ErrorCode.VALIDATION_REQUIRED_FIELD,
        'ID token is required',
        'IDトークンが必要です',
        { requestId }
      )
      return NextResponse.json(
        { success: false, error: error.userMessage, code: error.code },
        { status: 400 }
      )
    }
    
    // IDトークンを検証
    let googleUser
    try {
      console.log(`🔍 [${requestId}] Google IDトークン検証開始`)
      googleUser = await GoogleAuthHelper.verifyIdToken(idToken)
      console.log(`✅ [${requestId}] Google認証成功:`, { 
        id: googleUser.id, 
        email: googleUser.email, 
        name: googleUser.name 
      })
    } catch (error) {
      const appError = ErrorHandler.handleAuthError('google', { 
        originalError: (error as Error).message,
        requestId 
      })
      console.error(`❌ [${requestId}] Google認証検証エラー:`, appError)
      return NextResponse.json(
        { success: false, error: appError.userMessage, code: appError.code },
        { status: 401 }
      )
    }
    
    // メールアドレスが確認済みかチェック
    if (!googleUser.verified_email) {
      const error = ErrorHandler.createError(
        ErrorCode.VALIDATION_INVALID_FORMAT,
        'Unverified Google account email',
        'メールアドレスが確認されていないGoogleアカウントです',
        { email: googleUser.email, requestId }
      )
      return NextResponse.json(
        { success: false, error: error.userMessage, code: error.code },
        { status: 400 }
      )
    }
    
    // IPアドレスとUser-Agentを取得
    const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // ユーザー登録またはログイン
    console.log(`🔍 [${requestId}] ユーザー登録/ログイン開始`)
    const { user, session, isNewUser } = AuthHelper.registerOrLogin(
      googleUser.name,
      googleUser.email,
      ipAddress,
      userAgent,
      googleUser.id,
      googleUser.picture,
      'google'
    )
    userId = user.id
    console.log(`✅ [${requestId}] ユーザー処理完了:`, { userId: user.id, isNewUser })
    
    const response = NextResponse.json({ 
      success: true, 
      message: isNewUser ? 'Googleアカウントでユーザー登録が完了しました' : 'Googleアカウントでログインしました',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      isNewUser,
      googleInfo: {
        picture: googleUser.picture
      }
    })
    
    // セッションクッキーを設定
    response.cookies.set('user-session', session.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7日間
    })
    
    // コミュニティ認証クッキーも設定（既存の仕組みとの互換性）
    response.cookies.set('community-auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60
    })
    
    console.log(`✅ [${requestId}] Google認証完了`)
    return response
  } catch (error: any) {
    // 既にAppErrorの場合はそのまま返す
    if (error.code && error.userMessage) {
      console.error(`❌ [${requestId}] 既知のエラー:`, error)
      return NextResponse.json(
        { success: false, error: error.userMessage, code: error.code },
        { status: 400 }
      )
    }
    
    // 予期しないエラーの場合
    const appError = ErrorHandler.handleSystemError(error, 'Google authentication', userId)
    console.error(`❌ [${requestId}] システムエラー:`, appError)
    
    return NextResponse.json(
      { 
        success: false, 
        error: appError.userMessage, 
        code: appError.code,
        requestId 
      },
      { status: 500 }
    )
  }
}

// Google OAuth認証URL取得
export async function GET(request: NextRequest) {
  try {
    const authUrl = GoogleAuthHelper.getAuthUrl()
    
    return NextResponse.json({
      success: true,
      authUrl: authUrl
    })
  } catch (error) {
    console.error('Google認証URL生成エラー:', error)
    return NextResponse.json(
      { success: false, error: '認証URL生成に失敗しました' },
      { status: 500 }
    )
  }
}