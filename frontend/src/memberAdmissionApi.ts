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

export type JoinApprovalMode = 'open' | 'organizer' | 'all_members' | 'majority'
export type LeaveApprovalMode = 'organizer' | 'all_members' | 'majority'

export type AdmissionSettings = {
  group_id: string
  invite_code: string
  invite_enabled: boolean
  join_approval_mode: JoinApprovalMode
  leave_approval_mode: LeaveApprovalMode
  invite_expires_at: string | null
  invite_max_uses: number | null
  invite_uses: number
  min_trust_score_to_join: number
  public_invite_message: string | null
}

export type AdmissionRequest = {
  id: string
  group_id: string
  requester_user_id: string
  requester_name: string
  requester_email: string
  requester_trust_score_live?: number
  requester_trust_score?: number
  invited_by_name?: string | null
  message: string | null
  status: string
  approval_mode: JoinApprovalMode
  approve_count: number
  decline_count: number
  my_vote: string | null
  created_at: string
}

export type LeaveRequest = {
  id: string
  group_id: string
  requester_user_id: string
  requester_name: string
  requester_email: string
  message: string | null
  status: string
  approval_mode: LeaveApprovalMode
  approve_count: number
  decline_count: number
  my_vote: string | null
  created_at: string
}

export type AdmissionOverview = {
  settings: AdmissionSettings
  is_organizer: boolean
  can_leave_now: boolean
  join_requests: AdmissionRequest[]
  leave_requests: LeaveRequest[]
}

export type AdmissionJoinResult = {
  status: 'joined' | 'already_member' | 'approval_required'
  approval_mode?: JoinApprovalMode
  group: any
  request?: AdmissionRequest
}

export const memberAdmissionApi = {
  overview(groupId: string) {
    return request<AdmissionOverview>(`/groups/${groupId}/admission/overview`)
  },

  settings(groupId: string) {
    return request<AdmissionSettings>(`/groups/${groupId}/admission/settings`)
  },

  updateSettings(groupId: string, payload: AdmissionSettings) {
    return request<AdmissionSettings>(`/groups/${groupId}/admission/settings`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  joinByInvite(inviteCode: string, message?: string) {
    return request<AdmissionJoinResult>(`/member-admission/invites/${inviteCode}/join`, {
      method: 'POST',
      body: JSON.stringify({ message: message || null }),
    })
  },

  voteJoinRequest(requestId: string, decision: 'approve' | 'decline', note?: string) {
    return request<AdmissionRequest>(`/admission/join-requests/${requestId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ decision, note: note || null }),
    })
  },

  addMember(groupId: string, email: string, message?: string) {
    return request<AdmissionJoinResult>(`/groups/${groupId}/admission/add-member`, {
      method: 'POST',
      body: JSON.stringify({ email, message: message || null }),
    })
  },

  requestLeave(groupId: string, message?: string) {
    return request<{ status: string; request?: LeaveRequest }>(`/groups/${groupId}/admission/leave`, {
      method: 'POST',
      body: JSON.stringify({ message: message || null }),
    })
  },

  voteLeaveRequest(requestId: string, decision: 'approve' | 'decline', note?: string) {
    return request<LeaveRequest>(`/admission/leave-requests/${requestId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ decision, note: note || null }),
    })
  },

  actionItems() {
    return request<{ items: any[] }>('/member-admission/action-items')
  },
}