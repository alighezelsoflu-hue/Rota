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

async function downloadCsv(path: string, filename: string) {
  const token = getToken()
  const headers = new Headers()

  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${api.apiBase}${path}`, {
    headers,
  })

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export type DisputeReason =
  | 'payment_not_received'
  | 'wrong_amount'
  | 'wrong_receiver'
  | 'unclear_proof'
  | 'duplicate_proof'
  | 'other'

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'dismissed'

export type ContributionStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'group_verified'
  | 'disputed'

export type DisputeCase = {
  id: string
  group_id: string
  contribution_id: string
  cycle_id: string | null
  opened_by_user_id: string
  assigned_to_user_id: string | null
  reason: DisputeReason
  note: string | null
  evidence_text: string | null
  status: DisputeStatus
  resolution_note: string | null
  resolved_by_user_id: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string

  cycle_number?: number | null
  amount?: number
  contribution_status?: string
  payment_reference?: string | null
  proof_url?: string | null

  payer_name?: string
  payer_email?: string
  receiver_name?: string
  receiver_email?: string
  opened_by_name?: string
  opened_by_email?: string
  resolved_by_name?: string | null
  resolved_by_email?: string | null
}

export type CreateDisputeCasePayload = {
  reason: DisputeReason
  note?: string | null
  evidence_text?: string | null
}

export type UpdateDisputeCasePayload = {
  status: DisputeStatus
  resolution_note?: string | null
  contribution_status?: ContributionStatus | null
}

export const exportsDisputesApi = {
  downloadLedger(groupId: string, groupName = 'group') {
    return downloadCsv(
      `/groups/${groupId}/export/ledger.csv`,
      `rota-ledger-${groupName.replace(/\s+/g, '-').toLowerCase()}.csv`,
    )
  },

  downloadAudit(groupId: string, groupName = 'group') {
    return downloadCsv(
      `/groups/${groupId}/export/audit.csv`,
      `rota-audit-${groupName.replace(/\s+/g, '-').toLowerCase()}.csv`,
    )
  },

  groupDisputeCases(groupId: string) {
    return request<{ cases: DisputeCase[] }>(`/groups/${groupId}/dispute-cases`)
  },

  createDisputeCase(contributionId: string, payload: CreateDisputeCasePayload) {
    return request<DisputeCase>(`/contributions/${contributionId}/dispute-case`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateDisputeCaseStatus(caseId: string, payload: UpdateDisputeCasePayload) {
    return request<DisputeCase>(`/dispute-cases/${caseId}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}