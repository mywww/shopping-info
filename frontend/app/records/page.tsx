'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ExternalLink, Check } from 'lucide-react'

interface PushRecord {
  id: number
  post_id: string
  post_title: string
  post_url: string
  read_status: boolean
  pushed_at: string
}

export default function RecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<PushRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchRecords()
  }, [router])

  const fetchRecords = async () => {
    try {
      const data = await api.pushRecords.list()
      setRecords(data)
    } catch (error) {
      console.error('Failed to fetch records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (id: number) => {
    try {
      await api.pushRecords.markRead(id)
      setRecords(records.map(r => r.id === id ? { ...r, read_status: true } : r))
    } catch (error) {
      console.error('Failed to mark as read:', error)
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
        <h1 className="text-lg font-semibold">推送记录</h1>
      </header>

      <main className="p-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">加载中...</div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              暂无推送记录
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
              <Card key={record.id} className={record.read_status ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <a
                      href={record.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 block"
                    >
                      <div className={`font-medium ${record.read_status ? 'line-through text-muted-foreground' : ''}`}>
                        {record.post_title}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {new Date(record.pushed_at).toLocaleString('zh-CN')}
                      </div>
                    </a>
                    <div className="flex items-center gap-2">
                      {record.read_status ? (
                        <Badge variant="secondary">
                          <Check className="w-3 h-3 mr-1" />
                          已读
                        </Badge>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkRead(record.id)}>
                          标记已读
                        </Button>
                      )}
                      <a href={record.post_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}