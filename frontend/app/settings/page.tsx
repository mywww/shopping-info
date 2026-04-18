'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Send, CheckCircle, AlertCircle, Loader2, Copy } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [mergeEnabled, setMergeEnabled] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [configExists, setConfigExists] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchConfig()
  }, [router])

  const fetchConfig = async () => {
    try {
      const config = await api.pushConfig.get()
      if (config) {
        setWebhookUrl(config.webhook_url)
        setMergeEnabled(config.merge_enabled)
        setConfigExists(true)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    }
  }

  const handleTest = async () => {
    if (!webhookUrl.trim()) return
    setTesting(true)
    setTestResult(null)

    try {
      const result = await api.pushConfig.test(webhookUrl)
      setTestResult(result)
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || '测试失败' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (configExists) {
        await api.pushConfig.update({ webhook_url: webhookUrl, merge_enabled: mergeEnabled })
      } else {
        await api.pushConfig.create(webhookUrl, mergeEnabled)
        setConfigExists(true)
      }
      alert('保存成功！')
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    { title: '打开飞书', desc: '在飞书群聊中点击右上角"设置"' },
    { title: '添加机器人', desc: '选择"群机器人" -> "添加机器人" -> "自定义机器人"' },
    { title: '复制 Webhook', desc: '复制机器人 Webhook 地址，粘贴到下方输入框' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">飞书推送设置</h1>
      </header>

      <main className="p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">配置步骤</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{step.title}</div>
                  <div className="text-sm text-muted-foreground">{step.desc}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook 配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhook">Webhook 地址</Label>
              <Input
                id="webhook"
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="merge">合并推送消息</Label>
              <Switch
                id="merge"
                checked={mergeEnabled}
                onCheckedChange={(checked) => setMergeEnabled(checked)}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              开启后，同一需求匹配到的多条帖子会合并为一条消息推送
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTest} disabled={testing || !webhookUrl.trim()}>
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    测试推送
                  </>
                )}
              </Button>
              <Button onClick={handleSave} disabled={saving || !webhookUrl.trim()}>
                {saving ? '保存中...' : '保存配置'}
              </Button>
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}