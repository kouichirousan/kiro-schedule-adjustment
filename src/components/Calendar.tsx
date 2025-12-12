'use client'

import ReactCalendar from 'react-calendar'

interface Event {
  id: number
  title: string
  date: string
  time: string
  type: 'meeting' | 'personal' | 'work'
}

interface CalendarProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  events: Event[]
}

export default function Calendar({ selectedDate, onDateChange, events }: CalendarProps) {
  // 特定の日に予定があるかチェック
  const hasEvents = (date: Date) => {
    return events.some(event => 
      new Date(event.date).toDateString() === date.toDateString()
    )
  }

  // カレンダーのタイルにクラスを追加
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    const classes = []
    
    if (view === 'month') {
      if (hasEvents(date)) {
        classes.push('has-events')
      }
      
      // 今日の日付をハイライト
      if (date.toDateString() === new Date().toDateString()) {
        classes.push('today')
      }
      
      // 選択された日付をハイライト
      if (date.toDateString() === selectedDate.toDateString()) {
        classes.push('selected')
      }
    }
    
    return classes.join(' ')
  }

  // カレンダーのタイルの内容をカスタマイズ
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month' && hasEvents(date)) {
      const dayEvents = events.filter(event => 
        new Date(event.date).toDateString() === date.toDateString()
      )
      return (
        <div className="flex justify-center mt-1">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="tappy-calendar">
      {/* カレンダー */}
      <ReactCalendar
        onChange={(value) => onDateChange(value as Date)}
        value={selectedDate}
        locale="ja-JP"
        tileClassName={tileClassName}
        tileContent={tileContent}
        showNeighboringMonth={false}
        formatShortWeekday={(locale, date) => {
          const weekdays = ['日', '月', '火', '水', '木', '金', '土']
          return weekdays[date.getDay()]
        }}
        prev2Label={null}
        next2Label={null}
        navigationLabel={({ date }) => 
          `${date.getFullYear()}年 ${date.getMonth() + 1}月`
        }
      />
    </div>
  )
}