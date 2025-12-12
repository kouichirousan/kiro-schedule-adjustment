'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import EventList from '@/components/EventList'
import ScheduleCoordination from '@/components/ScheduleCoordination'
import ParticipantView from '@/components/ParticipantView'
import EventResultView from '@/components/EventResultView'
// User type definition
interface User {
  id: string
  name: string
  email?: string
}
import { usePerformanceMonitor } from '@/lib/performance-monitor'

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [currentView, setCurrentView] = useState<'list' | 'coordination' | 'participant' | 'result'>('list')
  const [participantEventId, setParticipantEventId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const { measureApiCall, measureFunction } = usePerformanceMonitor()

  // ユーザー情報の初期化
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // サーバーサイドセッションを確認
        const response = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.user) {
            console.log('✅ 認証済みユーザー:', result.user)
            setCurrentUser(result.user)
            setCurrentView('list')
            return
          }
        }
        
        // 認証されていない場合は認証ページにリダイレクト
        console.log('❌ 未認証のため認証ページにリダイレクト')
        window.location.href = '/auth'
      } catch (error) {
        console.error('❌ 認証確認エラー:', error)
        window.location.href = '/auth'
      }
    }
    
    checkAuthentication()
  }, [])

  // イベント一覧を取得（関係者のみ）
  const fetchEvents = useCallback(async () => {
    if (!currentUser) return
    
    try {
      return await measureFunction('fetchEvents', async () => {
        console.log('📋 イベント一覧を取得中...')
        const response = await measureApiCall(`/api/events?userId=${currentUser.id}`)
        if (response.ok) {
          const result = await response.json()
          console.log('📋 取得したイベント一覧:', result)
          
          // レスポンス構造の確認
          if (!result.success || !Array.isArray(result.events)) {
            console.error('❌ APIレスポンスの構造が正しくありません:', result)
            setEvents([])
            return
          }
          
          // 並列処理で参加者数を取得（パフォーマンス向上）
          const formattedEvents = await Promise.all(result.events.map(async (event: any) => {
            console.log('📋 フォーマット中のイベント:', event)
            
            // 各イベントの参加者数を取得
            let participantCount = 0
            try {
              const participantResponse = await measureApiCall(`/api/events/${event.id}/participants`)
              if (participantResponse.ok) {
                const participantResult = await participantResponse.json()
                participantCount = participantResult.participants?.length || 0
              }
            } catch (error) {
              console.error('参加者数取得エラー:', error)
            }
            
            return {
              id: event.id,
              title: event.title,
              date: event.start_date || event.dateRange?.startDate,
              time: '10:00',
              type: 'meeting',
              description: event.description,
              isCoordination: true,
              coordinationData: {
                id: event.id,
                participantCount: participantCount,
                responseCount: participantCount // 参加者数 = 回答数（参加者は必ず回答するため）
              }
            }
          }))
          
          console.log('📋 フォーマット後のイベント:', formattedEvents)
          setEvents(formattedEvents)
        } else {
          console.error('📋 イベント取得失敗:', response.status, response.statusText)
        }
      })
    } catch (error) {
      console.error('イベント取得エラー:', error)
    }
  }, [currentUser])

  // ユーザー設定後にイベントを取得
  useEffect(() => {
    if (currentUser) {
      fetchEvents()
    }
  }, [currentUser, fetchEvents])

  // 参加者画面を表示する関数
  const showParticipantView = useCallback((eventId: string) => {
    setParticipantEventId(eventId)
    setCurrentView('participant')
  }, [])

  // 検索とフィルタリング機能（最適化版）
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // 検索クエリが空の場合は全て表示
      if (!searchQuery.trim()) {
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && (event.coordinationData?.responseCount || 0) === 0) ||
                             (statusFilter === 'completed' && (event.coordinationData?.responseCount || 0) > 0)
        return matchesStatus
      }

      // 検索対象を拡張
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch = 
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.coordinationData?.id?.toLowerCase().includes(searchLower) ||
        new Date(event.date).toLocaleDateString('ja-JP').includes(searchQuery.trim())
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && (event.coordinationData?.responseCount || 0) === 0) ||
                           (statusFilter === 'completed' && (event.coordinationData?.responseCount || 0) > 0)
      
      return matchesSearch && matchesStatus
    })
  }, [events, searchQuery, statusFilter])

  // 検索結果のハイライト表示用関数
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
  }

  // 検索候補の生成（最適化版）
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    
    return events
      .filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) &&
        event.title.toLowerCase() !== searchQuery.toLowerCase().trim()
      )
      .slice(0, 5)
      .map(event => event.title)
  }, [events, searchQuery])

  const handleCreateScheduleCoordination = async (data: any) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('📥 受信したデータ:', data)
      console.log('📥 dateRange:', data.dateRange)
      console.log('📥 title:', data.title)
      
      // データの検証
      if (!data.title || !data.dateRange) {
        console.error('❌ バリデーションエラー:', { title: data.title, dateRange: data.dateRange })
        throw new Error('必要な情報が不足しています')
      }
      
      // 実際のAPI呼び出し
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          duration: data.duration,
          dateRange: data.dateRange,
          createdBy: currentUser?.id || 'anonymous'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'イベントの作成に失敗しました')
      }
      
      const result = await response.json()
      
      // デバッグ: APIレスポンスの構造を確認
      console.log('📋 API Response:', result)
      console.log('📋 Event data:', result.event)
      
      // レスポンス構造の検証
      if (!result.success || !result.event) {
        throw new Error('APIレスポンスの構造が正しくありません')
      }
      
      // 成功時の処理
      const newEvent = {
        id: result.event.id,
        title: result.event.title,
        date: result.event.start_date || data.dateRange?.startDate,
        time: '10:00',
        type: data.type || 'meeting',
        description: result.event.description || '',
        isCoordination: true,
        coordinationData: result.event
      }
      
      setEvents(prevEvents => [...prevEvents, newEvent])
      
      // イベント一覧を再取得
      await fetchEvents()
      
      console.log('日程調整が正常に作成されました！', result)
      
      // 結果を返す（ScheduleCoordinationコンポーネントで処理後にリストビューに戻る）
      return result
    } catch (error) {
      console.error('日程調整の作成に失敗:', error)
      setError(error instanceof Error ? error.message : '日程調整の作成に失敗しました。もう一度お試しください。')
      throw error
    } finally {
      setIsLoading(false)
    }
  }



  // 結果画面を表示する関数
  const showResultView = useCallback((eventId: string) => {
    setParticipantEventId(eventId)
    setCurrentView('result')
  }, [])

  // イベント削除機能
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'イベントの削除に失敗しました')
      }
      
      // 成功時はイベント一覧から削除
      setEvents(prevEvents => prevEvents.filter(event => 
        event.coordinationData?.id !== eventId
      ))
      
      // 成功メッセージを表示
      const deletedEvent = events.find(event => event.coordinationData?.id === eventId)
      if (deletedEvent) {
        alert(`✅ 「${deletedEvent.title}」が削除されました`)
      } else {
        alert('✅ イベントが削除されました')
      }
      
      // イベント一覧を再取得
      await fetchEvents()
    } catch (error) {
      console.error('イベント削除エラー:', error)
      setError(error instanceof Error ? error.message : 'イベントの削除に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [fetchEvents])

  // ローディング状態の表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">処理中...</p>
        </div>
      </div>
    )
  }

  // 各ビューのレンダリング
  if (currentView === 'coordination') {
    return (
      <ScheduleCoordination
        onBack={() => setCurrentView('list')}
        onSubmit={handleCreateScheduleCoordination}
      />
    )
  }

  if (currentView === 'participant') {
    return (
      <ParticipantView
        eventId={participantEventId}
        onBack={() => setCurrentView('list')}
        onSubmitComplete={() => setCurrentView('result')}
      />
    )
  }

  if (currentView === 'result') {
    return (
      <EventResultView
        eventId={participantEventId}
        onBack={() => setCurrentView('list')}
      />
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                日程調整
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>🔒 コミュニティ限定</span>
                <span>•</span>
                <span>👤 {currentUser?.name}</span>
              </div>
            </div>
            
            {/* アクションボタン */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="flex space-x-2 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentView('coordination')}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-md transition-colors"
                >
                  <span className="hidden sm:inline">+ 日程調整を作成</span>
                  <span className="sm:hidden">+ 作成</span>
                </button>
              </div>
              
              {/* 管理・ログアウトボタン */}
              <div className="flex space-x-2">
                <button
                  onClick={async () => {
                    try {
                      // エラー統計とキャッシュ統計を並列取得
                      const [errorResponse, cacheResponse] = await Promise.all([
                        fetch('/api/admin/errors'),
                        fetch('/api/admin/cache')
                      ])
                      
                      const errorResult = await errorResponse.json()
                      const cacheResult = await cacheResponse.json()
                      
                      if (errorResult.success && cacheResult.success) {
                        const errorCount = errorResult.total
                        const criticalErrors = Object.entries(errorResult.stats)
                          .filter(([code]) => code.includes('SYSTEM') || code.includes('DB'))
                          .reduce((sum, [, count]) => sum + (count as number), 0)
                        
                        const { getStats } = usePerformanceMonitor()
                        const perfStats = getStats()
                        
                        alert(`📊 システム状況\n\n` +
                              `【エラー統計】\n` +
                              `総エラー数: ${errorCount}件\n` +
                              `重要エラー: ${criticalErrors}件\n\n` +
                              `【キャッシュ統計】\n` +
                              `キャッシュ数: ${cacheResult.stats.size}件\n` +
                              `メモリ使用量: ${cacheResult.stats.totalMemory}\n\n` +
                              `【パフォーマンス】\n` +
                              `測定回数: ${perfStats.totalMeasurements}回\n` +
                              `平均応答時間: ${perfStats.averageDuration.toFixed(2)}ms\n\n` +
                              `詳細はブラウザのコンソールを確認してください`)
                        
                        console.log('📊 エラー統計:', errorResult.stats)
                        console.log('📦 キャッシュ統計:', cacheResult.stats)
                        console.log('⚡ パフォーマンス統計:', perfStats)
                      }
                    } catch (error) {
                      alert('❌ システム状況の取得に失敗しました')
                    }
                  }}
                  className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 rounded"
                  title="システム状況確認"
                >
                  📊 状況
                </button>
                <button
                  onClick={async () => {
                    if (confirm('キャッシュをクリアしますか？（パフォーマンスが一時的に低下する可能性があります）')) {
                      try {
                        const response = await fetch('/api/admin/cache', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ password: 'posse2024' })
                        })
                        const result = await response.json()
                        if (result.success) {
                          alert('✅ ' + result.message)
                        } else {
                          alert('❌ ' + result.error)
                        }
                      } catch (error) {
                        alert('❌ キャッシュクリアに失敗しました')
                      }
                    }
                  }}
                  className="text-purple-500 hover:text-purple-700 text-sm px-2 py-1 rounded"
                  title="キャッシュクリア（管理者用）"
                >
                  🗑️ キャッシュ
                </button>
                <button
                  onClick={async () => {
                    if (confirm('接続カウントをリセットしますか？（接続エラーが発生している場合に使用）')) {
                      try {
                        const response = await fetch('/api/admin/reset-connections', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ password: 'posse2024' })
                        })
                        const result = await response.json()
                        if (result.success) {
                          alert('✅ ' + result.message)
                        } else {
                          alert('❌ ' + result.error)
                        }
                      } catch (error) {
                        alert('❌ リセットに失敗しました')
                      }
                    }
                  }}
                  className="text-orange-500 hover:text-orange-700 text-sm px-2 py-1 rounded"
                  title="接続リセット（管理者用）"
                >
                  🔄 リセット
                </button>
                <button
                  onClick={async () => {
                    if (confirm('ログアウトしますか？')) {
                      try {
                        const response = await fetch('/api/auth', { method: 'DELETE' })
                        if (response.ok) {
                          console.log('✅ ログアウト成功')
                          window.location.href = '/auth'
                        } else {
                          console.error('❌ ログアウト失敗:', response.status)
                          // エラーでも認証ページにリダイレクト
                          window.location.href = '/auth'
                        }
                      } catch (error) {
                        console.error('❌ ログアウトエラー:', error)
                        // エラーでも認証ページにリダイレクト
                        window.location.href = '/auth'
                      }
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded"
                  title="ログアウト"
                >
                  🚪 ログアウト
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* エラーメッセージ */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* 検索・フィルター */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* 検索バー */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="イベント名、説明、日付で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchQuery && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-gray-400 hover:text-gray-600"
                        title="検索をクリア"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* 検索候補 */}
                  {searchQuery.trim() && searchSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      <div className="py-1">
                        <div className="px-3 py-1 text-xs text-gray-500 border-b">検索候補</div>
                        {searchSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => setSearchQuery(suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100"
                          >
                            <span dangerouslySetInnerHTML={{
                              __html: highlightSearchTerm(suggestion, searchQuery.trim())
                            }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* ステータスフィルター */}
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">すべて</option>
                  <option value="active">回答受付中</option>
                  <option value="completed">回答完了</option>
                </select>
              </div>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="text-2xl mr-3">📊</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{events.length}</div>
                  <div className="text-sm text-gray-600">総イベント数</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="text-2xl mr-3">⏳</div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {events.filter(e => (e.coordinationData?.responseCount || 0) === 0).length}
                  </div>
                  <div className="text-sm text-gray-600">回答待ち</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="text-2xl mr-3">✅</div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {events.filter(e => (e.coordinationData?.responseCount || 0) > 0).length}
                  </div>
                  <div className="text-sm text-gray-600">回答済み</div>
                </div>
              </div>
            </div>
          </div>

          {/* イベント一覧 */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    日程調整一覧
                  </h2>
                  {searchQuery.trim() && (
                    <p className="text-sm text-gray-600 mt-1">
                      「<span className="font-medium text-blue-600">{searchQuery}</span>」の検索結果
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {filteredEvents.length}件 / {events.length}件
                  </div>
                  {searchQuery.trim() && filteredEvents.length !== events.length && (
                    <div className="text-xs text-gray-400 mt-1">
                      {events.length - filteredEvents.length}件が非表示
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4">
              {filteredEvents.length > 0 ? (
                <EventList 
                  events={filteredEvents} 
                  onViewResults={showResultView} 
                  onDeleteEvent={handleDeleteEvent}
                  onEditResponse={showParticipantView}
                  searchQuery={searchQuery}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">
                    {searchQuery.trim() ? '🔍' : '📅'}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery.trim() 
                      ? `「${searchQuery}」に一致するイベントが見つかりません`
                      : statusFilter !== 'all' 
                      ? 'フィルター条件に一致するイベントがありません'
                      : 'まだイベントがありません'
                    }
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery.trim() 
                      ? '別のキーワードで検索するか、検索条件をクリアしてください'
                      : statusFilter !== 'all' 
                      ? 'フィルター条件を変更してみてください'
                      : '最初の日程調整を作成してみましょう'
                    }
                  </p>
                  {searchQuery.trim() && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mb-4 px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 text-sm"
                    >
                      検索をクリア
                    </button>
                  )}
                  {!searchQuery && statusFilter === 'all' && (
                    <button
                      onClick={() => setCurrentView('coordination')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                    >
                      + 日程調整を作成
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}