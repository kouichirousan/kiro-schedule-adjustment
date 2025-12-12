import { db, type Event, type Participant, type Availability, generateId } from './sqlite-db'
import { CacheManager } from './cache-manager'

// イベント操作
export const EventsDB = {
  // 全イベント取得（キャッシュ付き）
  getAll: (): Event[] => {
    // キャッシュから取得を試行
    const cached = CacheManager.get<Event[]>('events:all')
    if (cached !== null) {
      return cached
    }

    // キャッシュにない場合は実行
    const stmt = db.prepare(`
      SELECT * FROM events 
      ORDER BY created_at DESC
    `)
    const result = stmt.all() as Event[]
    
    // キャッシュに保存
    CacheManager.set('events:all', result, 2 * 60 * 1000)
    
    return result
  },

  // ID指定でイベント取得（キャッシュ付き）
  getById: (id: string): Event | null => {
    // キャッシュから取得を試行
    const cached = CacheManager.get<Event | null>(CacheManager.eventKey(id))
    if (cached !== null) {
      return cached
    }

    // キャッシュにない場合は実行
    const stmt = db.prepare('SELECT * FROM events WHERE id = ?')
    const result = (stmt.get(id) as Event) || null
    
    // キャッシュに保存
    CacheManager.set(CacheManager.eventKey(id), result, 5 * 60 * 1000)
    
    return result
  },

  // ユーザー関連イベント取得（作成者または参加者）（キャッシュ付き）
  getByUserId: (userId: string): Event[] => {
    // キャッシュから取得を試行
    const cached = CacheManager.get<Event[]>(CacheManager.userEventsKey(userId))
    if (cached !== null) {
      return cached
    }

    // キャッシュにない場合は実行
    const stmt = db.prepare(`
      SELECT DISTINCT e.* FROM events e
      LEFT JOIN participants p ON e.id = p.event_id
      WHERE e.created_by = ? OR p.email = ?
      ORDER BY e.created_at DESC
    `)
    const result = stmt.all(userId, userId) as Event[]
    
    // キャッシュに保存
    CacheManager.set(CacheManager.userEventsKey(userId), result, 3 * 60 * 1000)
    
    return result
  },

  // イベント作成
  create: (eventData: Omit<Event, 'id'>): Event => {
    const id = generateId('event')
    const event: Event = { id, ...eventData }
    
    const stmt = db.prepare(`
      INSERT INTO events (
        id, title, description, duration, start_date, end_date, 
        start_time, end_time, created_at, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      event.id, event.title, event.description, event.duration,
      event.start_date, event.end_date, event.start_time, event.end_time,
      event.created_at, event.created_by, event.status
    )
    
    // 関連キャッシュを無効化
    CacheManager.delete('events:all')
    CacheManager.deletePattern(`user_events:.*`)
    
    console.log(`✅ イベント作成: ${event.id}`)
    return event
  },

  // イベント更新
  update: (id: string, updates: Partial<Event>): Event | null => {
    const existing = EventsDB.getById(id)
    if (!existing) return null

    const fields = Object.keys(updates).filter(key => key !== 'id')
    if (fields.length === 0) return existing

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => (updates as any)[field])
    
    const stmt = db.prepare(`UPDATE events SET ${setClause} WHERE id = ?`)
    stmt.run(...values, id)
    
    return EventsDB.getById(id)
  },

  // イベント削除
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM events WHERE id = ?')
    const result = stmt.run(id)
    
    if (result.changes > 0) {
      // 関連キャッシュを無効化
      CacheManager.invalidateEvent(id)
      CacheManager.delete('events:all')
      CacheManager.deletePattern(`user_events:.*`)
      console.log(`🗑️ イベント削除: ${id}`)
    }
    
    return result.changes > 0
  }
}

// 参加者操作
export const ParticipantsDB = {
  // 全参加者取得
  getAll: (): Participant[] => {
    const stmt = db.prepare('SELECT * FROM participants ORDER BY submitted_at DESC')
    return stmt.all() as Participant[]
  },

  // イベント別参加者取得（キャッシュ付き）
  getByEventId: (eventId: string): Participant[] => {
    // キャッシュから取得を試行
    const cached = CacheManager.get<Participant[]>(CacheManager.participantsKey(eventId))
    if (cached !== null) {
      return cached
    }

    // キャッシュにない場合は実行
    const stmt = db.prepare('SELECT * FROM participants WHERE event_id = ? ORDER BY submitted_at ASC')
    const result = stmt.all(eventId) as Participant[]
    
    // キャッシュに保存
    CacheManager.set(CacheManager.participantsKey(eventId), result, 3 * 60 * 1000)
    
    return result
  },

  // ID指定で参加者取得
  getById: (id: string): Participant | null => {
    const stmt = db.prepare('SELECT * FROM participants WHERE id = ?')
    return (stmt.get(id) as Participant) || null
  },

  // メール・イベント指定で参加者検索
  findByEmailAndEventId: (email: string, eventId: string): Participant | null => {
    const stmt = db.prepare('SELECT * FROM participants WHERE email = ? AND event_id = ?')
    return (stmt.get(email, eventId) as Participant) || null
  },

  // 参加者作成
  create: (participantData: Omit<Participant, 'id'>): Participant => {
    const id = generateId('participant')
    const participant: Participant = { id, ...participantData }
    
    const stmt = db.prepare(`
      INSERT INTO participants (id, event_id, name, email, submitted_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      participant.id, participant.event_id, participant.name,
      participant.email, participant.submitted_at
    )
    
    // 関連キャッシュを無効化
    CacheManager.delete(CacheManager.participantsKey(participant.event_id))
    CacheManager.delete(CacheManager.statsKey(participant.event_id))
    CacheManager.deletePattern(`user_events:.*`)
    
    console.log(`✅ 参加者作成: ${participant.name} (${participant.event_id})`)
    return participant
  },

  // 参加者更新
  update: (id: string, updates: Partial<Participant>): Participant | null => {
    const existing = ParticipantsDB.getById(id)
    if (!existing) return null

    const fields = Object.keys(updates).filter(key => key !== 'id')
    if (fields.length === 0) return existing

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => (updates as any)[field])
    
    const stmt = db.prepare(`UPDATE participants SET ${setClause} WHERE id = ?`)
    stmt.run(...values, id)
    
    return ParticipantsDB.getById(id)
  },

  // イベント別参加者削除
  deleteByEventId: (eventId: string): void => {
    const stmt = db.prepare('DELETE FROM participants WHERE event_id = ?')
    stmt.run(eventId)
  }
}

