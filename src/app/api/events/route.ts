import { NextRequest, NextResponse } from 'next/server'
import { EventsDB } from '@/lib/sqlite-operations'
import { generateId } from '@/lib/sqlite-db'
import type { Event } from '@/lib/sqlite-db'

// イベント作成 (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 API受信データ:', body)
    
    // バリデーション
    if (!body.title || !body.dateRange) {
      console.log('❌ バリデーションエラー:', { title: body.title, dateRange: body.dateRange })
      return NextResponse.json(
        { success: false, error: 'タイトルと日程範囲は必須です' },
        { status: 400 }
      )
    }
    
    const newEventData = {
      title: body.title,
      description: body.description || '',
      duration: body.duration || 60,
      start_date: body.dateRange.startDate,
      end_date: body.dateRange.endDate,
      start_time: body.dateRange.startTime || '09:00',
      end_time: body.dateRange.endTime || '18:00',
      created_at: new Date().toISOString(),
      created_by: body.createdBy || 'anonymous',
      status: 'active' as const
    }
    
    console.log('📝 作成するイベントデータ:', newEventData)
    
    const createdEvent = EventsDB.create(newEventData)
    
    console.log('✅ 作成されたイベント:', createdEvent)
    
    const response = {
      success: true,
      event: createdEvent,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/event/${createdEvent.id}`,
      adminUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/event/${createdEvent.id}/admin`
    }
    
    console.log('📤 API送信レスポンス:', response)
    
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Event creation error:', error)
    return NextResponse.json(
      { success: false, error: 'イベントの作成に失敗しました' },
      { status: 500 }
    )
  }
}

// イベント一覧取得 (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const createdBy = searchParams.get('createdBy')
    const userId = searchParams.get('userId') // 関係者フィルタ用
    
    let events = EventsDB.getAll()
    
    // 関係者フィルタ（作成者または参加者）
    if (userId) {
      events = EventsDB.getByUserId(userId)
    }
    
    // その他のフィルタリング
    if (status) {
      events = events.filter(event => event.status === status)
    }
    
    if (createdBy) {
      events = events.filter(event => event.createdBy === createdBy)
    }
    
    // SQLiteでは既にソート済み
    
    return NextResponse.json({
      success: true,
      events: events,
      total: events.length
    })
  } catch (error) {
    console.error('Events fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'イベント一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}