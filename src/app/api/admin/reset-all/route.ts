import { NextRequest, NextResponse } from 'next/server'
import { CacheManager } from '@/lib/cache-manager'

// 管理者用：全データリセット（キャッシュクリア）
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // 管理者パスワード確認
    if (password !== 'posse2024') {
      return NextResponse.json(
        { success: false, error: '管理者パスワードが正しくありません' },
        { status: 401 }
      )
    }
    
    // 全キャッシュをクリア
    const clearedCount = CacheManager.clearAll()
    
    console.log('🧹 管理者による全キャッシュクリア実行')
    
    return NextResponse.json({
      success: true,
      message: `全キャッシュをクリアしました (${clearedCount}件)`,
      clearedCount
    })
  } catch (error) {
    console.error('全リセットエラー:', error)
    return NextResponse.json(
      { success: false, error: '全リセット処理でエラーが発生しました' },
      { status: 500 }
    )
  }
}