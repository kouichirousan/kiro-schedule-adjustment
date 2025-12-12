import { NextRequest, NextResponse } from 'next/server'

// Google Calendar APIのプロキシエンドポイント
// セキュリティ上の理由で、サーバーサイドでAPIキーを管理する場合に使用

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken, timeMin, timeMax } = body
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      )
    }
    
    // Google Calendar APIを呼び出し
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: timeMin,
        timeMax: timeMax,
        showDeleted: 'false',
        singleEvents: 'true',
        orderBy: 'startTime'
      }),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      events: data.items || []
    })
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}

// カレンダー情報取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('accessToken')
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      )
    }
    
    // ユーザーのカレンダー一覧を取得
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      calendars: data.items || []
    })
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendars' },
      { status: 500 }
    )
  }
}