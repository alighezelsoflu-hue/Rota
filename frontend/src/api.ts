const API_BASE = ((import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000').replace(/\/$/, '')

export function getToken() {
  return localStorage.getItem('rota_token')
}

export function setToken(token: string) {
  localStorage.setItem('rota_token', token)
}

export function clearToken() {
  localStorage.removeItem('rota_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers || {})

  if (token) headers.set('Authorization', `Bearer ${token}`)

  const isFormData = options.body instanceof FormData

  if (options.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = 'Load failed'

    try {
      const data = await response.json()
      if (typeof data.detail === 'string') {
        message = data.detail
      } else if (Array.isArray(data.detail)) {
        message = data.detail.map((item: any) => item.msg || JSON.stringify(item)).join(', ')
      }
    } catch {
      try {
        message = await response.text()
      } catch {
        message = `Request failed with status ${response.status}`
      }
    }

    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) return {} as T

  return response.json()
}

export type Token = {
  access_token: string
  token_type: string
}

export type User = {
  id: string
  name: string
  email: string
  phone?: string | null
  trust_score: number
  verification_status: string
  created_at?: string
}

export type Group = {
  id: string
  name: string
  organizer_user_id?: string
  organizer_id?: string
  contribution_amount: number
  currency: string
  frequency: string
  member_limit: number
  payout_method: string
  status: string
  invite_code: string
  created_at?: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  name: string
  email: string
  role: string
  position: number
  joined_at?: string
  status?: string
  agreement_accepted_at?: string | null
  agreement_version?: number | null
  has_received_payout?: boolean
}

export type Cycle = {
  id: string
  group_id: string
  cycle_number: number
  receiver_user_id: string
  receiver_name: string
  due_date: string
  status: string
  created_at?: string
}

export type Contribution = {
  id: string
  cycle_id: string
  payer_user_id: string
  payer_name: string
  receiver_user_id: string
  receiver_name: string
  amount: number
  status: string
  payment_reference?: string | null
  proof_url?: string | null
  note?: string | null
  paid_at?: string | null
  confirmed_at?: string | null
  created_at?: string
  updated_at?: string
}

export type AuditLog = {
  id: string
  group_id: string
  actor_user_id?: string | null
  action: string
  created_at: string
}

export type GroupDetail = {
  group: Group
  members: GroupMember[]
  cycles: Cycle[]
  contributions: Contribution[]
  audit_logs: AuditLog[]
}

export type NetworkNode = {
  id: string
  type: 'person' | 'group'
  label: string
  subtitle?: string | null
  role?: string | null
  status?: string | null
  trust_score?: number | null
  verification_status?: string | null
  group_count?: number | null
  member_count?: number | null
  contribution_amount?: number | null
  currency?: string | null
  frequency?: string | null
  health?: string | null
}

export type NetworkEdge = {
  id: string
  source: string
  target: string
  type: string
  label?: string | null
  status?: string | null
  strength?: number | null
}

export type NetworkGraph = {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  stats: {
    people: number
    groups: number
    connections: number
    strong_connections?: number
    average_trust: number
  }
}

export type ContinuationVoteDecision = 'continue' | 'stop'

export type GroupGovernance = {
  group_id: string
  status: string
  agreement_required: boolean
  agreement_text: string
  agreement_version: number
  agreement_accepted: boolean
  member_status: string
  locked_at: string | null
  completed_at: string | null
  archived_at: string | null
  active_member_count: number
  rotation_received_count: number
  rotation_complete: boolean
  latest_cycle_id: string | null
  latest_cycle_number: number | null
  latest_cycle_complete: boolean
  continuation_vote_cycle_id: string | null
  continuation_vote_opened_at: string | null
  votes: Array<{
    id: string
    group_id: string
    cycle_id: string
    voter_user_id: string
    decision: ContinuationVoteDecision
    note: string | null
    created_at: string | null
    updated_at: string | null
  }>
  my_vote: {
    id: string
    decision: ContinuationVoteDecision
    note: string | null
  } | null
  vote_summary: {
    total_members: number
    votes_received: number
    stop_votes: number
    continue_votes: number
    all_voted: boolean
    all_stop: boolean
  }
  permissions: {
    is_organizer: boolean
    can_open_continuation_vote: boolean
    can_close_group: boolean
    can_archive_group: boolean
  }
}

export type DiscoveryProfile = {
  user_id: string
  is_discoverable: boolean
  city: string | null
  country: string | null
  latitude_approx: number | null
  longitude_approx: number | null
  radius_km: number
  preferred_min_amount: number | null
  preferred_max_amount: number | null
  preferred_currency: string
  preferred_frequency: string
  bio: string | null
  open_to_new_groups: boolean
}

export type DiscoveryProfilePayload = Omit<DiscoveryProfile, 'user_id'>

export type DiscoveryPerson = {
  user_id: string
  name: string
  email: string
  trust_score: number
  verification_status: string
  city: string | null
  country: string | null
  latitude_approx: number | null
  longitude_approx: number | null
  distance_km: number | null
  display_location: string
  preferred_min_amount: number | null
  preferred_max_amount: number | null
  preferred_currency: string
  preferred_frequency: string
  bio: string | null
  average_rating: number
  review_count: number
}

export type DiscoveryGroup = {
  group_id: string
  name: string
  contribution_amount: number
  currency: string
  frequency: string
  member_limit: number
  member_count: number
  status: string
  organizer_id: string
  organizer_name: string
  organizer_trust_score: number
  organizer_rating: number
  organizer_review_count: number
  city: string | null
  country: string | null
  latitude_approx: number | null
  longitude_approx: number | null
  distance_km: number | null
  display_location: string
  open_slots: number
  min_trust_score: number
  message: string | null
}

export type MemberReviewSummary = {
  user_id: string
  name: string
  trust_score: number
  verification_status: string
  average_rating: number
  review_count: number
  top_tags: Array<{ tag: string; count: number }>
  reviews: Array<{
    id: string
    reviewer_user_id: string
    reviewer_name: string
    reviewed_user_id: string
    group_id: string
    group_name: string
    rating: number
    tags: string[]
    note: string | null
    visibility: string
    created_at: string
  }>
}

export const api = {
  apiBase: API_BASE,

  register(payload: { name: string; email: string; phone?: string; password: string }) {
    return request<Token>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  login(payload: { email: string; password: string }) {
    return request<Token>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  me() {
    return request<User>('/auth/me')
  },

  groups() {
    return request<Group[]>('/groups')
  },

  createGroup(payload: {
    name: string
    contribution_amount: number
    currency: string
    frequency: string
    member_limit: number
    payout_method: string
  }) {
    return request<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  joinGroup(inviteCode: string) {
    return request<Group>('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    })
  },

  groupDetail(groupId: string) {
    return request<GroupDetail>(`/groups/${groupId}`)
  },

  createCycle(groupId: string, dueDate: string) {
    return request<Cycle>(`/groups/${groupId}/cycles`, {
      method: 'POST',
      body: JSON.stringify({ due_date: dueDate }),
    })
  },

  markPaid(contributionId: string, form: FormData) {
    return request<Contribution>(`/contributions/${contributionId}/mark-paid`, {
      method: 'POST',
      body: form,
    })
  },

  confirmContribution(contributionId: string) {
    return request<Contribution>(`/contributions/${contributionId}/confirm`, {
      method: 'POST',
    })
  },

  disputeContribution(contributionId: string, reason: string) {
    return request<Contribution>(`/contributions/${contributionId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  network() {
    return request<NetworkGraph>('/network')
  },

  governance(groupId: string) {
    return request<GroupGovernance>(`/groups/${groupId}/governance`)
  },

  acceptAgreement(groupId: string) {
    return request<{ ok: boolean; message: string }>(`/groups/${groupId}/agreement/accept`, {
      method: 'POST',
    })
  },

  leaveGroup(groupId: string) {
    return request<{ ok: boolean; message: string }>(`/groups/${groupId}/leave`, {
      method: 'POST',
    })
  },

  openContinuationVote(groupId: string) {
    return request<{ ok: boolean; message: string }>(`/groups/${groupId}/continuation-vote/open`, {
      method: 'POST',
    })
  },

  castContinuationVote(groupId: string, decision: ContinuationVoteDecision, note?: string) {
    return request<{ ok: boolean; message: string }>(`/groups/${groupId}/continuation-vote`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    })
  },

  closeGroup(groupId: string) {
    return request<{ ok: boolean; message: string }>(`/groups/${groupId}/close`, {
      method: 'POST',
    })
  },

  archiveGroup(groupId: string) {
    return request<{ ok: boolean; message: string }>(`/groups/${groupId}/archive`, {
      method: 'POST',
    })
  },

  memberConfirmContribution(contributionId: string, note?: string) {
    return request<{ ok: boolean }>(`/contributions/${contributionId}/member-confirm`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    })
  },

  memberDisputeContribution(contributionId: string, note?: string) {
    return request<{ ok: boolean }>(`/contributions/${contributionId}/member-dispute`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    })
  },

  discoveryProfile() {
    return request<DiscoveryProfile>('/discovery/profile')
  },

  saveDiscoveryProfile(payload: DiscoveryProfilePayload) {
    return request<{ ok: boolean; message: string }>('/discovery/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  discoverPeople(radiusKm?: number) {
    const query = radiusKm ? `?radius_km=${radiusKm}` : ''
    return request<DiscoveryPerson[]>(`/discovery/people${query}`)
  },

  discoverGroups(radiusKm?: number) {
    const query = radiusKm ? `?radius_km=${radiusKm}` : ''
    return request<DiscoveryGroup[]>(`/discovery/groups${query}`)
  },

  sendConnectionRequest(receiverUserId: string, message?: string) {
    return request<{ ok: boolean; message: string }>('/discovery/connection-requests', {
      method: 'POST',
      body: JSON.stringify({ receiver_user_id: receiverUserId, message }),
    })
  },

  discoveryRequests() {
    return request<{ incoming: any[]; outgoing: any[] }>('/discovery/requests')
  },

  respondConnectionRequest(requestId: string, decision: 'accepted' | 'declined' | 'blocked') {
    return request<{ ok: boolean; message: string }>(`/discovery/connection-requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    })
  },

  saveGroupDiscoverySettings(groupId: string, payload: {
    is_discoverable: boolean
    looking_for_members: boolean
    city?: string | null
    country?: string | null
    latitude_approx?: number | null
    longitude_approx?: number | null
    radius_km: number
    open_slots: number
    min_trust_score: number
    message?: string | null
  }) {
    return request<{ ok: boolean; message: string }>(`/groups/${groupId}/discovery-settings`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  requestToJoinDiscoveredGroup(groupId: string, message?: string) {
    return request<{ ok: boolean; message: string }>(`/groups/${groupId}/join-requests`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  groupJoinRequests(groupId: string) {
    return request<any[]>(`/groups/${groupId}/join-requests`)
  },

  respondGroupJoinRequest(groupId: string, requestId: string, decision: 'accepted' | 'declined' | 'blocked') {
    return request<{ ok: boolean; message: string }>(`/groups/${groupId}/join-requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    })
  },

  userReviews(userId: string) {
    return request<MemberReviewSummary>(`/users/${userId}/reviews`)
  },

  createMemberReview(reviewedUserId: string, payload: {
    group_id: string
    rating: number
    tags: string[]
    note?: string | null
    visibility: 'group_only' | 'network'
  }) {
    return request<{ ok: boolean; message: string }>(`/users/${reviewedUserId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}