const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token')
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }

  return response.json()
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      fetchApi<{ access_token: string; token_type: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      fetchApi<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  requirements: {
    list: () => fetchApi<any[]>('/requirements'),
    create: (keyword: string, urgency_type: string, is_active: boolean = true) =>
      fetchApi<any>('/requirements', {
        method: 'POST',
        body: JSON.stringify({ keyword, urgency_type, is_active }),
      }),
    update: (id: number, data: any) =>
      fetchApi<any>(`/requirements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchApi<any>(`/requirements/${id}`, { method: 'DELETE' }),
  },

  pushConfig: {
    get: () => fetchApi<any>('/push-config'),
    create: (webhook_url: string, merge_enabled: boolean = true) =>
      fetchApi<any>('/push-config', {
        method: 'POST',
        body: JSON.stringify({ webhook_url, merge_enabled }),
      }),
    update: (data: any) =>
      fetchApi<any>('/push-config', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    test: (webhook_url: string) =>
      fetchApi<{ success: boolean; message: string }>('/push-config/test', {
        method: 'POST',
        body: JSON.stringify({ webhook_url }),
      }),
  },

  pushRecords: {
    list: () => fetchApi<any[]>('/push-records'),
    markRead: (id: number) =>
      fetchApi<any>(`/push-records/${id}/read`, { method: 'PUT' }),
  },

  search: {
    query: (keyword: string) =>
      fetchApi<{ posts: any[] }>(`/search?keyword=${encodeURIComponent(keyword)}`),
    crawl: (keyword: string) =>
      fetchApi<{ message: string; matched_count: number }>('/crawl/manual', {
        method: 'POST',
        body: JSON.stringify({ keyword }),
      }),
  },

  crawlLogs: {
    list: () => fetchApi<any[]>('/crawl-logs'),
  },
}