'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useErrorHandler } from '@/lib/client-error-handler'

export default function AuthPage() {
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()
  const { handleError, handleApiCall } = useErrorHandler()

  // Google Sign-In初期化
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (typeof window !== 'undefined' && window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleSignIn,
          auto_select: false,
          cancel_on_tap_outside: true
        })
        
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            locale: 'ja'
          }
        )
      }
    }

    // Google APIスクリプトが読み込まれるまで待機
    if (document.getElementById('google-signin-script')) {
      initializeGoogleSignIn()
    } else {
      const script = document.createElement('script')
      script.id = 'google-signin-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initializeGoogleSignIn
      document.head.appendChild(script)
    }
  }, [])

  // Google Sign-Inコールバック
  const handleGoogleSignIn = async (response: any) => {
    console.log('🔍 Google Sign-In開始:', response)
    setIsGoogleLoading(true)
    setError('')

    try {
      if (!response.credential) {
        throw new Error('Google認証情報が取得できませんでした')
      }

      console.log('📤 サーバーに認証情報を送信中...')
      const result = await handleApiCall(
        () => fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: response.credential
          })
        }),
        'Google Authentication'
      )

      console.log('📥 サーバーレスポンス:', result)

      if (result.success) {
        console.log('✅ Google認証成功、リダイレクト中...')
        router.push('/')
      } else {
        console.error('❌ Google認証失敗:', result.error)
        setError(result.error || 'Google認証に失敗しました')
      }
    } catch (error) {
      console.error('❌ Google認証エラー:', error)
      const friendlyMessage = handleError(error, 'Google Authentication')
      setError(friendlyMessage)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await handleApiCall(
        () => fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password, name, email }),
        }),
        'Password Authentication'
      )

      if (result.success) {
        router.push('/')
      } else {
        setError(result.error || '認証に失敗しました')
      }
    } catch (error) {
      const friendlyMessage = handleError(error, 'Password Authentication')
      setError(friendlyMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-3xl font-bold text-gray-900">
            コミュニティアクセス
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            日程調整システムにアクセスするには<br/>
            コミュニティパスワードとお名前を入力してください
          </p>
        </div>
        
        {/* Google Sign-In */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">推奨</span>
            </div>
          </div>
          
          <div className="mt-4">
            <div id="google-signin-button" className="w-full"></div>
            {isGoogleLoading && (
              <div className="mt-2 text-center">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-600">Google認証中...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 区切り線 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">または</span>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              お名前 *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="例: 山田太郎"
            />
            <p className="text-xs text-gray-500 mt-1">
              日程調整の参加者として表示されます
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス（任意）
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="例: yamada@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              重複回答防止のために使用されます
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              コミュニティパスワード *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="コミュニティパスワード"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  認証中...
                </>
              ) : (
                'パスワードでアクセス'
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            <strong>推奨:</strong> Googleアカウントでのログインが安全で便利です<br/>
            パスワードがわからない場合は、コミュニティ管理者にお問い合わせください
          </p>
        </div>
      </div>
    </div>
  )
}