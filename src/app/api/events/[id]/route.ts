import { NextRequest, NextResponse } from 'next/server'
import { EventsDB, ParticipantsDB, AvailabilitiesDB } from '@/lib/sqlite-operations'

// 特定のイベント情報取得 (GET)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    const event = EventsDB.getById(eventId)
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }
    
    // 参加者データを取得
    const participants = ParticipantsDB.getByEventId(eventId)
    
    // 空き状況データを取得
    const availabilities = AvailabilitiesDB.getByEventId(eventId)
    
    // 統計情報を計算
    const stats = {
      totalParticipants: participants.length,
      responseRate: participants.length > 0 ? 100 : 0, // 簡易計算
      totalTimeSlots: calculateTotalTimeSlots(event),
      bestTimeSlots: calculateBestTimeSlots(availabilities, participants.length)
    }
    
    return NextResponse.json({
      success: true,
      event,
      participants,
      availabilities,
      stats
    })
  } catch (error) {
    console.error('Event fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'イベントの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// イベント更新 (PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    const body = await request.json()
    
    const event = EventsDB.getById(eventId)
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }
    
    // バリデーション
    const allowedFields = ['title', 'description', 'duration', 'dateRange', 'status']
    const updates = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = body[key]
        return obj
      }, {} as any)
    
    const updatedEvent = EventsDB.update(eventId, updates)
    
    return NextResponse.json({
      success: true,
      event: updatedEvent
    })
  } catch (error) {
    console.error('Event update error:', error)
    return NextResponse.json(
      { success: false, error: 'イベントの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// イベント削除 (DELETE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    
    const event = EventsDB.getById(eventId)
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }
    
    // イベントと関連データを削除
    const deleted = EventsDB.delete(eventId)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'イベントの削除に失敗しました' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'イベントと関連データが正常に削除されました'
    })
  } catch (error) {
    console.error('Event deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'イベントの削除に失敗しました' },
      { status: 500 }
    )
  }
}

// ヘルパー関数
function calculateTotalTimeSlots(event: any): number {
  const startDate = new Date(event.start_date)
  const endDate = new Date(event.end_date)
  const startHour = parseInt(event.start_time.split(':')[0])
  const endHour = parseInt(event.end_time.split(':')[0])
  
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const hoursPerDay = endHour - startHour
  
  return days * hoursPerDay
}

function calculateBestTimeSlots(availabilities: any[], totalParticipants: number) {
  if (totalParticipants === 0) return []
  
  const timeSlotCounts: { [key: string]: number } = {}
  
  availabilities.forEach(availability => {
    if (availability.available) {
      timeSlotCounts[availability.time_slot_id] = (timeSlotCounts[availability.time_slot_id] || 0) + 1
    }
  })
  
  return Object.entries(timeSlotCounts)
    .map(([timeSlotId, count]) => ({
      timeSlotId,
      availableCount: count,
      percentage: Math.round((count / totalParticipants) * 100)
    }))
    .sort((a, b) => b.availableCount - a.availableCount)
    .slice(0, 5)
}