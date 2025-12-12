import { NextRequest, NextResponse } from 'next/server'
import { CacheManager } from '@/lib/cache-manager'

// キャッシュ統計取得 (GET)
export async function GET(request: NextRequest) {
  try {
    const stats = CacheManager.getStats()
    
    return NextResponse.json({
      success: true,
      stats: {
        size: stats.size,
        totalMemory: `${Math.round(stats.totalMemory / 1024)}KB`,
        keys: stats.keys
      }
    })
  } catch (error) {
    console.error('Cache stats error:', error)
    return NextResponse.json(
      { success: false, error: 'キャッシュ統計の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// キャッシュクリア (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    const { password, pattern } = await request.json()
    
    // 管理者認証
    if (password !== process.env.COMMUNITY_PASSWORD) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      )
    }
    
    let clearedCount = 0
    
    if (pattern) {
      // パターンマッチでクリア
      clearedCount = CacheManager.deletePattern(pattern)
    } else {
      // 全キャッシュクリア
      const stats = CacheManager.getStats()
      clearedCount = stats.size
      CacheManager.clear()
    }
    
    return NextResponse.json({
      success: true,
      message: `${clearedCount}件のキャッシュをクリアしました`,
      clearedCount
    })
  } catch (error) {
    console.error('Cache clear error:', error)
    return NextResponse.json(
      { success: false, error: 'キャッシュのクリアに失敗しました' },
      { status: 500 }
    )
  }
}

// キャッシュクリーンアップ (POST)
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // 管理者認証
    if (password !== process.env.COMMUNITY_PASSWORD) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      )
    }
    
    const cleanedCount = CacheManager.cleanup()
    
    return NextResponse.json({
      success: true,
      message: `${cleanedCount}件の期限切れキャッシュをクリーンアップしました`,
      cleanedCount
    })
  } catch (error) {
    console.error('Cache cleanup error:', error)
    return NextResponse.json(
      { success: false, error: 'キャッシュクリーンアップに失敗しました' },
      { status: 500 }
    )
  }
}