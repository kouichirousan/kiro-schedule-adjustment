// 簡単なユーザーセッション管理

export interface User {
  id: string
  name: string
  createdAt: string
}

export class UserSession {
  private static readonly STORAGE_KEY = 'community-user'
  
  // ユーザー情報を取得
  static getUser(): User | null {
    if (typeof window === 'undefined') return null
    
    try {
      const userData = localStorage.getItem(this.STORAGE_KEY)
      return userData ? JSON.parse(userData) : null
    } catch {
      return null
    }
  }
  
  // ユーザー情報を設定
  static setUser(name: string): User {
    const user: User = {
      id: this.generateUserId(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
    }
    
    return user
  }
  
  // ユーザー情報をクリア
  static clearUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }
  
  // ユーザーIDを生成
  private static generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
  
  // ユーザー名の検証
  static validateName(name: string): boolean {
    return name.trim().length >= 1 && name.trim().length <= 20
  }
}