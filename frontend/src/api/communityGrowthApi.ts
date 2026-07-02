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

export type PublicGroupInvite = {
  group: {
    id: string
    name: string
    invite_code: string
    contribution_amount: number
    currency: string
    frequency: string
    member_limit: number
    payout_method: string
    status: string
    created_at?: string
    organizer_name?: string | null
  }
  organizer_name: string
  member_count: number
  open_slots: number
  discovery: {
    is_discoverable: boolean
    looking_for_members: boolean
    city: string | null
    country: string | null
    open_slots: number
    min_trust_score: number
    message: string | null
  } | null
  principles: {
    rota_holds_money: boolean
    interest_free: boolean
    coordination_only: boolean
  }
}

export type ReviewPromptMember = {
  user_id: string
  name: string
  email: string
  trust_score: number
  role: string
}

export type ReviewPromptResponse = {
  should_prompt: boolean
  completed_cycle_count: number
  pending_members: ReviewPromptMember[]
}

export const communityGrowthApi = {
  publicGroupInvite(inviteCode: string) {
    return request<PublicGroupInvite>(`/public/groups/${encodeURIComponent(inviteCode)}`)
  },

  groupReviewPrompts(groupId: string) {
    return request<ReviewPromptResponse>(`/groups/${groupId}/review-prompts`)
  },
}