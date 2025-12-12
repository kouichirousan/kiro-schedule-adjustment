// Google Calendar API連携用のユーティリティ

interface GoogleCalendarEvent {
  id: string
  summary: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  status: string
}

interface TimeSlot {
  date: string
  time: string
}

// Google Calendar APIクライアントの初期化
export function initGoogleCalendarAPI() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      console.error('❌ ブラウザ環境ではありません')
      reject(new Error('Google Calendar API can only be used in browser'))
      return
    }

    console.log('🔧 Google API初期化開始...')

    // 既に初期化済みかチェック
    if (window.gapi?.client?.calendar && window.google?.accounts?.oauth2) {
      console.log('✅ Google APIは既に初期化済み')
      resolve({ gapi: window.gapi, google: window.google })
      return
    }

    // 重複読み込みを防ぐ
    const existingGapiScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]')
    const existingGisScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')

    let gapiLoaded = !!window.gapi
    let gisLoaded = !!window.google

    const checkBothLoaded = () => {
      console.log(`📊 読み込み状況: GAPI=${gapiLoaded}, GIS=${gisLoaded}`)
      if (gapiLoaded && gisLoaded) {
        console.log('🔧 Google APIクライアント初期化中...')
        
        // gapiが利用可能になるまで少し待つ
        const initWithRetry = (retryCount = 0) => {
          if (retryCount > 10) {
            reject(new Error('Google API初期化がタイムアウトしました'))
            return
          }
          
          if (window.gapi?.load) {
            console.log('🔧 gapi.loadを呼び出し中...')
            window.gapi.load('client', async () => {
              try {
                console.log('🔧 gapi.client.initを呼び出し中...')
                if (!window.gapi.client.calendar) {
                  await window.gapi.client.init({
                    apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
                  })
                }
                console.log('✅ Google APIクライアント初期化完了')
                resolve({ gapi: window.gapi, google: window.google })
              } catch (error) {
                console.error('❌ Google APIクライアント初期化失敗:', error)
                console.error('エラー詳細:', {
                  message: error instanceof Error ? error.message : 'Unknown error',
                  stack: error instanceof Error ? error.stack : 'No stack trace',
                  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? 'Set' : 'Not set'
                })
                reject(error)
              }
            })
          } else {
            console.log(`⏳ gapi.loadが利用できません。再試行中... (${retryCount + 1}/10)`)
            setTimeout(() => initWithRetry(retryCount + 1), 200)
          }
        }
        
        initWithRetry()
      }
    }

    // Google API スクリプトを読み込み（まだ読み込まれていない場合）
    if (!existingGapiScript && !window.gapi) {
      console.log('📥 Google APIスクリプト読み込み開始...')
      const gapiScript = document.createElement('script')
      gapiScript.src = 'https://apis.google.com/js/api.js'
      gapiScript.async = true
      gapiScript.defer = true
      gapiScript.onload = () => {
        console.log('✅ Google APIスクリプト読み込み完了')
        gapiLoaded = true
        checkBothLoaded()
      }
      gapiScript.onerror = (error) => {
        console.error('❌ Google APIスクリプト読み込み失敗:', error)
        reject(error)
      }
      document.head.appendChild(gapiScript)
    } else {
      gapiLoaded = true
    }

    // Google Identity Services スクリプトを読み込み（まだ読み込まれていない場合）
    if (!existingGisScript && !window.google) {
      console.log('📥 Google Identity Servicesスクリプト読み込み開始...')
      const gisScript = document.createElement('script')
      gisScript.src = 'https://accounts.google.com/gsi/client'
      gisScript.async = true
      gisScript.defer = true
      gisScript.onload = () => {
        console.log('✅ Google Identity Servicesスクリプト読み込み完了')
        gisLoaded = true
        checkBothLoaded()
      }
      gisScript.onerror = (error) => {
        console.error('❌ Google Identity Servicesスクリプト読み込み失敗:', error)
        reject(error)
      }
      document.head.appendChild(gisScript)
    } else {
      gisLoaded = true
    }

    // 両方とも既に読み込まれている場合
    if (gapiLoaded && gisLoaded) {
      checkBothLoaded()
    }
  })
}

