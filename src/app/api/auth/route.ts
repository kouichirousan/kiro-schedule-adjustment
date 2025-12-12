import { NextRequest, NextResponse } from 'next/server'
import { AuthHelper } from '@/lib/user-management'

// コミュニティパスワード（環境変数で設定可能）
const COMMUNITY_PASSWORD = process.env.COMMUNITY_PASSWORD || 'posse2024'

// ユーザー登録・ログイン
export async function POST(request: NextRequest) {
  try {
    const { password, name, email } = await request.json()
    
    // コミュニティパスワードチェック
    if (password !== COMMUNITY_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'コミュニティパスワードが正しくありません' },
        { status: 401 }
      )
    }
    
    // 名前の検証
    if (!name || name.trim().length < 1 || name.trim().length > 20) {
      return NextResponse.json(
        { success: false, error: '名前は1文字以上20文字以下で入力してください' },
        { status: 400 }
      )
    }
    
    // IPアドレスとUser-Agentを取得
    const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // ユーザー登録またはログイン
    const { user, session, isNewUser } = AuthHelper.registerOrLogin(
      name.trim(), 
      email?.trim(), 
      ipAddress, 
      userAgent
    )
    
    const response = NextResponse.json({ 
      success: true, 
      message: isNewUser ? 'ユーザー登録が完了しました' : 'ログインしました',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      isNewUser
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
    
    return response
  } catch (error) {
    console.error('認証エラー:', error)
    return NextResponse.json(
      { success: false, error: '認証処理でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 現在のユーザー情報取得
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('user-session')?.value
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 401 }
      )
    }
    
    const user = AuthHelper.validateSession(sessionToken)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'セッションが無効です' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error)
    return NextResponse.json(
      { success: false, error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// ログアウト機能
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('user-session')?.value
    
    if (sessionToken) {
      AuthHelper.logout(sessionToken)
    }
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'ログアウトしました' 
    })
    
    // 全てのクッキーを削除
    response.cookies.delete('user-session')
    response.cookies.delete('community-auth')
    
    return response
  } catch (error) {
    console.error('ログアウトエラー:', error)
    return NextResponse.json(
      { success: false, error: 'ログアウト処理でエラーが発生しました' },
      { status: 500 }
    )
  }
}