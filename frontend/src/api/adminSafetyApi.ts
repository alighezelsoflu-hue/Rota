import { api, getToken } from './api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers || {})

  if (token) headers.set('Authorization', `Bearer ${token}`)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${api.apiBase}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = 'Request failed'

    try {
      const data = await response.json()
      message = typeof data.detail === 'string' ? data.detail : message
    } catch {
      message = `Request failed with status ${response.status}`
    }

    throw new Error(message)
  }

  return response.json()
}

export type AdminSafetyOverview = {
  summary: {
    total_users: number
    total_groups: number
    active_groups: number
    open_disputes: number
    resolved_disputes: number
    message_reports: number
    pending_join_requests: number
    pending_connection_requests: number
  }
  high_dispute_groups: Array<{
    group_id: string
    group_name: string
    total_disputes: number
    open_disputes: number
  }>
  recent_message_reports: Array<{
    id: string
    reason: string
    created_at: string
    reporter_name: string
    sender_name: string
    message_body: string
  }>
  recent_signups: Array<{
    id: string
    name: string
    email: string
    trust_score: number
    verification_status: string
    created_at?: string
  }>
}

export const adminSafetyApi = {
  overview() {
    return request<AdminSafetyOverview>('/admin/safety/overview')
  },
}