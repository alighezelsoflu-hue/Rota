import { useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, Card, EmptyState, Skeleton } from './ui'
import { groupOperationsApi } from './groupOperationsApi'
import type { MemberResponsibility } from './groupOperationsApi'

type Props = {
  groupId: string
  onChanged: () => Promise<void>
}

function contributionTone(status: string | null) {
  if (!status) return 'neutral'
  if (status === 'confirmed' || status === 'group_verified') return 'success'
  if (status === 'paid') return 'warning'
  if (status === 'disputed') return 'danger'
  return 'neutral'
}

export default function MemberResponsibilityTracker({ groupId, onChanged }: Props) {
  const [members, setMembers] = useState<MemberResponsibility[]>([])
  const [cycle, setCycle] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await groupOperationsApi.memberResponsibilities(groupId)
      setMembers(data.members)
      setCycle(data.current_cycle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load responsibilities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  async function markLate(member: MemberResponsibility) {
    if (!member.contribution_id) return

    const reason = window.prompt('Reason for marking this contribution late:') || ''
    setBusy(member.contribution_id)
    setError('')

    try {
      await groupOperationsApi.markLatePayment(member.contribution_id, reason)
      await load()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark late payment')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <Skeleton variant="card" />

  return (
    <Card
      wide
      eyebrow="Member responsibility"
      title="Current cycle tracker"
      description="See who accepted the agreement, who paid, who uploaded proof, who is late, and who has open payment issues."
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Responsibility tracker unavailable"
          description={error}
          icon="!"
        />
      )}

      {!cycle ? (
        <EmptyState
          icon="◎"
          title="No active cycle"
          description="Create a cycle to start tracking member responsibilities."
        />
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Agreement</th>
                <th>Payment</th>
                <th>Proof</th>
                <th>Issues</th>
                <th>Trust</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {members.map(member => (
                <tr key={member.user_id}>
                  <td>
                    <strong>{member.name}</strong>
                    <br />
                    <span className="mutedText">{member.email}</span>
                  </td>
                  <td><Badge status={member.role} /></td>
                  <td>
                    <Badge tone={member.agreement_accepted_at ? 'success' : 'warning'}>
                      {member.agreement_accepted_at ? 'Accepted' : 'Pending'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={contributionTone(member.contribution_status)}>
                      {member.contribution_status || 'No row'}
                    </Badge>
                  </td>
                  <td>{member.proof_url ? <Badge tone="success">Uploaded</Badge> : <Badge tone="neutral">None</Badge>}</td>
                  <td>
                    <div className="miniBadgeStack">
                      {member.is_late_candidate && <Badge tone="warning">Late candidate</Badge>}
                      {member.has_open_late_case && <Badge tone="danger">Late case</Badge>}
                      {member.has_open_dispute && <Badge tone="danger">Dispute</Badge>}
                      {!member.is_late_candidate && !member.has_open_late_case && !member.has_open_dispute && <Badge tone="success">Clear</Badge>}
                    </div>
                  </td>
                  <td>{member.trust_score}</td>
                  <td>
                    {member.is_late_candidate && !member.has_open_late_case ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        loading={busy === member.contribution_id}
                        onClick={() => markLate(member)}
                      >
                        Mark late
                      </Button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}