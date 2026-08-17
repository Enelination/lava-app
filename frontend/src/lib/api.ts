import type { User, Submission, DashboardStats, KnowledgeDoc, ChatMessage, AppNotification, AuditLog } from '../types'

const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('lava_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export const auth = {
  login: (data: { email?: string; licence_number?: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: { name: string; email: string; password: string; licence_number?: string; organisation?: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<{ user: User }>('/auth/me'),

  updateProfile: (data: { name?: string; email?: string; licence_number?: string | null; organisation?: string | null }) =>
    request<{ user: User }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (current_password: string, new_password: string) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),
}

export const submissions = {
  list: (status?: string) => {
    const params = status && status !== 'all' ? `?status=${status}` : ''
    return request<Submission[]>(`/submissions${params}`)
  },

  stats: () => request<DashboardStats>('/submissions/stats'),

  create: (data: Partial<Submission>) =>
    request<Submission>('/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createBatch: (submissions: Partial<Submission>[]) =>
    request<{ created: number; errors: { row: number; field: string; message: string }[] }>('/submissions/batch', {
      method: 'POST',
      body: JSON.stringify({ submissions }),
    }),

  update: (id: string, data: { status?: string; trust_score?: string }) =>
    request<Submission>(`/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/submissions/${id}`, {
      method: 'DELETE',
    }),
}

export const ai = {
  status: () => request<{ verifiedRecords: number }>('/ai/status'),

  chat: (messages: any[], isPublic: boolean) =>
    request<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, isPublic }),
    }),

  history: () => request<{ messages: ChatMessage[] }>('/ai/history'),

  clearHistory: () =>
    request<{ success: boolean }>('/ai/history', {
      method: 'DELETE',
    }),
}

export const knowledgeBase = {
  list: () => request<KnowledgeDoc[]>('/knowledge-base'),

  get: (id: string) => request<KnowledgeDoc>(`/knowledge-base/${id}`),

  upload: (name: string, content: string) =>
    request<KnowledgeDoc>('/knowledge-base/upload', {
      method: 'POST',
      body: JSON.stringify({ name, content }),
    }),

  update: (id: string, data: { name?: string; content?: string }) =>
    request<KnowledgeDoc>(`/knowledge-base/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/knowledge-base/${id}`, {
      method: 'DELETE',
    }),
}

export const settings = {
  get: () => request<Record<string, string>>('/settings'),

  update: (data: Record<string, string>) =>
    request<{ success: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

export const notifications = {
  list: () => request<{ notifications: AppNotification[]; unread: number }>('/notifications'),

  markAllRead: () =>
    request<{ success: boolean }>('/notifications/read', {
      method: 'PATCH',
      body: JSON.stringify({}),
    }),
}

export const audit = {
  list: () => request<AuditLog[]>('/audit'),
}

export const admin = {
  users: () => request<{ users: User[] }>('/admin/users'),

  setRole: (id: string, role: string) =>
    request<User>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
}
