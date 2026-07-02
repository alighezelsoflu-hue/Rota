import { api, getToken } from './api'

async function platformRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    let message = 'Load failed'

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

export type ActionPriority = 'high' | 'medium' | 'low'

export type ActionItem = {
  id: string
  type: string
  priority: ActionPriority
  title: string
  body: string
  group_id?: string | null
  group_name?: string | null
  thread_id?: string | null
  url: string
  created_at: string
}

export type NotificationItem = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  related_group_id: string | null
  related_thread_id: string | null
  related_url: string | null
  dedupe_key: string
  read_at: string | null
  created_at: string
  updated_at: string
}

export type NotificationPreferences = {
  payment_reminders: boolean
  group_messages: boolean
  connection_requests: boolean
  join_requests: boolean
  agreement_reminders: boolean
  vote_reminders: boolean
  review_reminders: boolean
  email_notifications: boolean
}

export type TrustPassport = {
  user: {
    id: string
    name: string
    email: string
    trust_score: number
    verification_status: string
    created_at?: string
  }
  level: string
  summary: {
    groups_total: number
    groups_completed: number
    groups_organized: number
    accepted_connections: number
    average_rating: number
    review_count: number
    trust_score: number
  }
  metrics: {
    contribution_count: number
    marked_paid_count: number
    confirmed_count: number
    disputed_count: number
    on_time_rate: number | null
    confirmation_rate: number | null
    receiver_confirmation_rate: number | null
    dispute_rate: number
  }
  top_tags: Array<{ tag: string; count: number }>
  disclaimer: string
}

export type ProfileSettings = {
  user: {
    id: string
    name: string
    email: string
    phone?: string | null
    trust_score: number
    verification_status: string
  }
  discovery_profile: any | null
  notification_preferences: NotificationPreferences
  trust_passport: TrustPassport
}

export type GroupHealth = {
  group_id: string
  group_name: string
  score: number
  label: string
  tone: 'success' | 'info' | 'warning' | 'danger'
  signals: string[]
  members: {
    total_members: number
    active_members: number
    pending_agreements: number
    accepted_agreements: number
  }
  latest_cycle: any | null
  contributions: {
    total: number
    pending: number
    paid: number
    confirmed: number
    group_verified: number
    disputed: number
  }
}

export const platformApi = {
  actionItems() {
    return platformRequest<{ items: ActionItem[] }>('/action-items')
  },

  notifications() {
    return platformRequest<{ unread_count: number; notifications: NotificationItem[] }>('/notifications')
  },

  markNotificationRead(notificationId: string) {
    return platformRequest<{ ok: boolean }>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    })
  },

  markAllNotificationsRead() {
    return platformRequest<{ ok: boolean }>('/notifications/read-all', {
      method: 'POST',
    })
  },

  profileSettings() {
    return platformRequest<ProfileSettings>('/settings/profile')
  },

  updateNotificationPreferences(payload: NotificationPreferences) {
    return platformRequest<{ ok: boolean; message: string }>('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  myTrustPassport() {
    return platformRequest<TrustPassport>('/trust-passport/me')
  },

  userTrustPassport(userId: string) {
    return platformRequest<TrustPassport>(`/users/${userId}/trust-passport`)
  },

  groupHealth(groupId: string) {
    return platformRequest<GroupHealth>(`/groups/${groupId}/health`)
  },
}