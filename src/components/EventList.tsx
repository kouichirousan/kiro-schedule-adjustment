'use client'

interface Event {
  id: number
  title: string
  date: string
  time: string
  type: 'meeting' | 'personal' | 'work'
  description?: string
  isCoordination?: boolean
  coordinationData?: {
    id: string
    participantCount: number
    responseCount: number
  }
}

interface EventListProps {
  events: Event[]
  onViewResults?: (eventId: string) => void
  onDeleteEvent?: (eventId: string) => void
  onEditResponse?: (eventId: string) => void
  searchQuery?: string
}

export default function EventList({ events, onViewResults, onDeleteEvent, onEditResponse, searchQuery = '' }: EventListProps) {
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'text-red-600'
      case 'work':
        return 'text-blue-600'
      case 'personal':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'meeting':
        return '会議'
      case 'work':
        return '仕事'
      case 'personal':
        return '個人'
      default:
        return 'その他'
    }
  }

  // 検索結果のハイライト表示用関数
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <div className="text-2xl mb-2">📅</div>
        <p className="text-sm">予定がありません</p>
      </div>
    )
  }

  // 時間順にソート
  const sortedEvents = [...events].sort((a, b) => {
    return a.time.localeCompare(b.time)
  })

  return (
    <div className="space-y-2">
      {sortedEvents.map((event) => (
        <div
          key={event.id}
          className="border-l-4 border-blue-500 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                <span dangerouslySetInnerHTML={{
                  __html: highlightSearchTerm(event.title, searchQuery)
                }} />
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">{event.time}</span>
                <span className={`text-xs font-medium ${getEventTypeColor(event.type)}`}>
                  {getEventTypeLabel(event.type)}
                </span>
              </div>
              {event.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  <span dangerouslySetInnerHTML={{
                    __html: highlightSearchTerm(event.description, searchQuery)
                  }} />
                </p>
              )}
              {event.isCoordination && event.coordinationData && (
                <div className="flex items-center space-x-3 mt-2">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">✅</span>
                    <span className="text-xs text-gray-600">
                      {event.coordinationData.responseCount}人回答済み
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      event.coordinationData.responseCount > 0 
                        ? 'bg-green-500' 
                        : 'bg-gray-400'
                    }`}></div>
                    <span className="text-xs text-gray-500">
                      {event.coordinationData.responseCount > 0 
                        ? '回答済み' 
                        : '回答待ち'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-1 ml-2">
              {event.isCoordination && (
                <>
                  <button 
                    onClick={() => onViewResults?.(event.coordinationData?.id || '')}
                    className="text-green-600 hover:text-green-800 text-xs font-medium"
                  >
                    📊 結果を見る
                  </button>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/event/${event.coordinationData?.id}`
                      navigator.clipboard.writeText(url)
                      alert('参加者用URLをコピーしました！')
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    🔗 URL共有
                  </button>
                </>
              )}
              {event.isCoordination && (
                <button 
                  onClick={() => onEditResponse?.(event.coordinationData?.id || '')}
                  className="text-purple-600 hover:text-purple-800 text-xs hover:bg-purple-50 px-1 py-0.5 rounded transition-colors"
                  title="自分の回答を編集"
                >
                  ✏️ 回答編集
                </button>
              )}

              {event.isCoordination && (
                <button 
                  onClick={() => {
                    const participantCount = event.coordinationData?.participantCount || 0
                    const responseCount = event.coordinationData?.responseCount || 0
                    
                    let confirmMessage = `「${event.title}」を削除しますか？\n\n`
                    confirmMessage += `⚠️ この操作は取り消せません\n`
                    
                    if (responseCount > 0) {
                      confirmMessage += `📊 ${responseCount}人の回答データが削除されます\n`
                    }
                    if (participantCount > 0) {
                      confirmMessage += `👥 ${participantCount}人の参加者データが削除されます\n`
                    }
                    
                    confirmMessage += `\n本当に削除しますか？`
                    
                    if (window.confirm(confirmMessage)) {
                      onDeleteEvent?.(event.coordinationData?.id || '')
                    }
                  }}
                  className="text-red-600 hover:text-red-800 text-xs hover:bg-red-50 px-1 py-0.5 rounded transition-colors border border-transparent hover:border-red-200"
                  title="イベントを削除（取り消し不可）"
                >
                  🗑️ 削除
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}