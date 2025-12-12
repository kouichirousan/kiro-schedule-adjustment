import { NextRequest, NextResponse } from 'next/server'

// 仮のデータストレージ
let participants: any[] = []
let availabilities: any[] = []

// 空き状況分析 (GET)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    
    const eventParticipants = participants.filter(p => p.eventId === eventId)
    const eventAvailabilities = availabilities.filter(a => a.eventId === eventId)
    
    // 時間帯ごとの空き状況を集計
    const timeSlotAnalysis: { [key: string]: any } = {}
    
    eventAvailabilities.forEach(availability => {
      if (!timeSlotAnalysis[availability.timeSlotId]) {
        timeSlotAnalysis[availability.timeSlotId] = {
          timeSlotId: availability.timeSlotId,
          availableCount: 0,
          unavailableCount: 0,
          totalParticipants: eventParticipants.length,
          availableParticipants: [],
          unavailableParticipants: []
        }
      }
      
      const participant = eventParticipants.find(p => p.id === availability.participantId)
      
      if (availability.available) {
        timeSlotAnalysis[availability.timeSlotId].availableCount++
        timeSlotAnalysis[availability.timeSlotId].availableParticipants.push(participant)
      } else {
        timeSlotAnalysis[availability.timeSlotId].unavailableCount++
        timeSlotAnalysis[availability.timeSlotId].unavailableParticipants.push(participant)
      }
    })
    
    // 推奨時間帯を計算（参加可能人数が多い順）
    const recommendedTimeSlots = Object.values(timeSlotAnalysis)
      .filter((slot: any) => slot.availableCount > 0)
      .sort((a: any, b: any) => {
        // 参加可能人数で降順ソート
        if (b.availableCount !== a.availableCount) {
          return b.availableCount - a.availableCount
        }
        // 参加可能人数が同じ場合は、参加率で降順ソート
        const ratioA = a.availableCount / a.totalParticipants
        const ratioB = b.availableCount / b.totalParticipants
        return ratioB - ratioA
      })
      .slice(0, 10) // 上位10件
    
    // 統計情報を計算
    const statistics = {
      totalParticipants: eventParticipants.length,
      totalTimeSlots: Object.keys(timeSlotAnalysis).length,
      responseRate: eventParticipants.length > 0 ? 100 : 0, // 仮で100%
      bestTimeSlot: recommendedTimeSlots[0] || null,
      averageAvailability: Object.values(timeSlotAnalysis).reduce(
        (sum: number, slot: any) => sum + (slot.availableCount / slot.totalParticipants), 0
      ) / Object.keys(timeSlotAnalysis).length || 0
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        timeSlots: timeSlotAnalysis,
        recommended: recommendedTimeSlots,
        statistics
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to analyze availability' },
      { status: 500 }
    )
  }
}