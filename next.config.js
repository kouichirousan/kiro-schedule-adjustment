/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 13.4以降ではappDirはデフォルトで有効
  
  // セキュリティヘッダーの設定
  async headers() {
    // 開発環境では緩いCSPを使用
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (isDevelopment) {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.googleapis.com https://*.gstatic.com",
                "style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com",
                "font-src 'self' https://*.gstatic.com",
                "img-src 'self' data: https: blob:",
                "connect-src 'self' https://*.google.com https://*.googleapis.com https://*.gstatic.com",
                "frame-src 'self' https://*.google.com https://*.googleapis.com",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'"
              ].join('; ')
            }
          ]
        }
      ]
    }
    
    // 本番環境用の厳格なCSP
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://apis.google.com https://accounts.google.com https://www.googleapis.com https://content.googleapis.com https://www.gstatic.com",
              "frame-src 'self' https://accounts.google.com https://content.googleapis.com https://www.google.com https://apis.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig