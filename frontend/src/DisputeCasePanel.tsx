import { useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, Card, EmptyState, Skeleton } from './ui'
import { exportsDisputesApi } from './exportsDisputesApi'
import type { ContributionStatus, DisputeCase, DisputeStatus } from './exportsDisputesApi'

type Props = {
  groupId: string
  isOrganizer: boolean
  onChanged: () => Promise<void>
}

function reasonLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function statusTone(status: string) {
  if (status === 'resolved') return 'success'
  if (status === 'dismissed') return 'neutral'
  if (status === 'under_review') return 'warning'
  return 'danger'
}

const contributionStatuses: ContributionStatus[] = [
  'pending',
  'paid',
  'confirmed',
  'group_verified',
  'disputed',
]

export default function DisputeCasePanel({ groupId, isOrganizer, onChanged }: Props) {
  const [cases, setCases] = useState<DisputeCase[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await exportsDisputesApi.groupDisputeCases(groupId)
      setCases(data.cases)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dispute cases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  async function updateStatus(disputeCase: DisputeCase, status: DisputeStatus) {
    let resolutionNote: string | null = null
    let contributionStatus: ContributionStatus | null = null

    if (status === 'resolved' || status === 'dismissed') {
      resolutionNote = window.prompt('Resolution note for the audit record:') || ''

      const selectedStatus = window.prompt(
        `Optional contribution status after resolution.\nAllowed: ${contributionStatuses.join(', ')}\nLeave blank to keep current status.`,
      )

      if (selectedStatus && contributionStatuses.includes(selectedStatus as ContributionStatus)) {
        contributionStatus = selectedStatus as ContributionStatus
      }
    }

    setBusy(disputeCase.id)
    setError('')

    try {
      await exportsDisputesApi.updateDisputeCaseStatus(disputeCase.id, {
        status,
        resolution_note: resolutionNote,
        contribution_status: contributionStatus,
      })

      await load()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update dispute case')
    } finally {
      setBusy('')
    }
  }

  const openCount = cases.filter(item => item.status === 'open' || item.status === 'under_review').length

  return (
    <Card
      wide
      eyebrow="Disputes"
      title="Structured dispute cases"
      description="Payment issues are tracked as clear cases with reason, evidence, status, and resolution notes."
      actions={<Badge tone={openCount > 0 ? 'danger' : 'success'}>{openCount} open</Badge>}
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Dispute cases unavailable"
          description={error}
          icon="!"
        />
      )}

      {loading ? (
        <Skeleton variant="card" />
      ) : cases.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No dispute cases"
          description="If a member sees a payment issue, they can open a structured dispute from the contribution ledger."
        />
      ) : (
        <div className="disputeCaseList">
          {cases.map(disputeCase => (
            <article key={disputeCase.id} className="disputeCaseCard">
              <div className="disputeCaseTop">
                <div>
                  <Badge tone={statusTone(disputeCase.status)} dot>
                    {reasonLabel(disputeCase.status)}
                  </Badge>
                  <Badge tone="info">
                    {reasonLabel(disputeCase.reason)}
                  </Badge>
                </div>

                <small>
                  {new Date(disputeCase.created_at).toLocaleString()}
                </small>
              </div>

              <div className="disputeCaseBody">
                <h3>
                  Cycle {disputeCase.cycle_number || '-'} · {disputeCase.amount || '-'} contribution
                </h3>

                <p>
                  <strong>Payer:</strong> {disputeCase.payer_name || 'Unknown'} ·{' '}
                  <strong>Receiver:</strong> {disputeCase.receiver_name || 'Unknown'}
                </p>

                <p>
                  <strong>Opened by:</strong> {disputeCase.opened_by_name || 'Unknown'}
                </p>

                {disputeCase.note && <p>{disputeCase.note}</p>}

                {disputeCase.evidence_text && (
                  <div className="disputeEvidence">
                    <strong>Evidence details</strong>
                    <span>{disputeCase.evidence_text}</span>
                  </div>
                )}

                {disputeCase.resolution_note && (
                  <div className="disputeResolution">
                    <strong>Resolution</strong>
                    <span>{disputeCase.resolution_note}</span>
                  </div>
                )}
              </div>

              {isOrganizer && (
                <div className="disputeCaseActions">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy === disputeCase.id || disputeCase.status === 'under_review'}
                    onClick={() => updateStatus(disputeCase, 'under_review')}
                  >
                    Under review
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={busy === disputeCase.id || disputeCase.status === 'resolved'}
                    onClick={() => updateStatus(disputeCase, 'resolved')}
                  >
                    Resolve
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy === disputeCase.id || disputeCase.status === 'dismissed'}
                    onClick={() => updateStatus(disputeCase, 'dismissed')}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}