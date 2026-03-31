/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Google 頭像 / OAuth 圖片
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Instagram CDN
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      // Facebook CDN
      { protocol: 'https', hostname: '*.fbcdn.net' },
      // 常見圖床
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'imgur.com' },
      // Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co' },
      // 通用 HTTPS（寬鬆備用，可依需求移除）
      { protocol: 'https', hostname: '*.ticketmaster.com' },
      { protocol: 'https', hostname: '*.kktix.com' },
      { protocol: 'https', hostname: 'kktix.com' },
    ],
  },
}

export default nextConfig
