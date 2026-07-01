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

export type GroupCommandCenter = {
  group: any
  current_cycle: any | null
  member_count: number
  pending_agreements: number
  open_disputes: number
  open_late_cases: number
  unread_messages: number
  unacknowledged_announcements: number
  contribution_stats: {
    expected_total: number
    paid_total: number
    confirmed_total: number
    pending_count: number
    paid_count: number
    confirmed_count: number
    disputed_count: number
    total_count: number
    late_candidate_count: number
  }
  next_action: string
}

export type GroupRules = {
  group_id: string
  due_grace_days: number
  proof_required: boolean
  minimum_member_confirmations: number
  late_payment_policy: string
  dispute_policy: string
  review_policy: string
  custom_rules: string | null
}

export type MemberResponsibility = {
  member_id: string
  user_id: string
  role: string
  member_status: string
  agreement_accepted_at: string | null
  has_received_payout: boolean
  name: string
  email: string
  trust_score: number
  contribution_id: string | null
  amount: number | null
  contribution_status: string | null
  payment_reference: string | null
  proof_url: string | null
  contribution_updated_at: string | null
  is_late_candidate: boolean
  has_open_dispute: boolean
  has_open_late_case: boolean
}

export type PaymentScheduleCycle = {
  id: string
  cycle_number: number
  status: string
  due_date: string
  receiver_name: string | null
  receiver_email: string | null
  contribution_count: number
  expected_total: number
  paid_total: number
  confirmed_total: number
  pending_count: number
  disputed_count: number
}

export type LatePaymentCandidate = {
  contribution_id: string
  amount: number
  contribution_status: string
  cycle_id: string
  cycle_number: number
  due_date: string
  member_user_id: string
  member_name: string
  member_email: string
}

export type LatePaymentCase = {
  id: string
  group_id: string
  contribution_id: string
  cycle_id: string | null
  member_user_id: string
  marked_by_user_id: string | null
  status: string
  reason: string | null
  member_explanation: string | null
  organizer_note: string | null
  reminder_count: number
  last_reminder_at: string | null
  resolved_by_user_id: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  cycle_number?: number
  due_date?: string
  amount?: number
  contribution_status?: string
  member_name?: string
  member_email?: string
  marked_by_name?: string | null
  resolved_by_name?: string | null
}

export type GroupAnnouncement = {
  id: string
  group_id: string
  author_user_id: string
  title: string
  body: string
  priority: 'normal' | 'important' | 'urgent'
  pinned: boolean
  created_at: string
  updated_at: string
  author_name: string
  author_email: string
  acknowledged_by_me: boolean
  acknowledgement_count: number
}

export type InviteControls = {
  group_id: string
  invite_code: string
  invite_enabled: boolean
  invite_approval_required: boolean
  invite_expires_at: string | null
  invite_max_uses: number | null
  invite_uses: number
  min_trust_score_to_join: number
  public_invite_message: string | null
}

export type ControlledJoinResponse = {
  status: 'joined' | 'already_member' | 'approval_required'
  group: any
}

export const groupOperationsApi = {
  commandCenter(groupId: string) {
    return request<GroupCommandCenter>(`/groups/${groupId}/operations/command-center`)
  },

  rules(groupId: string) {
    return request<GroupRules>(`/groups/${groupId}/operations/rules`)
  },

  updateRules(groupId: string, payload: GroupRules) {
    return request<GroupRules>(`/groups/${groupId}/operations/rules`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  memberResponsibilities(groupId: string) {
    return request<{ current_cycle: any | null; members: MemberResponsibility[] }>(
      `/groups/${groupId}/operations/member-responsibilities`,
    )
  },

  schedule(groupId: string) {
    return request<{ cycles: PaymentScheduleCycle[] }>(`/groups/${groupId}/operations/schedule`)
  },

  latePayments(groupId: string) {
    return request<{ candidates: LatePaymentCandidate[]; cases: LatePaymentCase[] }>(
      `/groups/${groupId}/operations/late-payments`,
    )
  },

  markLatePayment(contributionId: string, reason: string) {
    return request<LatePaymentCase>(`/contributions/${contributionId}/late-payment`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  explainLatePayment(caseId: string, member_explanation: string) {
    return request<LatePaymentCase>(`/late-payments/${caseId}/explanation`, {
      method: 'POST',
      body: JSON.stringify({ member_explanation }),
    })
  },

  sendLatePaymentReminder(caseId: string) {
    return request<LatePaymentCase>(`/late-payments/${caseId}/reminder`, {
      method: 'POST',
    })
  },

  resolveLatePayment(caseId: string, status: 'resolved' | 'excused', organizer_note: string | null) {
    return request<LatePaymentCase>(`/late-payments/${caseId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status, organizer_note }),
    })
  },

  announcements(groupId: string) {
    return request<{ announcements: GroupAnnouncement[] }>(`/groups/${groupId}/operations/announcements`)
  },

  createAnnouncement(
    groupId: string,
    payload: { title: string; body: string; priority: 'normal' | 'important' | 'urgent'; pinned: boolean },
  ) {
    return request<GroupAnnouncement>(`/groups/${groupId}/operations/announcements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  acknowledgeAnnouncement(announcementId: string) {
    return request<{ acknowledged: boolean }>(`/announcements/${announcementId}/acknowledge`, {
      method: 'POST',
    })
  },

  inviteControls(groupId: string) {
    return request<InviteControls>(`/groups/${groupId}/operations/invite-controls`)
  },

  updateInviteControls(groupId: string, payload: InviteControls) {
    return request<InviteControls>(`/groups/${groupId}/operations/invite-controls`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  joinByInvite(inviteCode: string) {
    return request<ControlledJoinResponse>(`/group-invites/${inviteCode}/join`, {
      method: 'POST',
    })
  },
}