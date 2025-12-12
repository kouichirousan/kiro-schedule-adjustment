'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function EventAdminPage() {
  const params = useParams()
  const eventId = params.id as string
  const [eventData, setEventData] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`)
        if (response.ok) {
          const result = await response.json()
          setEventData(result.event)
          setParticipants(result.participants)
        }
      } catch (error) {
        console.error('イベントデータ取得エラー:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEventData()
  }, [eventId])

  const copyParticipantUrl = () => {
    const url = `${window.location.origin}/event/${eventId}`
    navigator.clipboard.writeText(url)
    alert('参加者用URLをコピーしました！')
  }

  const copyAdminUrl = () => {
    const url = `${window.location.origin}/event/${eventId}/admin`
    navigator.clipboard.writeText(url)
    alert('管理者用URLをコピーしました！')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">イベントが見つかりません</h1>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            ホームに戻る
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
                onClick={() => window.location.href = '/'}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                管理者画面 - {eventData.title}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メイン情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* イベント情報 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">イベント情報</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">タイトル:</span>
                  <span className="ml-2 text-gray-600">{eventData.title}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">説明:</span>
                  <span className="ml-2 text-gray-600">{eventData.description}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">期間:</span>
                  <span className="ml-2 text-gray-600">
                    {eventData.dateRange.startDate} 〜 {eventData.dateRange.endDate}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">時間:</span>
                  <span className="ml-2 text-gray-600">
                    {eventData.dateRange.startTime} 〜 {eventData.dateRange.endTime}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">所要時間:</span>
                  <span className="ml-2 text-gray-600">{eventData.duration}分</span>
                </div>
              </div>
            </div>

            {/* URL共有 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">URL共有</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    参加者用URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={`${window.location.origin}/event/${eventId}`}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 font-mono text-sm"
                    />
                    <button 
                      onClick={copyParticipantUrl}
                      className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                    >
                      コピー
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    管理者用URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={`${window.location.origin}/event/${eventId}/admin`}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 font-mono text-sm"
                    />
                    <button 
                      onClick={copyAdminUrl}
                      className="px-4 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700"
                    >
                      コピー
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 参加者一覧 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">参加者一覧</h3>
              <div className="space-y-2">
                {participants.length === 0 ? (
                  <p className="text-gray-500 text-sm">まだ参加者がいません</p>
                ) : (
                  participants.map(participant => (
                    <div key={participant.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div>
                        <div className="font-medium text-sm">{participant.name}</div>
                        <div className="text-xs text-gray-500">{participant.email}</div>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="回答済み"></div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* アクション */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">アクション</h3>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.href = `/event/${eventId}/result`}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  結果を確認
                </button>
                <button
                  onClick={() => window.location.href = `/event/${eventId}`}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                >
                  参加者画面を確認
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}