// Googleアカウントでサインイン
export async function signInWithGoogle(): Promise<boolean> {
  try {
    console.log('🔐 Googleサインイン開始...')
    console.log('🔧 環境変数確認:')
    console.log('  - API Key:', process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? `設定済み (${process.env.NEXT_PUBLIC_GOOGLE_API_KEY.substring(0, 10)}...)` : '❌ 未設定')
    console.log('  - Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? `設定済み (${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 20)}...)` : '❌ 未設定')
    
    // 環境変数チェック
    if (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      console.error('❌ Google API設定が不完全です')
      return false
    }
    
    console.log('🔧 Google API初期化中...')
    await initGoogleCalendarAPI()
    console.log('✅ Google API初期化完了')
    
    // Google Identity Servicesが利用可能かチェック
    console.log('🔍 Google Identity Services確認中...')
    console.log('  - window.google:', !!window.google)
    console.log('  - window.google.accounts:', !!window.google?.accounts)
    console.log('  - window.google.accounts.oauth2:', !!window.google?.accounts?.oauth2)
    
    if (!window.google?.accounts?.oauth2) {
      console.error('❌ Google Identity Servicesが利用できません')
      console.error('利用可能なオブジェクト:', {
        google: !!window.google,
        accounts: !!window.google?.accounts,
        oauth2: !!window.google?.accounts?.oauth2
      })
      return false
    }
    
    console.log('✅ Google Identity Services利用可能')
    
    return new Promise((resolve) => {
      try {
        console.log('🔧 トークンクライアント作成中...')
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: (response: any) => {
            console.log('🔑 OAuth レスポンス:', response)
            if (response.error) {
              console.error('❌ トークンリクエスト失敗:', response.error)
              console.error('エラー詳細:', response.error_description)
              resolve(false)
            } else if (response.access_token) {
              console.log('✅ アクセストークン取得成功')
              try {
                // アクセストークンを設定
                window.gapi.client.setToken({ access_token: response.access_token })
                resolve(true)
              } catch (setTokenError) {
                console.error('❌ トークン設定エラー:', setTokenError)
                resolve(false)
              }
            } else {
              console.error('❌ 予期しないレスポンス:', response)
              resolve(false)
            }
          }
        })
        
        console.log('🚀 トークンリクエスト開始...')
        tokenClient.requestAccessToken({ prompt: 'consent' })
      } catch (tokenError) {
        console.error('❌ トークンクライアント作成エラー:', tokenError)
        resolve(false)
      }
    })
  } catch (error) {
    console.error('❌ Googleサインイン失敗:', error)
    return false
  }
}

// Googleアカウントからサインアウト
export async function signOutFromGoogle(): Promise<void> {
  try {
    const token = window.gapi.client.getToken()
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token)
      window.gapi.client.setToken(null)
    }
  } catch (error) {
    console.error('Google sign-out failed:', error)
  }
}

// サインイン状態をチェック
export async function isSignedIn(): Promise<boolean> {
  try {
    await initGoogleCalendarAPI()
    const token = window.gapi.client.getToken()
    return token !== null && token.access_token !== undefined
  } catch (error) {
    console.error('Failed to check sign-in status:', error)
    return false
  }
}

