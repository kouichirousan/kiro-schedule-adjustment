import { NextRequest, NextResponse } from 'next/server'
import { ErrorHandler } from '@/lib/error-handler'

// エラーログ取得 (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const userId = searchParams.get('userId')
    
    let errorLog
    if (userId) {
      errorLog = ErrorHandler.getUserErrorLog(userId, limit)
    } else {
      errorLog = ErrorHandler.getErrorLog(limit)
    }
    
    const stats = ErrorHandler.getErrorStats()
    
    return NextResponse.json({
      success: true,
      errors: errorLog,
      stats: stats,
      total: errorLog.length
    })
  } catch (error) {
    console.error('Error log fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'エラーログの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// エラーログクリア (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // 管理者認証
    if (password !== process.env.COMMUNITY_PASSWORD) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      )
    }
    
    ErrorHandler.clearErrorLog()
    
    return NextResponse.json({
      success: true,
      message: 'エラーログをクリアしました'
    })
  } catch (error) {
    console.error('Error log clear error:', error)
    return NextResponse.json(
      { success: false, error: 'エラーログのクリアに失敗しました' },
      { status: 500 }
    )
  }
}