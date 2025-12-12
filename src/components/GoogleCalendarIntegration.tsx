'use client'

import { useState, useEffect } from 'react'
import { 
  initGoogleCalendarAPI, 
  signInWithGoogle, 
  signOutFromGoogle, 
  isSignedIn, 
  calculateAvailability,
  getUserProfile,
  generateTimeSlots
} from '@/lib/google-calendar'

interface GoogleCalendarIntegrationProps {
  eventData: {
    dateRange: {
      startDate: string
      endDate: string
      startTime: string
      endTime: string
    }
    duration: number
  }
  recalculateTrigger?: number
  onAvailabilityCalculated: (availability: { [key: string]: boolean }) => void
  onUserProfileLoaded: (profile: any) => void
}

export default function GoogleCalendarIntegration({ 
  eventData, 
  recalculateTrigger = 0,
  onAvailabilityCalculated, 
  onUserProfileLoaded 
}: GoogleCalendarIntegrationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    checkSignInStatus()
  }, [])

  // recalculateTriggerが変更されたときに再計算を実行
  useEffect(() => {
    if (recalculateTrigger > 0 && isConnected) {
      console.log('再計算トリガーが発火:', recalculateTrigger)
      calculateAndSetAvailability()
    }
  }, [recalculateTrigger, isConnected])

  const checkSignInStatus = async () => {
    try {
      const signedIn = await isSignedIn()
      setIsConnected(signedIn)
      
      if (signedIn) {
        const profile = await getUserProfile()
        console.log('取得したプロフィール:', profile)
        setUserProfile(profile)
        onUserProfileLoaded(profile)
      }
    } catch (error) {
      console.error('Failed to check sign-in status:', error)
    }
  }

  const handleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔐 サインイン処理開始...')
      console.log('🔧 環境変数確認:')
      console.log('  - API Key:', process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? '設定済み' : '❌ 未設定')
      console.log('  - Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '設定済み' : '❌ 未設定')
      
      if (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        throw new Error('Google API設定が不完全です。環境変数を確認してください。')
      }
      
      console.log('🚀 signInWithGoogle()を呼び出し中...')
      const success = await signInWithGoogle()
      console.log('📋 signInWithGoogle()の結果:', success)
      
      if (success) {
        console.log('✅ サインイン成功')
        setIsConnected(true)
        
        console.log('👤 ユーザープロフィール取得中...')
        const profile = await getUserProfile()
        console.log('👤 取得したプロフィール:', profile)
        setUserProfile(profile)
        onUserProfileLoaded(profile)
        
        // 自動で空き時間を計算
        console.log('📅 空き時間計算を開始します...')
        setTimeout(() => {
          calculateAndSetAvailability()
        }, 500) // 少し遅延させて確実に実行
      } else {
        console.error('❌ サインイン失敗')
        setError('Googleサインインに失敗しました。\n\n考えられる原因:\n1. ポップアップがブロックされている\n2. Google APIの設定に問題がある\n3. ネットワーク接続の問題\n\nブラウザのコンソールで詳細を確認してください。')
      }
    } catch (error) {
      console.error('❌ サインインエラー:', error)
      setError(`Googleサインインでエラーが発生しました:\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\nブラウザのコンソールで詳細なエラー情報を確認してください。`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutFromGoogle()
      setIsConnected(false)
      setUserProfile(null)
      setError(null)
    } catch (error) {
      console.error('Sign-out error:', error)
      setError('サインアウトでエラーが発生しました')
    }
  }

  const calculateAndSetAvailability = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 候補時間帯を生成
      const timeSlots = generateTimeSlots(
        eventData.dateRange.startDate,
        eventData.dateRange.endDate,
        eventData.dateRange.startTime,
        eventData.dateRange.endTime
      )
      
      // 空き時間を計算
      const availability = await calculateAvailability(timeSlots, eventData.duration)
      
      onAvailabilityCalculated(availability)
    } catch (error) {
      console.error('Availability calculation error:', error)
      setError('空き時間の計算でエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Googleカレンダーと連携
          </h3>
          <p className="text-gray-600 mb-6">
            あなたのGoogleカレンダーから既存の予定を確認し、<br/>
            空いている時間を自動で提案します。
          </p>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start space-x-2">
                <div className="text-red-500 mt-0.5">⚠️</div>
                <div>
                  <h4 className="text-red-800 font-medium text-sm mb-1">エラーが発生しました</h4>
                  <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
                  <div className="mt-2 text-xs text-red-600">
                    <p>💡 トラブルシューティング:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>ブラウザのポップアップブロックを無効にしてください</li>
                      <li>ブラウザのコンソール（F12）でエラー詳細を確認してください</li>
                      <li>ページを再読み込みして再試行してください</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                連携中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleカレンダーと連携
              </>
            )}
          </button>
          
          <div className="text-xs text-gray-500 mt-4">
            ※ カレンダーの読み取り権限のみ使用します
          </div>
          
          {/* デバッグ用ボタン */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">🔧 デバッグ用:</p>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  console.log('=== デバッグ情報 ===')
                  console.log('環境変数:')
                  console.log('  - API Key:', process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? '設定済み' : '❌ 未設定')
                  console.log('  - Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '設定済み' : '❌ 未設定')
                  console.log('ブラウザオブジェクト:')
                  console.log('  - window.gapi:', !!window.gapi)
                  console.log('  - window.google:', !!window.google)
                  console.log('  - window.google?.accounts:', !!window.google?.accounts)
                  console.log('  - window.google?.accounts?.oauth2:', !!window.google?.accounts?.oauth2)
                  console.log('==================')
                }}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                コンソールに状態出力
              </button>
              <button
                onClick={() => {
                  window.location.reload()
                }}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
              >
                ページ再読み込み
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/google/test')
                    const result = await response.json()
                    console.log('=== Google API診断結果 ===')
                    console.log(result.diagnostics)
                    console.log('========================')
                    alert('診断結果をコンソールに出力しました。F12でコンソールを確認してください。')
                  } catch (error) {
                    console.error('診断エラー:', error)
                    alert('診断に失敗しました')
                  }
                }}
                className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
              >
                Google設定診断
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <p>⚠️ CSPエラーが続く場合:</p>
              <p>1. Google Cloud Consoleで「Authorized JavaScript origins」に <code>http://localhost:3000</code> を追加</p>
              <p>2. OAuth同意画面でテストユーザーを追加</p>
              <p>3. ブラウザのキャッシュをクリア（Ctrl+Shift+R）</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">✅</div>
          <div>
            <h3 className="font-medium text-green-800">連携完了</h3>
            <p className="text-sm text-green-700">
              <strong>{userProfile?.name || 'ユーザー'}</strong>さん（{userProfile?.email}）のGoogleカレンダーと連携しました
            </p>
            <p className="text-xs text-green-600 mt-1">
              ※ 正しいアカウントか確認してください
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          連携解除
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">
              {userProfile?.email}
            </span>
          </div>
          <span className="text-xs text-green-600">接続済み</span>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={calculateAndSetAvailability}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                計算中...
              </>
            ) : (
              '空き時間を再計算'
            )}
          </button>
          
          <button
            onClick={() => window.open('https://calendar.google.com', '_blank')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          >
            カレンダーを開く
          </button>
        </div>
      </div>
    </div>
  )
}