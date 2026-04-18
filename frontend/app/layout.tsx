import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '购物优惠助手',
  description: '实时推送豆瓣优惠信息',
  manifest: '/manifest.json',
  theme_color: '#2563EB',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}