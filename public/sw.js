// Lyve Service Worker
// 負責：背景推播通知 + 通知點擊跳頁

self.addEventListener('install', () => {
  // 立即接管，不等舊 SW 過期
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// 接收來自伺服器的 Web Push（未來串 VAPID 後使用）
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || '搶票提醒'
  const options = {
    body: data.body || '',
    icon: '/lyve-logo.png',
    badge: '/lyve-logo.png',
    tag: data.tag || 'lyve-alert',
    data: { url: data.url || '/alerts' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// 點擊通知後開啟對應頁面
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/alerts'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 如果已有開啟的視窗就聚焦
        const existing = clientList.find((c) => 'focus' in c)
        if (existing) {
          existing.focus()
          if ('navigate' in existing) existing.navigate(url)
          return
        }
        return clients.openWindow(url)
      }),
  )
})
