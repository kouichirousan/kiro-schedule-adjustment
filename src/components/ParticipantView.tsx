'use client'

import { useState, useEffect } from 'react'
import GoogleCalendarIntegration from './GoogleCalendarIntegration'
// User type definition
interface User {
  id: string
  name: string
  email?: string
}

// 全体の空き状況マトリックスコンポーネント
interface AvailabilityMatrixProps {
  eventData: any
  participants: any[]
  availabilities: any[]
}

function AvailabilityMatrix({ eventData, participants, availabilities }: AvailabilityMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    timeSlotId: string
    x: number
    y: number
    availableParticipants: any[]
    unavailableParticipants: any[]
  } | null>(null)
  // 日付と時間のリストを生成
  const generateDatesAndTimes = () => {
    const dates = []
    const startDate = new Date(eventData.dateRange.startDate)
    const endDate = new Date(eventData.dateRange.endDate)
    
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
    
    return { dates, times }
  }

  const { dates, times } = generateDatesAndTimes()

  // 各時間帯の参加可能人数を計算
  const getAvailabilityCount = (timeSlotId: string) => {
    return availabilities.filter(a => a.timeSlotId === timeSlotId && a.available).length
  }

  // 各時間帯の参加可能な人の名前を取得
  const getAvailableParticipants = (timeSlotId: string) => {
    const availableParticipantIds = availabilities
      .filter(a => a.timeSlotId === timeSlotId && a.available)
      .map(a => a.participantId)
    
    return participants.filter(p => availableParticipantIds.includes(p.id))
  }

  // 各時間帯の参加不可な人の名前を取得
  const getUnavailableParticipants = (timeSlotId: string) => {
    const unavailableParticipantIds = availabilities
      .filter(a => a.timeSlotId === timeSlotId && !a.available)
      .map(a => a.participantId)
    
    return participants.filter(p => unavailableParticipantIds.includes(p.id))
  }

  // 参加可能率に基づく色を取得
  const getAvailabilityColor = (count: number, total: number) => {
    if (total === 0) return 'bg-gray-100 text-gray-400'
    const rate = count / total
    if (rate >= 0.8) return 'bg-green-500 text-white'
    if (rate >= 0.6) return 'bg-green-400 text-white'
    if (rate >= 0.4) return 'bg-yellow-400 text-gray-900'
    if (rate >= 0.2) return 'bg-orange-400 text-white'
    return 'bg-red-400 text-white'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-3 border-b border-gray-200 w-20 text-sm font-medium text-gray-700">
              時間
            </th>
            {dates.map(date => (
              <th key={date} className="text-center p-3 border-b border-gray-200 min-w-24 text-sm font-medium text-gray-700">
                {formatDate(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map(time => (
            <tr key={time}>
              <td className="p-3 border-b border-gray-100 font-medium text-sm text-gray-600">
                {time}
              </td>
              {dates.map(date => {
                const timeSlotId = `${date}-${time}`
                const availableCount = getAvailabilityCount(timeSlotId)
                const totalParticipants = participants.length
                
                return (
                  <td key={timeSlotId} className="p-1 border-b border-gray-100 relative">
                    <div
                      className={`w-full h-10 rounded-md border flex items-center justify-center text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 ${
                        getAvailabilityColor(availableCount, totalParticipants)
                      }`}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const availableParticipants = getAvailableParticipants(timeSlotId)
                        const unavailableParticipants = getUnavailableParticipants(timeSlotId)
                        
                        setHoveredCell({
                          timeSlotId,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10,
                          availableParticipants,
                          unavailableParticipants
                        })
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {availableCount}/{totalParticipants}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>80%以上参加可能</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span>40-60%参加可能</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span>20%未満参加可能</span>
          </div>
        </div>
        <div>
          数字は「参加可能人数/総参加者数」を表示
        </div>
      </div>

      {/* カスタムツールチップ */}
      {hoveredCell && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-xs"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <div className="text-sm font-medium text-gray-900 mb-2">
            {formatDate(hoveredCell.timeSlotId.split('-')[0])} {hoveredCell.timeSlotId.split('-')[1]}
          </div>
          
          {hoveredCell.availableParticipants.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-green-700 mb-1">
                ✅ 参加可能 ({hoveredCell.availableParticipants.length}人)
              </div>
              <div className="space-y-1">
                {hoveredCell.availableParticipants.map(participant => (
                  <div key={participant.id} className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-green-600">
                        {participant.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-700">{participant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {hoveredCell.unavailableParticipants.length > 0 && (
            <div>
              <div className="text-xs font-medium text-red-700 mb-1">
                ❌ 参加不可 ({hoveredCell.unavailableParticipants.length}人)
              </div>
              <div className="space-y-1">
                {hoveredCell.unavailableParticipants.map(participant => (
                  <div key={participant.id} className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-red-600">
                        {participant.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-700">{participant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {hoveredCell.availableParticipants.length === 0 && hoveredCell.unavailableParticipants.length === 0 && (
            <div className="text-xs text-gray-500">
              この時間帯にはまだ回答がありません
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 最適時間帯分析コンポーネント
interface BestTimeSlotsAnalysisProps {
  eventData: any
  participants: any[]
  availabilities: any[]
}

function BestTimeSlotsAnalysis({ eventData, participants, availabilities }: BestTimeSlotsAnalysisProps) {
  // 各時間帯の参加可能人数を計算
  const calculateTimeSlotStats = () => {
    const dates = []
    const startDate = new Date(eventData.dateRange.startDate)
    const endDate = new Date(eventData.dateRange.endDate)
    
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

    const timeSlotStats = []
    
    dates.forEach(date => {
      times.forEach(time => {
        const timeSlotId = `${date}-${time}`
        const availableCount = availabilities.filter(a => a.timeSlotId === timeSlotId && a.available).length
        const rate = participants.length > 0 ? (availableCount / participants.length) * 100 : 0
        
        timeSlotStats.push({
          timeSlotId,
          date,
          time,
          availableCount,
          rate: Math.round(rate)
        })
      })
    })
    
    return timeSlotStats.sort((a, b) => b.availableCount - a.availableCount)
  }

  const timeSlotStats = calculateTimeSlotStats()
  const bestSlots = timeSlotStats.slice(0, 5)
  const worstSlots = timeSlotStats.slice(-5).reverse()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  }

  return (
    <div className="space-y-6">
      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 font-medium text-sm">最高参加可能率</div>
          <div className="text-2xl font-bold text-green-900">
            {timeSlotStats.length > 0 ? timeSlotStats[0].rate : 0}%
          </div>
          <div className="text-green-700 text-xs">
            {timeSlotStats.length > 0 ? `${timeSlotStats[0].availableCount}/${participants.length}人` : '0/0人'}
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800 font-medium text-sm">平均参加可能率</div>
          <div className="text-2xl font-bold text-blue-900">
            {timeSlotStats.length > 0 ? Math.round(timeSlotStats.reduce((sum, slot) => sum + slot.rate, 0) / timeSlotStats.length) : 0}%
          </div>
          <div className="text-blue-700 text-xs">
            全{timeSlotStats.length}時間帯
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-orange-800 font-medium text-sm">80%以上の時間帯</div>
          <div className="text-2xl font-bold text-orange-900">
            {timeSlotStats.filter(slot => slot.rate >= 80).length}
          </div>
          <div className="text-orange-700 text-xs">
            推奨時間帯数
          </div>
        </div>
      </div>

      {/* ベスト時間帯 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">👑 参加可能率が高い時間帯</h4>
          <div className="space-y-2">
            {bestSlots.map((slot, index) => (
              <div key={slot.timeSlotId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{formatDate(slot.date)} {slot.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-700">{slot.rate}%</div>
                  <div className="text-xs text-green-600">{slot.availableCount}/{participants.length}人</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3">⚠️ 参加可能率が低い時間帯</h4>
          <div className="space-y-2">
            {worstSlots.map((slot, index) => (
              <div key={slot.timeSlotId} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {timeSlotStats.length - index}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{formatDate(slot.date)} {slot.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-700">{slot.rate}%</div>
                  <div className="text-xs text-red-600">{slot.availableCount}/{participants.length}人</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 空き時間調整用カレンダーコンポーネント
interface AvailabilityCalendarProps {
  availabilityData: { [key: string]: boolean }
  onAvailabilityChange: (data: { [key: string]: boolean }) => void
  eventData: {
    dateRange: {
      startDate: string
      endDate: string
      startTime: string
      endTime: string
    }
  }
}

function AvailabilityCalendar({ availabilityData, onAvailabilityChange, eventData }: AvailabilityCalendarProps) {
  // 日付と時間のリストを生成
  const generateDatesAndTimes = () => {
    const dates = []
    const startDate = new Date(eventData.dateRange.startDate)
    const endDate = new Date(eventData.dateRange.endDate)
    
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
    
    return { dates, times }
  }

  const { dates, times } = generateDatesAndTimes()

  const toggleAvailability = (timeSlotId: string) => {
    const newData = {
      ...availabilityData,
      [timeSlotId]: !availabilityData[timeSlotId]
    }
    onAvailabilityChange(newData)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-3 border-b border-gray-200 w-20 text-sm font-medium text-gray-700">
              時間
            </th>
            {dates.map(date => (
              <th key={date} className="text-center p-3 border-b border-gray-200 min-w-24 text-sm font-medium text-gray-700">
                {formatDate(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map(time => (
            <tr key={time}>
              <td className="p-3 border-b border-gray-100 font-medium text-sm text-gray-600">
                {time}
              </td>
              {dates.map(date => {
                const timeSlotId = `${date}-${time}`
                const isAvailable = availabilityData[timeSlotId]
                
                return (
                  <td key={timeSlotId} className="p-1 border-b border-gray-100">
                    <button
                      onClick={() => toggleAvailability(timeSlotId)}
                      className={`w-full h-10 rounded-md border-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        isAvailable
                          ? 'bg-green-500 border-green-600 text-white hover:bg-green-600'
                          : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={`${formatDate(date)} ${time} - ${isAvailable ? '参加可能' : '参加不可'}`}
                    >
                      {isAvailable ? '○' : '×'}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded border"></div>
            <span>参加可能</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span>参加不可</span>
          </div>
        </div>
        <div>
          クリックして変更できます
        </div>
      </div>
    </div>
  )
}

interface ParticipantViewProps {
  eventId: string
  onBack: () => void
  onSubmitComplete: () => void
}

export default function ParticipantView({ eventId, onBack, onSubmitComplete }: ParticipantViewProps) {
  const [currentView, setCurrentView] = useState<'main' | 'register'>('main')
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    email: ''
  })
  const [availabilityData, setAvailabilityData] = useState<{ [key: string]: boolean }>({})
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [recalculateTrigger, setRecalculateTrigger] = useState(0)
  const [allParticipants, setAllParticipants] = useState<any[]>([])
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [eventData, setEventData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ユーザー情報を取得して自動設定
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.user && !participantInfo.name) {
            setParticipantInfo(prev => ({
              ...prev,
              name: result.user.name,
              email: result.user.email || result.user.id
            }))
          }
        }
      } catch (error) {
        console.error('ユーザー情報取得エラー:', error)
      }
    }
    
    getCurrentUser()
  }, [])

  const handleSubmit = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: participantInfo.name,
          email: participantInfo.email,
          availability: availabilityData
        })
      })

      const result = await response.json()

      if (response.ok) {
        console.log('参加者登録成功:', result)
        setIsSubmitted(true)
        setIsEditing(false)
        alert('回答を送信しました！ホーム画面に戻ります。')
        // 少し待ってからホーム画面に遷移
        setTimeout(() => {
          onBack()
        }, 1500)
      } else {
        console.error('参加者登録エラー:', result)
        alert(result.error || '送信に失敗しました。もう一度お試しください。')
      }
    } catch (error) {
      console.error('送信エラー:', error)
      alert('送信中にエラーが発生しました。もう一度お試しください。')
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setCurrentView('register')
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (isSubmitted) {
      setCurrentView('main')
    }
  }

  // イベントデータを取得
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        console.log('🔍 イベントデータを取得中...', eventId)
        
        const response = await fetch(`/api/events/${eventId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`指定されたイベントが見つかりません。\n\nイベントが削除されたか、URLが正しくない可能性があります。\n\nイベント作成者に正しいURLを確認してください。`)
          }
          throw new Error(`イベントデータの取得に失敗しました (${response.status})`)
        }
        
        const result = await response.json()
        
        if (result.success && result.event) {
          // データベース形式からコンポーネント期待形式に変換
          const eventWithDateRange = {
            ...result.event,
            dateRange: {
              startDate: result.event.start_date,
              endDate: result.event.end_date,
              startTime: result.event.start_time,
              endTime: result.event.end_time
            }
          }
          setEventData(eventWithDateRange)
          
          // 参加者と空き状況データを保存
          if (result.participants) {
            setAllParticipants(result.participants)
            console.log('参加者データ:', result.participants)
          }
          
          if (result.availabilities) {
            setAllAvailabilities(result.availabilities)
            console.log('空き状況データ:', result.availabilities)
          }
        } else {
          throw new Error('イベントデータが無効です')
        }
      } catch (error) {
        console.error('イベントデータ取得エラー:', error)
        setError(error instanceof Error ? error.message : 'イベントの読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEventData()
  }, [eventId])

  // ローディング状態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">イベント情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー状態
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">イベントが見つかりません</h2>
          <div className="text-gray-600 mb-6 text-left bg-gray-100 p-4 rounded-lg">
            <p className="whitespace-pre-line">{error}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              再読み込み
            </button>
            <button
              onClick={onBack}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // イベントデータが存在しない場合
  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">イベントが見つかりません</h2>
          <p className="text-gray-600 mb-6">指定されたイベントは存在しないか、削除された可能性があります。</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            戻る
          </button>
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
                {eventData?.title || '日程調整'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('main')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentView === 'main'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📅 イベント情報・分析
              </button>
              <button
                onClick={() => setCurrentView('register')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentView === 'register'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {isSubmitted && !isEditing ? '✏️ 回答を編集' : '✏️ 予定を登録する'}
              </button>
              {isSubmitted && (
                <div className="flex items-center space-x-2 text-green-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">回答済み</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentView === 'main' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">イベント情報</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{eventData.title}</h3>
                  <p className="text-gray-600">{eventData.description || '日程調整にご協力ください'}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">期間:</span>
                    <span className="text-gray-600 ml-2">
                      {new Date(eventData.start_date).toLocaleDateString('ja-JP')} 〜 {new Date(eventData.end_date).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">時間:</span>
                    <span className="text-gray-600 ml-2">
                      {eventData.start_time} 〜 {eventData.end_time}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">所要時間:</span>
                    <span className="text-gray-600 ml-2">{eventData.duration}分</span>
                  </div>
                </div>
              </div>
              
              {/* 空き状況マトリックス */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium text-gray-900">全体の空き状況</h3>
                  <div className="text-sm text-gray-500">
                    参加者: {allParticipants.length}人
                  </div>
                </div>
                
                {allParticipants.length === 0 ? (
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <div className="text-3xl mb-2">👥</div>
                    <p className="text-gray-600 text-sm">まだ回答がありません</p>
                    <p className="text-gray-500 text-xs mt-1">参加者からの回答をお待ちください</p>
                  </div>
                ) : (
                  <AvailabilityMatrix 
                    eventData={eventData}
                    participants={allParticipants}
                    availabilities={allAvailabilities}
                  />
                )}
              </div>
            </div>

            {/* 参加者一覧 */}
            {allParticipants.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">参加者一覧</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allParticipants.map((participant, index) => {
                    const participantAvailabilities = allAvailabilities.filter(
                      a => a.participantId === participant.id
                    )
                    const availableCount = participantAvailabilities.filter(a => a.available).length
                    const totalCount = participantAvailabilities.length
                    const availabilityRate = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0

                    return (
                      <div key={participant.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {participant.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{participant.name}</div>
                            <div className="text-xs text-gray-500">{participant.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {availableCount}/{totalCount}
                          </div>
                          <div className="text-xs text-gray-500">
                            {availabilityRate}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 自分の回答状況 */}
            {isSubmitted && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">あなたの回答</h2>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 text-sm"
                  >
                    ✏️ 編集する
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">お名前:</span>
                      <span className="ml-2 text-gray-900">{participantInfo.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">メールアドレス:</span>
                      <span className="ml-2 text-gray-900">{participantInfo.email}</span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">空き時間:</span>
                    <span className="ml-2 text-gray-900">
                      {Object.values(availabilityData).filter(Boolean).length}件 / 
                      {Object.keys(availabilityData).length}件の時間帯で参加可能
                    </span>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-800 font-medium">回答が送信されました</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      回答内容を変更したい場合は「編集する」ボタンをクリックしてください。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 詳細分析 */}
            {allParticipants.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">詳細分析</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      最適な時間帯の提案と詳細な統計情報です。
                    </p>
                  </div>
                </div>

                <BestTimeSlotsAnalysis 
                  eventData={eventData}
                  participants={allParticipants}
                  availabilities={allAvailabilities}
                />
              </div>
            )}
          </div>
        )}

        {currentView === 'register' && (
          <div className="space-y-6">
            {/* 参加者情報入力 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">参加者情報</h2>
                {isGoogleConnected && (
                  <div className="flex items-center space-x-2 text-green-700">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Googleアカウントから自動入力</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    お名前
                  </label>
                  <input
                    type="text"
                    value={participantInfo.name}
                    onChange={(e) => !isGoogleConnected && setParticipantInfo({...participantInfo, name: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isGoogleConnected 
                        ? 'border-green-300 bg-green-50 text-green-800' 
                        : 'border-gray-300'
                    }`}
                    placeholder="山田太郎"
                    readOnly={isGoogleConnected}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={participantInfo.email}
                    onChange={(e) => !isGoogleConnected && setParticipantInfo({...participantInfo, email: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isGoogleConnected 
                        ? 'border-green-300 bg-green-50 text-green-800' 
                        : 'border-gray-300'
                    }`}
                    placeholder="yamada@example.com"
                    readOnly={isGoogleConnected}
                  />
                </div>
              </div>
            </div>

            {/* Googleカレンダー連携 */}
            <GoogleCalendarIntegration
              eventData={{
                dateRange: eventData.dateRange,
                duration: eventData.duration
              }}
              recalculateTrigger={recalculateTrigger}
              onAvailabilityCalculated={(availability) => {
                console.log('Googleカレンダーから空き状況を受信:', availability)
                setAvailabilityData(availability)
                setIsGoogleConnected(true)
                // マトリックスが即座に更新されるように強制的に再レンダリング
                setTimeout(() => {
                  console.log('空き状況データが更新されました:', Object.keys(availability).length, '件')
                }, 100)
              }}
              onUserProfileLoaded={(profile) => {
                console.log('プロフィール情報を受信:', profile)
                if (profile && profile.name && profile.email) {
                  setParticipantInfo({
                    name: profile.name,
                    email: profile.email
                  })
                  setIsGoogleConnected(true)
                  console.log('参加者情報を更新:', { name: profile.name, email: profile.email })
                } else {
                  console.error('プロフィール情報が不完全です:', profile)
                }
              }}
            />

            {/* 手動選択オプション（Googleカレンダー未連携時のみ） */}
            {!isGoogleConnected && Object.keys(availabilityData).length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    手動で空き時間を選択
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Googleカレンダーを使わずに、手動で空き時間を選択することもできます。
                  </p>
                  <button
                    onClick={() => {
                      // 全ての時間帯を初期化（全て参加不可に設定）
                      const initialData: { [key: string]: boolean } = {}
                      const dates = []
                      const startDate = new Date(eventData.start_date)
                      const endDate = new Date(eventData.end_date)
                      
                      const currentDate = new Date(startDate)
                      while (currentDate <= endDate) {
                        dates.push(currentDate.toISOString().split('T')[0])
                        currentDate.setDate(currentDate.getDate() + 1)
                      }
                      
                      const startHour = parseInt(eventData.start_time.split(':')[0])
                      const endHour = parseInt(eventData.end_time.split(':')[0])
                      
                      dates.forEach(date => {
                        for (let hour = startHour; hour < endHour; hour++) {
                          const time = `${hour.toString().padStart(2, '0')}:00`
                          initialData[`${date}-${time}`] = false
                        }
                      })
                      
                      setAvailabilityData(initialData)
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    手動で空き時間を選択する →
                  </button>
                </div>
              </div>
            )}



            {/* 空き時間の手動調整カレンダー */}
            {Object.keys(availabilityData).length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">空き時間の調整</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {isGoogleConnected 
                        ? 'Googleカレンダーから自動取得した空き時間です。○×をクリックして手動で調整できます。'
                        : '手動で空き時間を選択してください。○×をクリックして参加可能・不可を設定できます。'
                      }
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    空き: {Object.values(availabilityData).filter(Boolean).length}件 / 
                    全体: {Object.keys(availabilityData).length}件
                  </div>
                </div>

                <AvailabilityCalendar
                  availabilityData={availabilityData}
                  onAvailabilityChange={setAvailabilityData}
                  eventData={{
                    dateRange: eventData.dateRange
                  }}
                />

                {/* 便利な一括操作ボタン */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const newData = { ...availabilityData }
                        Object.keys(newData).forEach(key => {
                          newData[key] = true
                        })
                        setAvailabilityData(newData)
                      }}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      全て○にする
                    </button>
                    <button
                      onClick={() => {
                        const newData = { ...availabilityData }
                        Object.keys(newData).forEach(key => {
                          newData[key] = false
                        })
                        setAvailabilityData(newData)
                      }}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      全て×にする
                    </button>
                    {isGoogleConnected && (
                      <button
                        onClick={() => {
                          // Googleカレンダーから再計算をトリガー
                          setRecalculateTrigger(prev => prev + 1)
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Googleカレンダーから再取得
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    クリックで個別に変更できます
                  </div>
                </div>
              </div>
            )}

            {/* 送信ボタン */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">

              
              <div className="flex justify-between">
                {isEditing && (
                  <button
                    onClick={handleCancelEdit}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                )}
                <div className={isEditing ? '' : 'ml-auto'}>
                  <button
                    onClick={handleSubmit}
                    disabled={!participantInfo.name || !participantInfo.email || Object.keys(availabilityData).length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isSubmitted && isEditing ? '変更を保存' : '回答を送信'}
                    {(!participantInfo.name || !participantInfo.email) && (
                      <span className="ml-2 text-xs">(名前・メール必須)</span>
                    )}
                    {Object.keys(availabilityData).length === 0 && (
                      <span className="ml-2 text-xs">(空き時間未設定)</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  )
}