// 空き状況操作
export const AvailabilitiesDB = {
  // 全空き状況取得
  getAll: (): Availability[] => {
    const stmt = db.prepare('SELECT * FROM availabilities ORDER BY created_at DESC')
    return stmt.all() as Availability[]
  },

  // イベント別空き状況取得（キャッシュ付き）
  getByEventId: (eventId: string): Availability[] => {
    // キャッシュから取得を試行
    const cached = CacheManager.get<Availability[]>(CacheManager.availabilitiesKey(eventId))
    if (cached !== null) {
      return cached
    }

    // キャッシュにない場合は実行
    const stmt = db.prepare('SELECT * FROM availabilities WHERE event_id = ? ORDER BY time_slot_id ASC')
    const result = stmt.all(eventId) as Availability[]
    
    // キャッシュに保存
    CacheManager.set(CacheManager.availabilitiesKey(eventId), result, 3 * 60 * 1000)
    
    return result
  },

  // 参加者別空き状況取得
  getByParticipantId: (participantId: string): Availability[] => {
    const stmt = db.prepare('SELECT * FROM availabilities WHERE participant_id = ? ORDER BY time_slot_id ASC')
    return stmt.all(participantId) as Availability[]
  },

  // 空き状況作成
  create: (availabilityData: Omit<Availability, 'id'>): Availability => {
    const id = generateId('availability')
    const availability: Availability = { id, ...availabilityData }
    
    const stmt = db.prepare(`
      INSERT INTO availabilities (id, event_id, participant_id, time_slot_id, available, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      availability.id, availability.event_id, availability.participant_id,
      availability.time_slot_id, availability.available ? 1 : 0, availability.created_at
    )
    
    return availability
  },

  // 一括作成（最適化版）
  createBatch: (availabilities: Omit<Availability, 'id'>[]): Availability[] => {
    if (availabilities.length === 0) return []
    
    const stmt = db.prepare(`
      INSERT INTO availabilities (id, event_id, participant_id, time_slot_id, available, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    const transaction = db.transaction((availabilities: Omit<Availability, 'id'>[]) => {
      const results: Availability[] = []
      const eventIds = new Set<string>()
      
      for (const availabilityData of availabilities) {
        const id = generateId('availability')
        const availability: Availability = { id, ...availabilityData }
        
        stmt.run(
          availability.id, availability.event_id, availability.participant_id,
          availability.time_slot_id, availability.available ? 1 : 0, availability.created_at
        )
        
        results.push(availability)
        eventIds.add(availability.event_id)
      }
      
      // 関連キャッシュを無効化
      for (const eventId of eventIds) {
        CacheManager.delete(CacheManager.availabilitiesKey(eventId))
        CacheManager.delete(CacheManager.statsKey(eventId))
      }
      
      console.log(`✅ 空き状況一括作成: ${results.length}件`)
      return results
    })
    
    return transaction(availabilities)
  },

  // イベント別空き状況削除
  deleteByEventId: (eventId: string): void => {
    const stmt = db.prepare('DELETE FROM availabilities WHERE event_id = ?')
    stmt.run(eventId)
  },

  // 参加者別空き状況削除
  deleteByParticipantId: (participantId: string): void => {
    const stmt = db.prepare('DELETE FROM availabilities WHERE participant_id = ?')
    stmt.run(participantId)
  }
}

// 統計情報取得（最適化版）
export const StatsDB = {
  // イベント統計（キャッシュ付き）
  getEventStats: () => {
    // キャッシュから取得を試行
    const cached = CacheManager.get('stats:events')
    if (cached !== null) {
      return cached
    }

    // キャッシュにない場合は実行
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_events,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events
      FROM events
    `)
    const result = stmt.get()
    
    // キャッシュに保存
    CacheManager.set('stats:events', result, 5 * 60 * 1000)
    
    return result
  },

  // 参加者統計（キャッシュ付き）
  getParticipantStats: () => {
    // キャッシュから取得を試行
    const cached = CacheManager.get('stats:participants')
    if (cached !== null) {
      return cached
    }

    // キャッシュにない場合は実行
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_participants,
        COUNT(DISTINCT email) as unique_participants
      FROM participants
    `)
    const result = stmt.get()
    
    // キャッシュに保存
    CacheManager.set('stats:participants', result, 5 * 60 * 1000)
    
    return result
  },

  // 特定イベントの詳細統計（キャッシュ付き）
  getEventDetailStats: (eventId: string) => {
    // キャッシュから取得を試行
    const cached = CacheManager.get(CacheManager.statsKey(eventId))
    if (cached !== null) {
      return cached
    }

    // キャッシュにない場合は実行
    // 参加者数
    const participantStmt = db.prepare('SELECT COUNT(*) as count FROM participants WHERE event_id = ?')
    const participantCount = (participantStmt.get(eventId) as any)?.count || 0

    // 空き状況統計
    const availabilityStmt = db.prepare(`
      SELECT 
        time_slot_id,
        COUNT(CASE WHEN available = 1 THEN 1 END) as available_count,
        COUNT(*) as total_responses
      FROM availabilities 
      WHERE event_id = ? 
      GROUP BY time_slot_id
      ORDER BY available_count DESC
    `)
    const timeSlotStats = availabilityStmt.all(eventId)

    // 最適な時間帯（上位5つ）
    const bestTimeSlots = timeSlotStats.slice(0, 5).map((slot: any) => ({
      timeSlotId: slot.time_slot_id,
      availableCount: slot.available_count,
      totalResponses: slot.total_responses,
      percentage: participantCount > 0 ? Math.round((slot.available_count / participantCount) * 100) : 0
    }))

    const result = {
      participantCount,
      totalTimeSlots: timeSlotStats.length,
      bestTimeSlots,
      responseRate: participantCount > 0 ? 100 : 0
    }
    
    // キャッシュに保存
    CacheManager.set(CacheManager.statsKey(eventId), result, 2 * 60 * 1000)
    
    return result
  }
}