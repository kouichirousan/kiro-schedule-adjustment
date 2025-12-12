// パフォーマンス監視システム

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: any
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = []
  private static readonly MAX_METRICS = 100

  // パフォーマンス測定開始
  static startMeasure(name: string, metadata?: any): string {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    }
    
    this.metrics.unshift(metric)
    
    // メトリクス数制限
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(0, this.MAX_METRICS)
    }
    
    return name
  }

  // パフォーマンス測定終了
  static endMeasure(name: string): number | null {
    const metric = this.metrics.find(m => m.name === name && !m.endTime)
    
    if (!metric) {
      console.warn(`⚠️ パフォーマンス測定が見つかりません: ${name}`)
      return null
    }
    
    metric.endTime = performance.now()
    metric.duration = metric.endTime - metric.startTime
    
    // 遅い処理を警告
    if (metric.duration > 1000) {
      console.warn(`🐌 遅い処理検出: ${name} (${metric.duration.toFixed(2)}ms)`)
    } else if (metric.duration > 100) {
      console.log(`⏱️ 処理時間: ${name} (${metric.duration.toFixed(2)}ms)`)
    }
    
    return metric.duration
  }

  // 関数の実行時間を測定
  static async measureFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: any
  ): Promise<T> {
    this.startMeasure(name, metadata)
    
    try {
      const result = await fn()
      this.endMeasure(name)
      return result
    } catch (error) {
      this.endMeasure(name)
      throw error
    }
  }

  // API呼び出しの測定
  static async measureApiCall<T>(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    const name = `API: ${options?.method || 'GET'} ${url}`
    
    return this.measureFunction(name, async () => {
      const response = await fetch(url, options)
      
      // レスポンス時間をヘッダーに記録
      const responseTime = this.getLastDuration(name)
      if (responseTime) {
        console.log(`📡 API応答: ${name} (${responseTime.toFixed(2)}ms)`)
      }
      
      return response
    })
  }

  // 最後の測定時間を取得
  private static getLastDuration(name: string): number | null {
    const metric = this.metrics.find(m => m.name === name && m.duration)
    return metric?.duration || null
  }

  // パフォーマンス統計を取得
  static getStats(): {
    totalMeasurements: number
    averageDuration: number
    slowestOperations: Array<{ name: string; duration: number }>
    recentOperations: Array<{ name: string; duration: number; timestamp: number }>
  } {
    const completedMetrics = this.metrics.filter(m => m.duration)
    
    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0)
    const averageDuration = completedMetrics.length > 0 ? totalDuration / completedMetrics.length : 0
    
    const slowestOperations = completedMetrics
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10)
      .map(m => ({ name: m.name, duration: m.duration || 0 }))
    
    const recentOperations = completedMetrics
      .slice(0, 20)
      .map(m => ({
        name: m.name,
        duration: m.duration || 0,
        timestamp: m.startTime
      }))
    
    return {
      totalMeasurements: completedMetrics.length,
      averageDuration,
      slowestOperations,
      recentOperations
    }
  }

  // メトリクスをクリア
  static clearMetrics(): void {
    this.metrics = []
    console.log('🗑️ パフォーマンスメトリクスをクリアしました')
  }
}

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  const measureApiCall = async (url: string, options?: RequestInit) => {
    return PerformanceMonitor.measureApiCall(url, options)
  }

  const measureFunction = async <T>(name: string, fn: () => Promise<T> | T) => {
    return PerformanceMonitor.measureFunction(name, fn)
  }

  return {
    measureApiCall,
    measureFunction,
    getStats: PerformanceMonitor.getStats
  }
}

// 自動パフォーマンス監視
if (typeof window !== 'undefined') {
  // ページロード時間を測定
  window.addEventListener('load', () => {
    const loadTime = performance.now()
    console.log(`📊 ページロード時間: ${loadTime.toFixed(2)}ms`)
  })

  // 長時間実行されるタスクを検出
  let lastActivityTime = performance.now()
  
  const checkPerformance = () => {
    const now = performance.now()
    const timeSinceLastActivity = now - lastActivityTime
    
    if (timeSinceLastActivity > 100) {
      console.warn(`⚠️ UIブロック検出: ${timeSinceLastActivity.toFixed(2)}ms`)
    }
    
    lastActivityTime = now
    requestAnimationFrame(checkPerformance)
  }
  
  requestAnimationFrame(checkPerformance)
}