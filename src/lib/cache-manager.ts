// インメモリキャッシュシステム

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time To Live (milliseconds)
}

export class CacheManager {
  private static cache = new Map<string, CacheItem<any>>()
  private static readonly DEFAULT_TTL = 5 * 60 * 1000 // 5分
  private static readonly MAX_CACHE_SIZE = 1000

  // キャッシュに保存
  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // キャッシュサイズ制限
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    console.log(`📦 キャッシュ保存: ${key} (TTL: ${ttl}ms)`)
  }

  // キャッシュから取得
  static get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // 有効期限チェック
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      console.log(`⏰ キャッシュ期限切れ: ${key}`)
      return null
    }

    console.log(`✅ キャッシュヒット: ${key}`)
    return item.data
  }

  // キャッシュを削除
  static delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      console.log(`🗑️ キャッシュ削除: ${key}`)
    }
    return deleted
  }

  // パターンマッチでキャッシュを削除
  static deletePattern(pattern: string): number {
    let deletedCount = 0
    const regex = new RegExp(pattern)
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        deletedCount++
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️ パターン削除: ${pattern} (${deletedCount}件)`)
    }
    
    return deletedCount
  }

  // 期限切れキャッシュをクリーンアップ
  static cleanup(): number {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 期限切れキャッシュクリーンアップ: ${cleanedCount}件`)
    }
    
    return cleanedCount
  }

  // 全キャッシュをクリア
  static clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`🗑️ 全キャッシュクリア: ${size}件`)
  }

  // キャッシュ統計を取得
  static getStats(): {
    size: number
    keys: string[]
    totalMemory: number
  } {
    const keys = Array.from(this.cache.keys())
    const totalMemory = JSON.stringify(Array.from(this.cache.values())).length
    
    return {
      size: this.cache.size,
      keys,
      totalMemory
    }
  }

  // 関数の結果をキャッシュ
  static async withCache<T>(
    key: string,
    fn: () => Promise<T> | T,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // キャッシュから取得を試行
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // キャッシュにない場合は実行
    const result = await fn()
    this.set(key, result, ttl)
    
    return result
  }

  // イベント関連のキャッシュキー生成
  static eventKey(eventId: string): string {
    return `event:${eventId}`
  }

  static participantsKey(eventId: string): string {
    return `participants:${eventId}`
  }

  static availabilitiesKey(eventId: string): string {
    return `availabilities:${eventId}`
  }

  static userEventsKey(userId: string): string {
    return `user_events:${userId}`
  }

  static statsKey(eventId: string): string {
    return `stats:${eventId}`
  }

  // イベント関連のキャッシュを無効化
  static invalidateEvent(eventId: string): void {
    this.delete(this.eventKey(eventId))
    this.delete(this.participantsKey(eventId))
    this.delete(this.availabilitiesKey(eventId))
    this.delete(this.statsKey(eventId))
    
    // ユーザーイベントキャッシュも無効化
    this.deletePattern(`user_events:.*`)
    
    console.log(`🔄 イベントキャッシュ無効化: ${eventId}`)
  }
}

// 定期クリーンアップ（10分ごと）
setInterval(() => {
  CacheManager.cleanup()
}, 10 * 60 * 1000)

// キャッシュ統計ログ（30分ごと）
setInterval(() => {
  const stats = CacheManager.getStats()
  console.log(`📊 キャッシュ統計: ${stats.size}件, ${Math.round(stats.totalMemory / 1024)}KB`)
}, 30 * 60 * 1000)