// API呼び出し用のユーティリティ関数

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

// イベント作成
export async function createEvent(eventData: {
  title: string
  description: string
  duration: number
  dateRange: {
    startDate: string
    endDate: string
    startTime: string
    endTime: string
  }
  createdBy?: string
}) {
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create event')
  }
  
  return response.json()
}

// イベント情報取得
export async function getEvent(eventId: string) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch event')
  }
  
  return response.json()
}

// イベント一覧取得
export async function getEvents() {
  const response = await fetch(`${API_BASE_URL}/events`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch events')
  }
  
  return response.json()
}

// 参加者登録
export async function registerParticipant(eventId: string, participantData: {
  name: string
  email: string
  availability: { [key: string]: boolean }
}) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/participants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(participantData),
  })
  
  if (!response.ok) {
    throw new Error('Failed to register participant')
  }
  
  return response.json()
}

// 参加者一覧取得
export async function getParticipants(eventId: string) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/participants`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch participants')
  }
  
  return response.json()
}

// 空き状況分析取得
export async function getEventAnalysis(eventId: string) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/analysis`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch event analysis')
  }
  
  return response.json()
}

// エラーハンドリング用のヘルパー関数
export function handleApiError(error: any) {
  console.error('API Error:', error)
  
  if (error.message) {
    return error.message
  }
  
  return 'An unexpected error occurred'
}