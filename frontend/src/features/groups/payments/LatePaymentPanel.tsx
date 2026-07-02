import { useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, Card, EmptyState, Skeleton } from '../../../components/ui/ui'
import { groupOperationsApi } from '../../../api/groupOperationsApi'
import type { LatePaymentCandidate, LatePaymentCase } from '../../../api/groupOperationsApi'

type Props = {
  groupId: string
  currentUserId: string
  isOrganizer: boolean
  onChanged: () => Promise<void>
}

function statusTone(status: string) {
  if (status === 'resolved') return 'success'
  if (status === 'excused') return 'info'
  return 'danger'
}

export default function LatePaymentPanel({ groupId, currentUserId, isOrganizer, onChanged }: Props) {
  const [candidates, setCandidates] = useState<LatePaymentCandidate[]>([])
  const [cases, setCases] = useState<LatePaymentCase[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await groupOperationsApi.latePayments(groupId)
      setCandidates(data.candidates)
      setCases(data.cases)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load late payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  async function markCandidate(candidate: LatePaymentCandidate) {
    const reason = window.prompt('Reason for marking this contribution late:') || ''
    setBusy(candidate.contribution_id)

    try {
      await groupOperationsApi.markLatePayment(candidate.contribution_id, reason)
      await load()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark late payment')
    } finally {
      setBusy('')
    }
  }

  async function explain(lateCase: LatePaymentCase) {
    const explanation = window.prompt('Add your explanation for this late payment:')
    if (!explanation) return

    setBusy(lateCase.id)

    try {
      await groupOperationsApi.explainLatePayment(lateCase.id, explanation)
      await load()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add explanation')
    } finally {
      setBusy('')
    }
  }

  async function reminder(lateCase: LatePaymentCase) {
    setBusy(lateCase.id)

    try {
      await groupOperationsApi.sendLatePaymentReminder(lateCase.id)
      await load()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record reminder')
    } finally {
      setBusy('')
    }
  }

  async function resolve(lateCase: LatePaymentCase, status: 'resolved' | 'excused') {
    const note = window.prompt(status === 'resolved' ? 'Resolution note:' : 'Excuse note:') || ''
    setBusy(lateCase.id)

    try {
      await groupOperationsApi.resolveLatePayment(lateCase.id, status, note)
      await load()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update late payment')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <Skeleton variant="card" />

  const openCases = cases.filter(item => item.status === 'open')

  return (
    <Card
      wide
      eyebrow="Late payments"
      title="Late payment management"
      description="Track late contributions clearly without adding penalties or interest."
      actions={<Badge tone={openCases.length > 0 ? 'danger' : 'success'}>{openCases.length} open</Badge>}
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Late payment panel unavailable"
          description={error}
          icon="!"
        />
      )}

      {isOrganizer && candidates.length > 0 && (
        <div className="lateCandidateList">
          <h3>Late candidates</h3>
          {candidates.map(candidate => (
            <article key={candidate.contribution_id} className="lateCandidateCard">
              <div>
                <strong>{candidate.member_name}</strong>
                <span>Cycle {candidate.cycle_number} · Due {new Date(candidate.due_date).toLocaleDateString()}</span>
              </div>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={busy === candidate.contribution_id}
                onClick={() => markCandidate(candidate)}
              >
                Mark late
              </Button>
            </article>
          ))}
        </div>
      )}

      {cases.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No late payment cases"
          description="Late payment cases will appear here if a due contribution remains pending."
        />
      ) : (
        <div className="lateCaseList">
          {cases.map(lateCase => (
            <article key={lateCase.id} className="lateCaseCard">
              <div className="lateCaseTop">
                <div>
                  <Badge tone={statusTone(lateCase.status)} dot>{lateCase.status}</Badge>
                  <Badge tone="info">Cycle {lateCase.cycle_number || '-'}</Badge>
                </div>

                <small>{new Date(lateCase.created_at).toLocaleString()}</small>
              </div>

              <div className="lateCaseBody">
                <h3>{lateCase.member_name || 'Member'} · {lateCase.amount || '-'} contribution</h3>
                <p>Due {lateCase.due_date ? new Date(lateCase.due_date).toLocaleDateString() : '-'}</p>
                {lateCase.reason && <p><strong>Reason:</strong> {lateCase.reason}</p>}
                {lateCase.member_explanation && <p><strong>Member explanation:</strong> {lateCase.member_explanation}</p>}
                {lateCase.organizer_note && <p><strong>Organizer note:</strong> {lateCase.organizer_note}</p>}
                <p><strong>Reminders:</strong> {lateCase.reminder_count}</p>
              </div>

              <div className="lateCaseActions">
                {lateCase.member_user_id === currentUserId && lateCase.status === 'open' && (
                  <Button type="button" size="sm" variant="secondary" loading={busy === lateCase.id} onClick={() => explain(lateCase)}>
                    Add explanation
                  </Button>
                )}

                {isOrganizer && lateCase.status === 'open' && (
                  <>
                    <Button type="button" size="sm" variant="secondary" loading={busy === lateCase.id} onClick={() => reminder(lateCase)}>
                      Record reminder
                    </Button>
                    <Button type="button" size="sm" loading={busy === lateCase.id} onClick={() => resolve(lateCase, 'resolved')}>
                      Resolve
                    </Button>
                    <Button type="button" size="sm" variant="ghost" loading={busy === lateCase.id} onClick={() => resolve(lateCase, 'excused')}>
                      Excuse
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}