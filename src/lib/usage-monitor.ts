// 45人コミュニティ用使用状況モニタリング

interface UsageStats {
  totalEvents: number
  totalParticipants: number
  totalResponses: number
  activeEvents: number
  lastActivity: string
}

export class UsageMonitor {
  static async getStats(): Promise<UsageStats> {
    try {
      const fs = require('fs')
      const path = require('path')
      
      const eventsPath = path.join(process.cwd(), 'data', 'events.json')
      const participantsPath = path.join(process.cwd(), 'data', 'participants.json')
      const availabilitiesPath = path.join(process.cwd(), 'data', 'availabilities.json')
      
      const events = fs.existsSync(eventsPath) ? JSON.parse(fs.readFileSync(eventsPath, 'utf8')) : []
      const participants = fs.existsSync(participantsPath) ? JSON.parse(fs.readFileSync(participantsPath, 'utf8')) : []
      const availabilities = fs.existsSync(availabilitiesPath) ? JSON.parse(fs.readFileSync(availabilitiesPath, 'utf8')) : []
      
      // アクティブなイベント（過去7日以内に作成）
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      const activeEvents = events.filter((event: any) => 
        new Date(event.createdAt) > oneWeekAgo
      ).length
      
      // 最後のアクティビティ
      const allActivities = [
        ...events.map((e: any) => e.createdAt),
        ...participants.map((p: any) => p.submittedAt),
        ...availabilities.map((a: any) => a.createdAt)
      ].sort().reverse()
      
      return {
        totalEvents: events.length,
        totalParticipants: participants.length,
        totalResponses: availabilities.length,
        activeEvents,
        lastActivity: allActivities[0] || 'なし'
      }
    } catch (error) {
      console.error('使用状況取得エラー:', error)
      return {
        totalEvents: 0,
        totalParticipants: 0,
        totalResponses: 0,
        activeEvents: 0,
        lastActivity: 'エラー'
      }
    }
  }
  
  static logActivity(action: string, details?: any) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${action}`, details || '')
  }
}