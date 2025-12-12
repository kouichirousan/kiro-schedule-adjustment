'use client'

import { useState, useEffect } from 'react'

interface Participant {
  id: string
  name: string
  email: string
  submittedAt: string
}

interface TimeSlot {
  date: string
  time: string
}

interface Availability {
  participantId: string
  timeSlotId: string
  available: boolean
}

interface EventData {
  id: string
  title: string
  description: string
  duration: number
  dateRange: {
    startDate: string
    endDate: string
    startTime: string
    endTime: string
  }
}

interface EventResultViewProps {
  eventId: string
  onBack: () => void
}

export default function EventResultView({ eventId, onBack }: EventResultViewProps) {
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')

  // イベントデータを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📊 結果画面データ取得開始:', eventId)
        
        // イベント情報を取得
        const eventResponse = await fetch(`/api/events/${eventId}`)
        console.log('📊 イベント情報レスポンス:', eventResponse.status)
        
        if (eventResponse.ok) {
          const eventResult = await eventResponse.json()
          console.log('📊 イベント情報:', eventResult)
          
          if (eventResult.success && eventResult.event) {
            // APIレスポンスの構造に合わせてデータを変換
            const event = eventResult.event
            setEventData({
              id: event.id,
              title: event.title,
              description: event.description || '',
              duration: event.duration || 60,
              dateRange: {
                startDate: event.start_date,
                endDate: event.end_date,
                startTime: event.start_time || '09:00',
                endTime: event.end_time || '18:00'
              }
            })
          }
        } else {
          console.error('❌ イベント情報取得失敗:', eventResponse.status)
        }

        // 参加者と空き状況を取得
        const participantsResponse = await fetch(`/api/events/${eventId}/participants`)
        console.log('📊 参加者情報レスポンス:', participantsResponse.status)
        
        if (participantsResponse.ok) {
          const participantsResult = await participantsResponse.json()
          console.log('📊 参加者情報:', participantsResult)
          
          if (participantsResult.success) {
            setParticipants(participantsResult.participants || [])
            setAvailabilities(participantsResult.availabilities || [])
            
            // デバッグ情報
            console.log('📊 参加者データ:', participantsResult.participants)
            console.log('📊 空き状況データ:', participantsResult.availabilities)
            console.log('📊 空き状況サンプル:', participantsResult.availabilities?.[0])
          }
        } else {
          console.error('❌ 参加者情報取得失敗:', participantsResponse.status)
        }
      } catch (error) {
        console.error('❌ データの取得に失敗しました:', error)
      }
    }

    if (eventId) {
      fetchData()
    }
  }, [eventId])

  // 候補時間帯を生成
  const generateTimeSlots = (): TimeSlot[] => {
    if (!eventData) return []
    
    const slots: TimeSlot[] = []
    const startDate = new Date(eventData.dateRange.startDate)
    const endDate = new Date(eventData.dateRange.endDate)
    
    const dates = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    const times = []
    const startHour = parseInt(eventData.dateRange.startTime.split(':')[0])
    const endHour = parseInt(eventData.dateRange.endTime.split(':')[0])
    
    for (let hour = startHour; hour < endHour; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    
    dates.forEach(date => {
      times.forEach(time => {
        slots.push({ date, time })
      })
    })
    
    return slots
  }

  const getAvailabilityCount = (timeSlotId: string) => {
    // データ構造の違いに対応（time_slot_id または timeSlotId）
    const count = availabilities.filter(a => 
      (a.time_slot_id === timeSlotId || (a as any).timeSlotId === timeSlotId) && a.available
    ).length
    console.log(`📊 時間帯 ${timeSlotId} の参加可能人数: ${count}`)
    return count
  }

  const getAvailabilityColor = (count: number, total: number) => {
    const ratio = count / total
    if (ratio === 1) return 'bg-green-500'
    if (ratio >= 0.7) return 'bg-green-400'
    if (ratio >= 0.4) return 'bg-yellow-400'
    if (ratio > 0) return 'bg-red-400'
    return 'bg-gray-200'
  }

  const getParticipantsForTimeSlot = (timeSlotId: string) => {
    // データ構造の違いに対応
    const availableParticipants = availabilities
      .filter(a => 
        (a.time_slot_id === timeSlotId || (a as any).timeSlotId === timeSlotId) && a.available
      )
      .map(a => participants.find(p => p.id === (a.participant_id || (a as any).participantId)))
      .filter(Boolean)
    
    const unavailableParticipants = availabilities
      .filter(a => 
        (a.time_slot_id === timeSlotId || (a as any).timeSlotId === timeSlotId) && !a.available
      )
      .map(a => participants.find(p => p.id === (a.participant_id || (a as any).participantId)))
      .filter(Boolean)
    
    return { availableParticipants, unavailableParticipants }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getBestTimeSlots = () => {
    const timeSlots = generateTimeSlots()
    const slotsWithCounts = timeSlots.map(slot => {
      const timeSlotId = `${slot.date}-${slot.time}`
      const count = getAvailabilityCount(timeSlotId)
      return { ...slot, timeSlotId, count }
    })
    
    return slotsWithCounts
      .filter(slot => slot.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">結果を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                日程調整結果
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {participants.length}人が回答済み
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 完了メッセージ */}
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">✅</div>
            <div>
              <h2 className="text-lg font-semibold text-green-800">回答を送信しました！</h2>
              <p className="text-green-700">
                あなたの空き状況が正常に登録されました。他の参加者の回答状況を確認できます。
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メイン結果 */}
          <div className="lg:col-span-2 space-y-6">
            {/* イベント情報 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{eventData.title}</h3>
              <p className="text-gray-600 mb-4">{eventData.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">期間:</span>
                  <span className="text-gray-600 ml-2">
                    {formatDate(eventData.dateRange.startDate)} 〜 {formatDate(eventData.dateRange.endDate)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">所要時間:</span>
                  <span className="text-gray-600 ml-2">{eventData.duration}分</span>
                </div>
              </div>
            </div>

            {/* 推奨時間帯 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">推奨時間帯 TOP5</h3>
              <div className="space-y-3">
                {getBestTimeSlots().map((slot, index) => {
                  const { availableParticipants } = getParticipantsForTimeSlot(slot.timeSlotId)
                  return (
                    <div key={slot.timeSlotId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatDate(slot.date)} {slot.time}
                          </div>
                          <div className="text-sm text-gray-600">
                            {slot.count}/{participants.length}人が参加可能
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                          getAvailabilityColor(slot.count, participants.length)
                        }`}>
                          {Math.round((slot.count / participants.length) * 100)}%
                        </div>
                        <button
                          onClick={() => setSelectedTimeSlot(slot.timeSlotId)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          詳細
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 全体マトリックス */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">全体の空き状況</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b border-gray-200 w-20">時間</th>
                      {Array.from(new Set(generateTimeSlots().map(slot => slot.date))).map(date => (
                        <th key={date} className="text-center p-2 border-b border-gray-200 min-w-28">
                          {formatDate(date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(generateTimeSlots().map(slot => slot.time))).map(time => (
                      <tr key={time}>
                        <td className="p-2 border-b border-gray-100 font-medium text-sm">
                          {time}
                        </td>
                        {Array.from(new Set(generateTimeSlots().map(slot => slot.date))).map(date => {
                          const timeSlotId = `${date}-${time}`
                          const availableCount = getAvailabilityCount(timeSlotId)
                          const totalCount = participants.length
                          const { availableParticipants, unavailableParticipants } = getParticipantsForTimeSlot(timeSlotId)
                          
                          return (
                            <td key={timeSlotId} className="p-1 border-b border-gray-100 relative group">
                              <div 
                                className={`w-full h-8 rounded flex items-center justify-center text-xs font-medium text-white cursor-pointer transition-all duration-200 ${
                                  getAvailabilityColor(availableCount, totalCount)
                                } hover:scale-105 hover:shadow-md`}
                              >
                                {availableCount}/{totalCount}
                              </div>
                              
                              {/* ツールチップ */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 min-w-56 max-w-xs">
                                <div className="space-y-3">
                                  <div className="border-b border-gray-700 pb-2">
                                    <div className="font-semibold text-white">
                                      {formatDate(date)} {time}
                                    </div>
                                    <div className="text-gray-300 text-xs">
                                      {availableCount}/{totalCount}人が参加可能
                                    </div>
                                  </div>
                                  
                                  {availableParticipants.length > 0 && (
                                    <div>
                                      <div className="flex items-center space-x-1 mb-2">
                                        <span className="text-green-400">✅</span>
                                        <span className="font-semibold text-green-300">
                                          参加可能 ({availableParticipants.length}人)
                                        </span>
                                      </div>
                                      <div className="space-y-1 ml-4">
                                        {availableParticipants.map(participant => (
                                          <div key={participant?.id} className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                            <span className="text-xs">{participant?.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {unavailableParticipants.length > 0 && (
                                    <div>
                                      <div className="flex items-center space-x-1 mb-2">
                                        <span className="text-red-400">❌</span>
                                        <span className="font-semibold text-red-300">
                                          参加不可 ({unavailableParticipants.length}人)
                                        </span>
                                      </div>
                                      <div className="space-y-1 ml-4">
                                        {unavailableParticipants.map(participant => (
                                          <div key={participant?.id} className="flex items-center space-x-2 opacity-75">
                                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                            <span className="text-xs">{participant?.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 参加者一覧 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">参加者 ({participants.length}人)</h3>
              <div className="space-y-2">
                {participants.map(participant => (
                  <div key={participant.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                    <div>
                      <div className="font-medium text-sm">{participant.name}</div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(participant.submittedAt)}
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="回答済み"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* 統計 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">統計</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">回答率:</span>
                  <span className="font-semibold">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">候補時間数:</span>
                  <span className="font-semibold">{generateTimeSlots().length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最適な時間帯:</span>
                  <span className="font-semibold">{getBestTimeSlots().length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}