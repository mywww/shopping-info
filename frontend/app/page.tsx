'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Search, Settings, History, Trash2 } from 'lucide-react'

interface Requirement {
  id: number
  keyword: string
  urgency_type: string
  is_active: boolean
  created_at: string
}

export default function HomePage() {
  const router = useRouter()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyword, setNewKeyword] = useState('')
  const [newUrgency, setNewUrgency] = useState('urgent')
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchRequirements()
  }, [router])

  const fetchRequirements = async () => {
    try {
      const data = await api.requirements.list()
      setRequirements(data)
    } catch (error) {
      console.error('Failed to fetch requirements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newKeyword.trim()) return
    try {
      await api.requirements.create(newKeyword.trim(), newUrgency, true)
      setNewKeyword('')
      setNewUrgency('urgent')
      setDialogOpen(false)
      fetchRequirements()
    } catch (error) {
      console.error('Failed to create requirement:', error)
    }
  }

  const handleToggleActive = async (req: Requirement) => {
    try {
      await api.requirements.update(req.id, { is_active: !req.is_active })
      fetchRequirements()
    } catch (error) {
      console.error('Failed to update requirement:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该需求？将同时删除相关推送记录')) return
    try {
      await api.requirements.delete(id)
      fetchRequirements()
    } catch (error) {
      console.error('Failed to delete requirement:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">购物优惠助手</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          退出
        </Button>
      </header>

      <main className="p-4 space-y-4">
        <div className="flex gap-2">
          <Link href="/search" className="flex-1">
            <Button variant="outline" className="w-full">
              <Search className="w-4 h-4 mr-2" />
              手动检索
            </Button>
          </Link>
          <Link href="/records" className="flex-1">
            <Button variant="outline" className="w-full">
              <History className="w-4 h-4 mr-2" />
              推送记录
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">我的需求</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                添加需求
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加购物需求</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyword">关键词</Label>
                  <Input
                    id="keyword"
                    placeholder="如：咖啡机、耳机、键盘"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>紧急程度</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={newUrgency === 'urgent' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewUrgency('urgent')}
                    >
                      急用
                    </Button>
                    <Button
                      variant={newUrgency === 'non_urgent' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewUrgency('non_urgent')}
                    >
                      不急用
                    </Button>
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreate}>
                  保存
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {requirements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              暂无购物需求，点击上方添加按钮开始使用
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requirements.map((req) => (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={req.urgency_type === 'urgent' ? 'default' : 'secondary'}>
                        {req.urgency_type === 'urgent' ? '急用' : '不急用'}
                      </Badge>
                      <span className="font-medium">{req.keyword}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={req.is_active}
                        onCheckedChange={() => handleToggleActive(req)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(req.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
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