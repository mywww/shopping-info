'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Loader2 } from 'lucide-react'

interface Post {
  post_id: string
  title: string
  url: string
  time: string
}

export default function SearchPage() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setLoading(true)
    setSearching(true)

    try {
      const data = await api.search.query(keyword)
      setResults(data.posts || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }

    try {
      await api.search.crawl(keyword)
      setTimeout(async () => {
        try {
          const data = await api.search.query(keyword)
          setResults(data.posts || [])
        } catch (error) {
          console.error('Refresh failed:', error)
        }
        setSearching(false)
      }, 5000)
    } catch (error) {
      console.error('Crawl failed:', error)
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">手动检索</h1>
      </header>

      <main className="p-4 space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="输入关键词搜索优惠..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {searching && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>正在爬取最新数据...</span>
          </div>
        )}

        {results.length === 0 && !loading && !searching && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              输入关键词搜索最近24小时内的豆瓣优惠信息
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {results.map((post) => (
            <Card key={post.post_id}>
              <CardContent className="p-4">
                <a
                  href={post.url.replace('https://www.douban.com/group/', 'douban://douban.com/group/')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-primary transition-colors"
                >
                  <div className="font-medium">{post.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {post.time ? new Date(post.time).toLocaleString('zh-CN') : ''}
                  </div>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}