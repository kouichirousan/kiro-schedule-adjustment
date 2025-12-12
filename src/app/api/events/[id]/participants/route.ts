import { NextRequest, NextResponse } from 'next/server'
import { EventsDB, ParticipantsDB, AvailabilitiesDB } from '@/lib/sqlite-operations'
import { generateId } from '@/lib/sqlite-db'
import type { Participant, Availability } from '@/lib/sqlite-db'
import { ErrorHandler, ErrorCode, generateRequestId } from '@/lib/error-handler'

// 参加者の空き状況登録 (POST)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = generateRequestId()
  let userId: string | undefined

  try {
    const eventId = params.id
    console.log(`🔍 [${requestId}] 参加者登録開始: ${eventId}`)
    
    const body = await request.json()
    
    // イベントの存在確認
    const event = EventsDB.getById(eventId)
    if (!event) {
      const error = ErrorHandler.createError(
        ErrorCode.EVENT_NOT_FOUND,
        `Event not found: ${eventId}`,
        'イベントが見つかりません',
        { eventId, requestId }
      )
      return NextResponse.json(
        { success: false, error: error.userMessage, code: error.code },
        { status: 404 }
      )
    }
    
    // バリデーション
    if (!body.name || !body.email) {
      const error = ErrorHandler.handleValidationError(
        'name/email', 
        { name: body.name, email: body.email }, 
        'required'
      )
      return NextResponse.json(
        { success: false, error: error.userMessage, code: error.code },
        { status: 400 }
      )
    }
    
    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      const error = ErrorHandler.handleValidationError('email', body.email, 'email')
      return NextResponse.json(
        { success: false, error: 'メールアドレスの形式が正しくありません' },
        { status: 400 }
      )
    }
    
    // セッションからユーザー情報を取得
    const sessionToken = request.cookies.get('user-session')?.value
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'セッションが無効です' },
        { status: 401 }
      )
    }
    
    const { AuthHelper } = await import('@/lib/user-management')
    const currentUser = AuthHelper.validateSession(sessionToken)
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'セッションが無効です' },
        { status: 401 }
      )
    }
    
    // 重複回答チェック
    if (AuthHelper.checkDuplicateParticipation(currentUser.id, eventId)) {
      return NextResponse.json(
        { success: false, error: 'このイベントには既に回答済みです' },
        { status: 409 }
      )
    }
    
    // 既存の参加者をチェック（同じメールアドレス）
    let existingParticipant = ParticipantsDB.findByEmailAndEventId(currentUser.id, eventId)
    let participant: Participant
    
    if (existingParticipant) {
      // 既存の参加者を更新
      participant = ParticipantsDB.update(existingParticipant.id, {
        name: currentUser.name,
        submitted_at: new Date().toISOString()
      })!
      
      // 既存の空き状況を削除
      AvailabilitiesDB.deleteByParticipantId(existingParticipant.id)
    } else {
      // 新しい参加者を作成
      participant = ParticipantsDB.create({
        event_id: eventId,
        name: currentUser.name,
        email: currentUser.id, // ユーザーIDを使用
        submitted_at: new Date().toISOString()
      })
    }
    
    // 空き状況を登録
    const availabilities: Availability[] = []
    if (body.availability && typeof body.availability === 'object') {
      Object.entries(body.availability).forEach(([timeSlotId, available]) => {
        if (typeof available === 'boolean') {
          availabilities.push({
            event_id: eventId,
            participant_id: participant.id,
            time_slot_id: timeSlotId,
            available,
            created_at: new Date().toISOString()
          })
        }
      })
      
      if (availabilities.length > 0) {
        AvailabilitiesDB.createBatch(availabilities)
      }
    }
    
    return NextResponse.json({
      success: true,
      participant,
      availabilities,
      message: existingParticipant ? '参加者情報が正常に更新されました' : '参加者が正常に登録されました'
    }, { status: existingParticipant ? 200 : 201 })
  } catch (error) {
    console.error('Participant registration error:', error)
    return NextResponse.json(
      { success: false, error: '参加者の登録に失敗しました' },
      { status: 500 }
    )
  }
}

// 参加者一覧取得 (GET)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    
    // イベントの存在確認
    const event = EventsDB.getById(eventId)
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'イベントが見つかりません' },
        { status: 404 }
      )
    }
    
    const participants = ParticipantsDB.getByEventId(eventId)
    const availabilities = AvailabilitiesDB.getByEventId(eventId)
    
    // 参加者ごとの統計を計算
    const participantStats = participants.map(participant => {
      const participantAvailabilities = availabilities.filter(a => a.participantId === participant.id)
      const availableSlots = participantAvailabilities.filter(a => a.available).length
      const totalSlots = participantAvailabilities.length
      
      return {
        ...participant,
        stats: {
          totalSlots,
          availableSlots,
          availabilityRate: totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      participants: participantStats,
      availabilities,
      summary: {
        totalParticipants: participants.length,
        totalAvailabilities: availabilities.length,
        averageAvailabilityRate: participantStats.length > 0 
          ? Math.round(participantStats.reduce((sum, p) => sum + p.stats.availabilityRate, 0) / participantStats.length)
          : 0
      }
    })
  } catch (error) {
    console.error('Participants fetch error:', error)
    return NextResponse.json(
      { success: false, error: '参加者情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}