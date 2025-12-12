'use client'

import { useState } from 'react'
// User type definition
interface User {
  id: string
  name: string
  email?: string
}

interface Participant {
  id: string
  name: string
  email: string
}



interface ScheduleCoordinationProps {
  onBack: () => void
  onSubmit: (data: any) => Promise<any> | any
}

export default function ScheduleCoordination({ onBack, onSubmit }: ScheduleCoordinationProps) {
  const [step, setStep] = useState<'basic' | 'daterange' | 'participants' | 'share'>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    duration: 60,
    type: 'meeting' as 'meeting' | 'personal' | 'work'
  })
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: (() => {
      const date = new Date()
      date.setDate(date.getDate() + 6)
      return date.toISOString().split('T')[0]
    })(),
    startTime: '09:00',
    endTime: '18:00'
  })
  
  const [eventUrl, setEventUrl] = useState<string>('')
  const [eventId, setEventId] = useState<string>('')
  const [isCreated, setIsCreated] = useState(false)
  
  const [participants, setParticipants] = useState<Participant[]>([])
  
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '' })
  

  


  const addParticipant = () => {
    if (newParticipant.name && newParticipant.email) {
      const newId = (participants.length + 1).toString()
      setParticipants([...participants, { ...newParticipant, id: newId }])
      setNewParticipant({ name: '', email: '' })
      

    }
  }

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id))
  }

  // イベントURLを生成（実際のイベント作成後に設定される）
  const generateEventUrl = () => {
    // 仮のIDを生成（実際のイベント作成時に上書きされる）
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const url = `${window.location.origin}/event/${id}`
    setEventId(id)
    setEventUrl(url)
    return { id, url }
  }

  // URLをクリップボードにコピー
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('URLをコピーしました！')
    } catch (err) {
      console.error('コピーに失敗しました:', err)
      // フォールバック
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('URLをコピーしました！')
    }
  }



  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      console.log('📤 送信データ:', {
        ...eventData,
        eventId,
        eventUrl,
        dateRange,
        participants
      })
      
      const result = await onSubmit({
        ...eventData,
        eventId,
        eventUrl,
        dateRange,
        participants
      })
      
      console.log('📥 受信結果:', result)
      
      // 実際のイベントIDでURLを更新
      if (result && result.success && result.event && result.event.id) {
        const actualUrl = `${window.location.origin}/event/${result.event.id}`
        setEventId(result.event.id)
        setEventUrl(actualUrl)
        setIsCreated(true)
        
        console.log('✅ イベント作成成功:', result.event.id)
        
        // 3秒後にリストビューに戻る
        setTimeout(() => {
          onBack()
        }, 3000)
      } else {
        console.error('❌ レスポンス構造エラー:', result)
        throw new Error('イベント作成のレスポンスが正しくありません')
      }
    } catch (error) {
      console.error('❌ 送信エラー:', error)
      // エラーメッセージを改善
      const errorMessage = error instanceof Error ? error.message : '送信に失敗しました。もう一度お試しください。'
      alert(`送信が完了できませんでした: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
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
                日程調整を作成
              </h1>
            </div>
            
            {/* ステップインジケーター */}
            <div className="flex items-center space-x-2">
              {['基本情報', '日程範囲', '参加者', '共有'].map((label, index) => (
                <div key={label} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    ['basic', 'daterange', 'participants', 'share'].indexOf(step) >= index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      ['basic', 'daterange', 'participants', 'share'].indexOf(step) > index
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'basic' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">基本情報</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  イベント名
                </label>
                <input
                  type="text"
                  value={eventData.title}
                  onChange={(e) => setEventData({...eventData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: チーム会議"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={eventData.description}
                  onChange={(e) => setEventData({...eventData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="会議の詳細や議題など"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    所要時間
                  </label>
                  <select
                    value={eventData.duration}
                    onChange={(e) => setEventData({...eventData, duration: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30分</option>
                    <option value={60}>1時間</option>
                    <option value={90}>1時間30分</option>
                    <option value={120}>2時間</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリ
                  </label>
                  <select
                    value={eventData.type}
                    onChange={(e) => setEventData({...eventData, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="meeting">会議</option>
                    <option value="work">仕事</option>
                    <option value="personal">個人</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep('daterange')}
                disabled={!eventData.title}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {step === 'daterange' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">📅 日程範囲を設定</h2>
            
            <div className="space-y-8">
              {/* 日付設定 */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-4">📆 日付範囲</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      開始日
                    </label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => {
                        setDateRange({...dateRange, startDate: e.target.value})
                        // 終了日が開始日より前の場合、終了日を調整
                        if (e.target.value > dateRange.endDate) {
                          const newEndDate = new Date(e.target.value)
                          newEndDate.setDate(newEndDate.getDate() + 6)
                          setDateRange(prev => ({
                            ...prev, 
                            startDate: e.target.value,
                            endDate: newEndDate.toISOString().split('T')[0]
                          }))
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      終了日
                    </label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      min={dateRange.startDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 時間設定 */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-4">🕐 時間範囲</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      開始時刻
                    </label>
                    <select
                      value={dateRange.startTime}
                      onChange={(e) => {
                        setDateRange({...dateRange, startTime: e.target.value})
                        // 終了時刻が開始時刻より前の場合、終了時刻を調整
                        const startHour = parseInt(e.target.value.split(':')[0])
                        const endHour = parseInt(dateRange.endTime.split(':')[0])
                        if (startHour >= endHour) {
                          const newEndHour = Math.min(startHour + 8, 23)
                          setDateRange(prev => ({
                            ...prev,
                            startTime: e.target.value,
                            endTime: `${newEndHour.toString().padStart(2, '0')}:00`
                          }))
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    >
                      {Array.from({length: 24}, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <option key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      終了時刻
                    </label>
                    <select
                      value={dateRange.endTime}
                      onChange={(e) => setDateRange({...dateRange, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    >
                      {Array.from({length: 24}, (_, i) => {
                        const hour = (i + 1).toString().padStart(2, '0')
                        const startHour = parseInt(dateRange.startTime.split(':')[0])
                        const isDisabled = i + 1 <= startHour
                        return (
                          <option key={hour} value={`${hour}:00`} disabled={isDisabled}>
                            {hour}:00
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
              </div>



              {/* プレビュー */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                  <span className="mr-2">📊</span>
                  設定プレビュー
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-md border border-blue-100">
                    <div className="text-blue-600 font-medium mb-1">📅 期間</div>
                    <div className="text-blue-800">
                      {new Date(dateRange.startDate).toLocaleDateString('ja-JP', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      })} 〜 {new Date(dateRange.endDate).toLocaleDateString('ja-JP', {
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {(() => {
                        const startDate = new Date(dateRange.startDate)
                        const endDate = new Date(dateRange.endDate)
                        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        return `${days}日間`
                      })()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-md border border-blue-100">
                    <div className="text-blue-600 font-medium mb-1">🕐 時間</div>
                    <div className="text-blue-800">
                      {dateRange.startTime} 〜 {dateRange.endTime}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {(() => {
                        const startHour = parseInt(dateRange.startTime.split(':')[0])
                        const endHour = parseInt(dateRange.endTime.split(':')[0])
                        const hours = endHour - startHour
                        return `${hours}時間/日`
                      })()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-md border border-blue-100">
                    <div className="text-blue-600 font-medium mb-1">📈 候補数</div>
                    <div className="text-blue-800 text-lg font-semibold">
                      {(() => {
                        const startDate = new Date(dateRange.startDate)
                        const endDate = new Date(dateRange.endDate)
                        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        const startHour = parseInt(dateRange.startTime.split(':')[0])
                        const endHour = parseInt(dateRange.endTime.split(':')[0])
                        const hours = endHour - startHour
                        return days * hours
                      })()} 時間帯
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      選択可能な時間帯
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep('basic')}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                ← 戻る
              </button>
              <button
                onClick={() => {
                  if (!eventUrl) {
                    generateEventUrl()
                  }
                  setStep('participants')
                }}
                disabled={!dateRange.startDate || !dateRange.endDate || dateRange.startDate > dateRange.endDate}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                次へ →
              </button>
            </div>
          </div>
        )}

        {step === 'participants' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">参加者</h2>
              {eventUrl && (
                <div className="text-sm text-gray-600">
                  イベントID: <span className="font-mono text-blue-600">{eventId}</span>
                </div>
              )}
            </div>

            {/* イベントURL表示 */}
            {eventUrl && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">📋 参加者用URL</h3>
                <p className="text-sm text-blue-700 mb-3">
                  このURLを参加者に共有して、空き状況を入力してもらいましょう。
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={eventUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-md bg-white font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(eventUrl)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    コピー
                  </button>
                </div>
              </div>
            )}
            
            {/* 参加者追加フォーム */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">参加者を追加</h3>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="名前"
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={newParticipant.email}
                  onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addParticipant}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  追加
                </button>
              </div>
            </div>

            {/* 参加者リスト */}
            <div className="space-y-3">
              {participants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-sm">まだ参加者が追加されていません</p>
                  <p className="text-xs mt-1">参加者を追加するか、そのまま次へ進んでURLを共有できます</p>
                </div>
              ) : (
                participants.map(participant => (
                  <div key={participant.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{participant.name}</div>
                      <div className="text-sm text-gray-500">{participant.email}</div>
                    </div>
                    <button
                      onClick={() => removeParticipant(participant.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep('daterange')}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                onClick={() => setStep('share')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                次へ
              </button>
            </div>
          </div>
        )}



        {step === 'share' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">共有設定</h2>
            
            <div className="space-y-6">
              {isCreated ? (
                <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-green-800 mb-2">日程調整が作成されました！</h3>
                  <p className="text-sm text-green-700 mb-4">
                    参加者用URLが生成されました。このURLを共有して空き状況を入力してもらいましょう。
                  </p>
                  <div className="text-sm text-gray-600">
                    3秒後に自動的にイベント一覧に戻ります...
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">準備完了</h3>
                  <p className="text-sm text-blue-700">
                    「完了」ボタンを押すと日程調整が作成され、参加者用URLが生成されます。
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  参加者用URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={eventUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 font-mono text-sm"
                  />
                  <button 
                    onClick={() => copyToClipboard(eventUrl)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    コピー
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  参加者はこのURLにアクセスして空き状況を入力できます
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  管理者用URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={`${eventUrl}/admin`}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 font-mono text-sm"
                  />
                  <button 
                    onClick={() => copyToClipboard(`${eventUrl}/admin`)}
                    className="px-4 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700"
                  >
                    コピー
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  結果の確認や設定変更はこちらから
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">参加者への通知</h3>
                <div className="space-y-2">
                  {participants.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 border border-gray-200 rounded-lg">
                      <div className="text-2xl mb-2">📤</div>
                      <p className="text-sm">参加者が登録されていません</p>
                      <p className="text-xs mt-1">URLを直接共有して参加者を募集できます</p>
                    </div>
                  ) : (
                    participants.map(participant => (
                      <div key={participant.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{participant.name}</div>
                          <div className="text-xs text-gray-500">{participant.email}</div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              const subject = encodeURIComponent(`日程調整: ${eventData.title}`)
                              const body = encodeURIComponent(
                                `${participant.name}さん\n\n` +
                                `「${eventData.title}」の日程調整にご協力ください。\n\n` +
                                `以下のURLから空き状況を入力してください：\n${eventUrl}\n\n` +
                                `よろしくお願いします。`
                              )
                              window.open(`mailto:${participant.email}?subject=${subject}&body=${body}`)
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            メール送信
                          </button>
                          <button 
                            onClick={() => copyToClipboard(eventUrl)}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            URL共有
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep('participants')}
                disabled={isSubmitting || isCreated}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                戻る
              </button>
              {isCreated ? (
                <button
                  onClick={onBack}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                >
                  <span className="mr-2">✅</span>
                  イベント一覧に戻る
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      作成中...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🚀</span>
                      日程調整を作成
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}