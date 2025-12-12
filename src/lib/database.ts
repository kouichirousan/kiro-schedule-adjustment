import fs from 'fs'
import path from 'path'

// データベースファイルのパス
const DB_DIR = path.join(process.cwd(), 'data')
const EVENTS_FILE = path.join(DB_DIR, 'events.json')
const PARTICIPANTS_FILE = path.join(DB_DIR, 'participants.json')
const AVAILABILITIES_FILE = path.join(DB_DIR, 'availabilities.json')

// データベースディレクトリを作成
function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
}

// JSONファイルからデータを読み込み
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  ensureDbDir()
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(data)
    }
    return defaultValue
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return defaultValue
  }
}

// JSONファイルにデータを書き込み
function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDbDir()
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error)
    throw error
  }
}

// イベント関連の操作
export const EventsDB = {
  getAll: (): Event[] => readJsonFile(EVENTS_FILE, []),
  
  getById: (id: string): Event | null => {
    const events = EventsDB.getAll()
    return events.find(event => event.id === id) || null
  },
  
  create: (event: Event): Event => {
    const events = EventsDB.getAll()
    events.push(event)
    writeJsonFile(EVENTS_FILE, events)
    return event
  },
  
  update: (id: string, updates: Partial<Event>): Event | null => {
    const events = EventsDB.getAll()
    const index = events.findIndex(event => event.id === id)
    if (index === -1) return null
    
    events[index] = { ...events[index], ...updates }
    writeJsonFile(EVENTS_FILE, events)
    return events[index]
  },
  
  delete: (id: string): boolean => {
    const events = EventsDB.getAll()
    const index = events.findIndex(event => event.id === id)
    if (index === -1) return false
    
    events.splice(index, 1)
    writeJsonFile(EVENTS_FILE, events)
    
    // 関連する参加者と空き状況も削除
    ParticipantsDB.deleteByEventId(id)
    AvailabilitiesDB.deleteByEventId(id)
    
    return true
  }
}

// 参加者関連の操作
export const ParticipantsDB = {
  getAll: (): Participant[] => readJsonFile(PARTICIPANTS_FILE, []),
  
  getByEventId: (eventId: string): Participant[] => {
    const participants = ParticipantsDB.getAll()
    return participants.filter(p => p.eventId === eventId)
  },
  
  getById: (id: string): Participant | null => {
    const participants = ParticipantsDB.getAll()
    return participants.find(p => p.id === id) || null
  },
  
  create: (participant: Participant): Participant => {
    const participants = ParticipantsDB.getAll()
    participants.push(participant)
    writeJsonFile(PARTICIPANTS_FILE, participants)
    return participant
  },
  
  update: (id: string, updates: Partial<Participant>): Participant | null => {
    const participants = ParticipantsDB.getAll()
    const index = participants.findIndex(p => p.id === id)
    if (index === -1) return null
    
    participants[index] = { ...participants[index], ...updates }
    writeJsonFile(PARTICIPANTS_FILE, participants)
    return participants[index]
  },
  
  deleteByEventId: (eventId: string): void => {
    const participants = ParticipantsDB.getAll()
    const filtered = participants.filter(p => p.eventId !== eventId)
    writeJsonFile(PARTICIPANTS_FILE, filtered)
  },
  
  findByEmailAndEventId: (email: string, eventId: string): Participant | null => {
    const participants = ParticipantsDB.getAll()
    return participants.find(p => p.email === email && p.eventId === eventId) || null
  }
}

// 空き状況関連の操作
export const AvailabilitiesDB = {
  getAll: (): Availability[] => readJsonFile(AVAILABILITIES_FILE, []),
  
  getByEventId: (eventId: string): Availability[] => {
    const availabilities = AvailabilitiesDB.getAll()
    return availabilities.filter(a => a.eventId === eventId)
  },
  
  getByParticipantId: (participantId: string): Availability[] => {
    const availabilities = AvailabilitiesDB.getAll()
    return availabilities.filter(a => a.participantId === participantId)
  },
  
  create: (availability: Availability): Availability => {
    const availabilities = AvailabilitiesDB.getAll()
    availabilities.push(availability)
    writeJsonFile(AVAILABILITIES_FILE, availabilities)
    return availability
  },
  
  createBatch: (availabilities: Availability[]): Availability[] => {
    const existingAvailabilities = AvailabilitiesDB.getAll()
    const newAvailabilities = [...existingAvailabilities, ...availabilities]
    writeJsonFile(AVAILABILITIES_FILE, newAvailabilities)
    return availabilities
  },
  
  deleteByEventId: (eventId: string): void => {
    const availabilities = AvailabilitiesDB.getAll()
    const filtered = availabilities.filter(a => a.eventId !== eventId)
    writeJsonFile(AVAILABILITIES_FILE, filtered)
  },
  
  deleteByParticipantId: (participantId: string): void => {
    const availabilities = AvailabilitiesDB.getAll()
    const filtered = availabilities.filter(a => a.participantId !== participantId)
    writeJsonFile(AVAILABILITIES_FILE, filtered)
  }
}

// 型定義
export interface Event {
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
  createdAt: string
  createdBy: string
  status: 'active' | 'completed' | 'cancelled'
}

export interface Participant {
  id: string
  eventId: string
  name: string
  email: string
  submittedAt: string
}

export interface Availability {
  id: string
  eventId: string
  participantId: string
  timeSlotId: string
  available: boolean
  createdAt: string
}

// ユーティリティ関数
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}