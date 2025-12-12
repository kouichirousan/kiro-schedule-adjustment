import { OAuth2Client } from 'google-auth-library'

// Google OAuth設定
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET // サーバーサイド用（後で設定）

// OAuth2クライアントの初期化
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`
)

export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
  verified_email: boolean
}

export class GoogleAuthHelper {
  // 認証URLを生成
  static getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
    
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      state: 'security_token_' + Math.random().toString(36).substring(2, 15)
    })
  }
  
  // 認証コードからトークンを取得
  static async getTokenFromCode(code: string): Promise<any> {
    try {
      const { tokens } = await oauth2Client.getToken(code)
      return tokens
    } catch (error) {
      console.error('Google token exchange error:', error)
      throw new Error('認証コードの処理に失敗しました')
    }
  }
  
  // アクセストークンからユーザー情報を取得
  static async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      oauth2Client.setCredentials({ access_token: accessToken })
      
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      )
      
      if (!response.ok) {
        throw new Error('ユーザー情報の取得に失敗しました')
      }
      
      const userInfo = await response.json()
      
      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified_email: userInfo.verified_email
      }
    } catch (error) {
      console.error('Google user info error:', error)
      throw new Error('ユーザー情報の取得に失敗しました')
    }
  }
  
  // IDトークンを検証（簡易版 - 開発用）
  static async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      // 開発環境では簡易的にJWTをデコードして検証
      const parts = idToken.split('.')
      if (parts.length !== 3) {
        throw new Error('無効なJWTフォーマットです')
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      
      // 基本的な検証
      if (!payload.aud || payload.aud !== GOOGLE_CLIENT_ID) {
        throw new Error('無効なaudience')
      }
      
      if (!payload.exp || payload.exp < Date.now() / 1000) {
        throw new Error('トークンが期限切れです')
      }
      
      if (!payload.email || !payload.name) {
        throw new Error('必要な情報が不足しています')
      }
      
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        verified_email: payload.email_verified || false
      }
    } catch (error) {
      console.error('Google ID token verification error:', error)
      throw new Error('IDトークンの検証に失敗しました: ' + (error as Error).message)
    }
  }
}

// フロントエンド用のGoogle Sign-In設定
export const GOOGLE_SIGNIN_CONFIG = {
  client_id: GOOGLE_CLIENT_ID,
  callback: handleGoogleSignIn,
  auto_select: false,
  cancel_on_tap_outside: true
}

// Google Sign-Inのコールバック処理
async function handleGoogleSignIn(response: any) {
  try {
    const userInfo = await GoogleAuthHelper.verifyIdToken(response.credential)
    
    // サーバーに認証情報を送信
    const authResponse = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: response.credential,
        userInfo: userInfo
      })
    })
    
    const result = await authResponse.json()
    
    if (result.success) {
      window.location.href = '/'
    } else {
      console.error('Google認証エラー:', result.error)
      alert('Google認証に失敗しました: ' + result.error)
    }
  } catch (error) {
    console.error('Google Sign-In error:', error)
    alert('Google認証中にエラーが発生しました')
  }
}