// 指定期間のカレンダーイベントを取得
export async function getCalendarEvents(
  startDate: string,
  endDate: string
): Promise<GoogleCalendarEvent[]> {
  try {
    await initGoogleCalendarAPI()
    
    if (!await isSignedIn()) {
      throw new Error('Not signed in to Google')
    }

    // 検索範囲を少し広げる（前後1日）
    const searchStartDate = new Date(startDate)
    searchStartDate.setDate(searchStartDate.getDate() - 1)
    const searchEndDate = new Date(endDate)
    searchEndDate.setDate(searchEndDate.getDate() + 1)
    
    const timeMin = searchStartDate.toISOString()
    const timeMax = searchEndDate.toISOString()
    
    console.log('=== Google Calendar API デバッグ情報 ===')
    console.log('検索期間:', { startDate, endDate, timeMin, timeMax })

    // まずカレンダーリストを取得
    console.log('📋 カレンダーリストを取得中...')
    const calendarListResponse = await window.gapi.client.calendar.calendarList.list()
    console.log('📋 カレンダーリスト取得完了')
    console.log('利用可能なカレンダー数:', calendarListResponse.result.items?.length || 0)
    console.log('カレンダーリスト全体:', calendarListResponse.result)

    const allEvents: GoogleCalendarEvent[] = []
    const calendars = calendarListResponse.result.items || []

    console.log('🔍 各カレンダーの詳細情報:')
    calendars.forEach((calendar, index) => {
      console.log(`${index + 1}. ${calendar.summary || 'No Name'}`, {
        id: calendar.id,
        selected: calendar.selected,
        primary: calendar.primary,
        accessRole: calendar.accessRole,
        backgroundColor: calendar.backgroundColor,
        hidden: calendar.hidden,
        deleted: calendar.deleted
      })
    })

    // 「本多晃一朗」のカレンダーのみを取得
    console.log('🎯 本多晃一朗のカレンダーのみからイベントを取得します')
    
    for (const calendar of calendars) {
      // プライマリカレンダー（本多晃一朗）または「本多晃一朗」という名前のカレンダーのみを対象
      const isTargetCalendar = calendar.primary === true || 
                              calendar.summary?.includes('本多晃一朗') ||
                              calendar.summary?.includes('本多') ||
                              calendar.id === 'primary'
      
      if (isTargetCalendar && calendar.accessRole && calendar.accessRole !== 'freeBusyReader' && !calendar.deleted) {
        try {
          console.log(`📅 本多晃一朗のカレンダー "${calendar.summary}" からイベントを取得中...`)
          console.log(`   カレンダーID: ${calendar.id}`)
          console.log(`   アクセス権限: ${calendar.accessRole}`)
          console.log(`   プライマリ: ${calendar.primary}`)
          
          const calendarResponse = await window.gapi.client.calendar.events.list({
            calendarId: calendar.id,
            timeMin,
            timeMax,
            showDeleted: false,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 250
          })

          const eventCount = calendarResponse.result.items?.length || 0
          console.log(`✅ ${calendar.summary}: ${eventCount}件のイベント`)

          if (calendarResponse.result.items) {
            allEvents.push(...calendarResponse.result.items)
            
            calendarResponse.result.items.forEach((event, index) => {
              console.log(`  ${index + 1}. ${event.summary}`, {
                start: event.start,
                end: event.end,
                status: event.status,
                calendar: calendar.summary
              })
            })
          }
        } catch (error) {
          console.error(`❌ カレンダー "${calendar.summary}" からのイベント取得に失敗:`, error)
        }
      } else {
        console.log(`⏭️  ${calendar.summary}: 本多晃一朗のカレンダーではないためスキップ`)
      }
    }

    console.log('=== 最終結果（本多晃一朗のカレンダーのみ） ===')
    console.log('取得イベント数:', allEvents.length)
    console.log('イベント詳細:', allEvents)
    console.log('================================================')

    return allEvents
  } catch (error) {
    console.error('カレンダーイベントの取得に失敗:', error)
    throw error
  }
}

// 空き時間を自動計算
export async function calculateAvailability(
  candidateSlots: TimeSlot[],
  duration: number = 60
): Promise<{ [key: string]: boolean }> {
  try {
    if (candidateSlots.length === 0) {
      return {}
    }

    // 候補期間の開始日と終了日を取得
    const dates = candidateSlots.map(slot => slot.date)
    const startDate = dates.sort()[0]
    const endDate = dates.sort()[dates.length - 1]

    // Googleカレンダーのイベントを取得
    const events = await getCalendarEvents(startDate, endDate)

    const availability: { [key: string]: boolean } = {}

    candidateSlots.forEach(slot => {
      const slotId = `${slot.date}-${slot.time}`
      const slotStart = new Date(`${slot.date}T${slot.time}:00`)
      const slotEnd = new Date(slotStart.getTime() + duration * 60000)

      let hasConflict = false
      
      for (const event of events) {
        if (event.status === 'cancelled') continue

        let eventStart: Date
        let eventEnd: Date

        if (event.start?.dateTime) {
          eventStart = new Date(event.start.dateTime)
        } else if (event.start?.date) {
          eventStart = new Date(event.start.date + 'T00:00:00')
        } else {
          continue
        }

        if (event.end?.dateTime) {
          eventEnd = new Date(event.end.dateTime)
        } else if (event.end?.date) {
          eventEnd = new Date(event.end.date + 'T23:59:59')
        } else {
          continue
        }

        // 重複チェック
        if (slotStart < eventEnd && slotEnd > eventStart) {
          hasConflict = true
          break
        }
      }

      availability[slotId] = !hasConflict
    })

    return availability
  } catch (error) {
    console.error('Failed to calculate availability:', error)
    
    // エラーの場合は全て利用不可として返す
    const availability: { [key: string]: boolean } = {}
    candidateSlots.forEach(slot => {
      availability[`${slot.date}-${slot.time}`] = false
    })
    return availability
  }
}

