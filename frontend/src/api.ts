const API_BASE =
  ((import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000').replace(/\/$/, '')
export type User = {
  id: string
  name: string
  email: string
  phone?: string | null
  verification_status: string
  trust_score: number
  created_at: string
}

export type Group = {
  id: string
  name: string
  organizer_id: string
  contribution_amount: number
  currency: string
  frequency: string
  member_limit: number
  payout_method: string
  invite_code: string
  status: string
  created_at: string
}

export type Member = {
  id: string
  group_id: string
  user_id: string
  name?: string | null
  email?: string | null
  role: string
  position: number
  status: string
  joined_at: string
}

export type Cycle = {
  id: string
  group_id: string
  cycle_number: number
  receiver_user_id: string
  receiver_name?: string | null
  due_date: string
  status: string
  created_at: string
}

export type Contribution = {
  id: string
  cycle_id: string
  payer_user_id: string
  payer_name?: string | null
  receiver_user_id: string
  receiver_name?: string | null
  amount: number
  status: string
  proof_url?: string | null
  payment_reference?: string | null
  note?: string | null
  paid_at?: string | null
  confirmed_at?: string | null
  created_at: string
}

export type AuditLog = {
  id: string
  group_id?: string | null
  user_id?: string | null
  action: string
  details?: string | null
  created_at: string
}

export type GroupDetail = {
  group: Group
  members: Member[]
  cycles: Cycle[]
  contributions: Contribution[]
  audit_logs: AuditLog[]
}

export type NetworkNode = {
  id: string
  type: 'person' | 'group' | string
  label: string
  subtitle?: string | null
  status?: string | null
  role?: string | null
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
  strength: number
}

export type NetworkGraph = {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  stats: {
    people: number
    groups: number
    connections: number
    strong_connections: number
    average_trust: number
  }
}

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
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    let message = 'Request failed'
    try {
      const data = await res.json()
      message = data.detail || message
    } catch {
      message = await res.text()
    }
    throw new Error(message)
  }
  return res.json()
}

export const api = {
  apiBase: API_BASE,
  register: (payload: { name: string; email: string; phone?: string; password: string }) =>
    request<{ access_token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<User>('/me'),
  network: () => request<NetworkGraph>('/network'),
  groups: () => request<Group[]>('/groups'),
  createGroup: (payload: { name: string; contribution_amount: number; currency: string; frequency: string; member_limit: number; payout_method: string }) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify(payload) }),
  joinGroup: (invite_code: string) => request<Group>('/groups/join', { method: 'POST', body: JSON.stringify({ invite_code }) }),
  groupDetail: (id: string) => request<GroupDetail>(`/groups/${id}`),
  createCycle: (groupId: string, dueDate: string) => request<Cycle>(`/groups/${groupId}/cycles`, { method: 'POST', body: JSON.stringify({ due_date: dueDate }) }),
  markPaid: (contributionId: string, formData: FormData) => request<Contribution>(`/contributions/${contributionId}/pay`, { method: 'POST', body: formData }),
  confirmContribution: (contributionId: string) => request<Contribution>(`/contributions/${contributionId}/confirm`, { method: 'POST' }),
  disputeContribution: (contributionId: string, reason: string) => request<Contribution>(`/contributions/${contributionId}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) })
}
