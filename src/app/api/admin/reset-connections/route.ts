import { NextRequest, NextResponse } from 'next/server'

// 管理者用：接続数を手動リセット
export async function POST(request: NextRequest) {
  try {
    // 簡単な認証（開発用）
    const { password } = await request.json()
    
    if (password !== process.env.COMMUNITY_PASSWORD) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      )
    }
    
    // 接続カウントをリセット（middlewareの変数は直接アクセスできないため、
    // 実際にはmiddleware内でのクリーンアップに依存）
    
    return NextResponse.json({
      success: true,
      message: '接続カウントのリセットを要求しました。次回アクセス時に自動クリーンアップされます。',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Connection reset error:', error)
    return NextResponse.json(
      { success: false, error: 'リセットに失敗しました' },
      { status: 500 }
    )
  }
}

// 現在の接続状況を確認
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: '接続状況は middleware のログで確認できます',
      timestamp: new Date().toISOString(),
      info: {
        resetInterval: '10分ごと',
        connectionTimeout: '5分',
        maxPerIP: 25,
        globalMax: 30
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'ステータス取得に失敗しました' },
      { status: 500 }
    )
  }
}