// ユーザーのプロフィール情報を取得
export async function getUserProfile() {
  try {
    await initGoogleCalendarAPI()
    
    if (!await isSignedIn()) {
      throw new Error('Googleにサインインしていません')
    }

    const token = window.gapi.client.getToken()
    if (!token || !token.access_token) {
      throw new Error('アクセストークンが見つかりません')
    }

    console.log('ユーザープロフィール取得中...')
    console.log('使用中のアクセストークン:', token.access_token.substring(0, 20) + '...')
    
    // 複数の方法でユーザー情報を取得を試行
    let userInfo = null
    let profile = null

    // 方法1: OAuth2 v2 API
    try {
      console.log('📞 OAuth2 v2 APIでユーザー情報取得を試行...')
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token.access_token}`
        }
      })
      
      if (response.ok) {
        userInfo = await response.json()
        console.log('✅ OAuth2 v2 APIで取得成功:', userInfo)
      } else {
        console.log('❌ OAuth2 v2 API失敗:', response.status, response.statusText)
      }
    } catch (error) {
      console.log('❌ OAuth2 v2 API例外:', error)
    }

    // 方法2: OAuth2 v1 API (フォールバック)
    if (!userInfo) {
      try {
        console.log('📞 OAuth2 v1 APIでユーザー情報取得を試行...')
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: {
            'Authorization': `Bearer ${token.access_token}`
          }
        })
        
        if (response.ok) {
          userInfo = await response.json()
          console.log('✅ OAuth2 v1 APIで取得成功:', userInfo)
        } else {
          console.log('❌ OAuth2 v1 API失敗:', response.status, response.statusText)
        }
      } catch (error) {
        console.log('❌ OAuth2 v1 API例外:', error)
      }
    }

    // 方法3: カレンダーAPIから推測 (最後の手段)
    if (!userInfo) {
      try {
        console.log('📞 カレンダーAPIからユーザー情報を推測...')
        const calendarResponse = await window.gapi.client.calendar.calendarList.list()
        const primaryCalendar = calendarResponse.result.items?.find((cal: any) => cal.primary)
        
        if (primaryCalendar) {
          // プライマリカレンダーの情報からユーザー情報を推測
          userInfo = {
            email: primaryCalendar.id,
            name: primaryCalendar.summary || 'ユーザー',
            id: primaryCalendar.id
          }
          console.log('✅ カレンダーAPIから推測成功:', userInfo)
        }
      } catch (error) {
        console.log('❌ カレンダーAPI推測失敗:', error)
      }
    }

    if (userInfo) {
      profile = {
        id: userInfo.id || userInfo.email || 'unknown',
        name: userInfo.name || userInfo.given_name || userInfo.summary || 'ユーザー',
        email: userInfo.email || 'unknown@example.com',
        imageUrl: userInfo.picture || null
      }
      
      console.log('✅ 整形後のプロフィール:', profile)
      return profile
    } else {
      // 全ての方法が失敗した場合のフォールバック
      console.log('⚠️ ユーザー情報取得に失敗、デフォルト値を使用')
      return {
        id: 'unknown',
        name: 'ユーザー',
        email: 'user@example.com',
        imageUrl: null
      }
    }
  } catch (error) {
    console.error('ユーザープロフィールの取得に失敗:', error)
    
    // エラーの場合もデフォルト値を返す
    return {
      id: 'unknown',
      name: 'ユーザー',
      email: 'user@example.com',
      imageUrl: null
    }
  }
}

// 時間帯候補を生成するヘルパー関数
export function generateTimeSlots(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const startHour = parseInt(startTime.split(':')[0])
  const endHour = parseInt(endTime.split(':')[0])
  
  const currentDate = new Date(start)
  while (currentDate <= end) {
    const dateString = currentDate.toISOString().split('T')[0]
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({
        date: dateString,
        time: `${hour.toString().padStart(2, '0')}:00`
      })
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return slots
}

// 型定義の拡張
declare global {
  interface Window {
    gapi: any
    google: any
  }
}