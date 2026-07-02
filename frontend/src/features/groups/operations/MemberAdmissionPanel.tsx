import { FormEvent, useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, Card, EmptyState, Skeleton } from '../../../components/ui/ui'
import { memberAdmissionApi } from '../../../api/memberAdmissionApi'
import type { AdmissionOverview, AdmissionRequest, LeaveRequest } from '../../../api/memberAdmissionApi'

type Props = {
  groupId: string
  isOrganizer: boolean
}

function statusTone(status: string) {
  if (status === 'approved' || status === 'joined') return 'success'
  if (status === 'declined') return 'danger'
  if (status === 'approved_waiting_completion') return 'warning'
  return 'info'
}

function approvalModeLabel(value: string) {
  return value.replace(/_/g, ' ')
}

export default function MemberAdmissionPanel({ groupId, isOrganizer }: Props) {
  const [overview, setOverview] = useState<AdmissionOverview | null>(null)
  const [email, setEmail] = useState('')
  const [addMessage, setAddMessage] = useState('')
  const [leaveMessage, setLeaveMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      setOverview(await memberAdmissionApi.overview(groupId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load member admission controls')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  async function voteJoin(request: AdmissionRequest, decision: 'approve' | 'decline') {
    const note = window.prompt(`${decision === 'approve' ? 'Approve' : 'Decline'} note:`) || ''
    setBusy(`join-${request.id}`)
    setError('')
    setMessage('')

    try {
      await memberAdmissionApi.voteJoinRequest(request.id, decision, note)
      setMessage(`Join request ${decision}d.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not vote on join request')
    } finally {
      setBusy('')
    }
  }

  async function voteLeave(request: LeaveRequest, decision: 'approve' | 'decline') {
    const note = window.prompt(`${decision === 'approve' ? 'Approve' : 'Decline'} note:`) || ''
    setBusy(`leave-${request.id}`)
    setError('')
    setMessage('')

    try {
      await memberAdmissionApi.voteLeaveRequest(request.id, decision, note)
      setMessage(`Leave request ${decision}d.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not vote on leave request')
    } finally {
      setBusy('')
    }
  }

  async function addMember(e: FormEvent) {
    e.preventDefault()
    setBusy('add-member')
    setError('')
    setMessage('')

    try {
      const result = await memberAdmissionApi.addMember(groupId, email, addMessage)

      if (result.status === 'approval_required') {
        setMessage('Member proposal created. Required voters must approve before the member is added.')
      } else {
        setMessage('Member added.')
      }

      setEmail('')
      setAddMessage('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add member')
    } finally {
      setBusy('')
    }
  }

  async function leaveGroup() {
    const confirmLeave = window.confirm(
      overview?.can_leave_now
        ? 'Leave this group now?'
        : 'This group is locked by the Circle Commitment. A leave request will be sent for approval. Continue?',
    )

    if (!confirmLeave) return

    setBusy('leave-group')
    setError('')
    setMessage('')

    try {
      const result = await memberAdmissionApi.requestLeave(groupId, leaveMessage)

      if (result.status === 'left') {
        setMessage('You left the group.')
      } else {
        setMessage('Leave request submitted for approval.')
      }

      setLeaveMessage('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request leave')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <Skeleton variant="card" />

  if (!overview) {
    return (
      <ActionBanner
        tone="danger"
        title="Admission controls unavailable"
        description={error || 'Could not load admission controls'}
        icon="!"
      />
    )
  }

  const pendingJoinRequests = overview.join_requests.filter(request => request.status === 'pending')
  const pendingLeaveRequests = overview.leave_requests.filter(request => request.status === 'pending')

  return (
    <Card
      wide
      eyebrow="Member admission"
      title="Join and leave approvals"
      description="Review people requesting to join, vote on admissions, add existing Rota users, and manage leave requests."
      actions={<Badge tone={pendingJoinRequests.length + pendingLeaveRequests.length > 0 ? 'warning' : 'success'}>{pendingJoinRequests.length + pendingLeaveRequests.length} pending</Badge>}
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Admission action failed"
          description={error}
          icon="!"
        />
      )}

      {message && (
        <ActionBanner
          tone="success"
          title="Done"
          description={message}
          icon="✓"
        />
      )}

      <section className="admissionSummaryGrid">
        <div>
          <span>Join mode</span>
          <strong>{approvalModeLabel(overview.settings.join_approval_mode)}</strong>
        </div>
        <div>
          <span>Leave mode</span>
          <strong>{approvalModeLabel(overview.settings.leave_approval_mode)}</strong>
        </div>
        <div>
          <span>Invite code</span>
          <strong>{overview.settings.invite_code}</strong>
        </div>
        <div>
          <span>Invite status</span>
          <strong>{overview.settings.invite_enabled ? 'Enabled' : 'Disabled'}</strong>
        </div>
      </section>

      {isOrganizer && (
        <form className="form admissionAddMemberForm" onSubmit={addMember}>
          <h3>Add existing Rota user</h3>
          <p className="mutedText">
            If the group uses all-member or majority approval, this creates a member proposal instead of adding directly.
          </p>

          <div className="settingsGrid two">
            <label>
              User email
              <input value={email} onChange={event => setEmail(event.target.value)} type="email" required />
            </label>

            <label>
              Optional note
              <input value={addMessage} onChange={event => setAddMessage(event.target.value)} />
            </label>
          </div>

          <Button type="submit" loading={busy === 'add-member'}>
            Add or propose member
          </Button>
        </form>
      )}

      <section className="admissionRequestSection">
        <h3>Join requests</h3>

        {overview.join_requests.length === 0 ? (
          <EmptyState
            icon="✓"
            title="No join requests"
            description="People with the invite link will appear here if approval is required."
          />
        ) : (
          <div className="admissionRequestList">
            {overview.join_requests.map(request => (
              <article key={request.id} className="admissionRequestCard">
                <div className="admissionRequestTop">
                  <div>
                    <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                    <Badge tone="info">{approvalModeLabel(request.approval_mode)}</Badge>
                    {request.my_vote && <Badge tone="purple">You voted {request.my_vote}</Badge>}
                  </div>
                  <small>{new Date(request.created_at).toLocaleString()}</small>
                </div>

                <div>
                  <h4>{request.requester_name}</h4>
                  <p>{request.requester_email} · Trust {request.requester_trust_score_live ?? request.requester_trust_score ?? 0}</p>
                  {request.invited_by_name && <p>Proposed by {request.invited_by_name}</p>}
                  {request.message && <p>{request.message}</p>}
                </div>

                <div className="admissionVoteLine">
                  <span>{request.approve_count} approvals</span>
                  <span>{request.decline_count} declines</span>
                </div>

                {request.status === 'pending' && (
                  <div className="admissionActions">
                    <Button
                      type="button"
                      size="sm"
                      loading={busy === `join-${request.id}`}
                      onClick={() => voteJoin(request, 'approve')}
                    >
                      Approve
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      loading={busy === `join-${request.id}`}
                      onClick={() => voteJoin(request, 'decline')}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admissionRequestSection">
        <h3>Leave group</h3>

        <div className="leaveRequestBox">
          <label>
            Optional leave note
            <textarea
              value={leaveMessage}
              onChange={event => setLeaveMessage(event.target.value)}
              placeholder="Optional: explain why you need to leave."
            />
          </label>

          <Button
            type="button"
            variant="secondary"
            loading={busy === 'leave-group'}
            onClick={leaveGroup}
          >
            {overview.can_leave_now ? 'Leave group' : 'Request to leave'}
          </Button>
        </div>
      </section>

      <section className="admissionRequestSection">
        <h3>Leave requests</h3>

        {overview.leave_requests.length === 0 ? (
          <EmptyState
            icon="✓"
            title="No leave requests"
            description="Leave requests from locked groups will appear here."
          />
        ) : (
          <div className="admissionRequestList">
            {overview.leave_requests.map(request => (
              <article key={request.id} className="admissionRequestCard">
                <div className="admissionRequestTop">
                  <div>
                    <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                    <Badge tone="info">{approvalModeLabel(request.approval_mode)}</Badge>
                    {request.my_vote && <Badge tone="purple">You voted {request.my_vote}</Badge>}
                  </div>
                  <small>{new Date(request.created_at).toLocaleString()}</small>
                </div>

                <div>
                  <h4>{request.requester_name}</h4>
                  <p>{request.requester_email}</p>
                  {request.message && <p>{request.message}</p>}
                </div>

                <div className="admissionVoteLine">
                  <span>{request.approve_count} approvals</span>
                  <span>{request.decline_count} declines</span>
                </div>

                {request.status === 'pending' && (
                  <div className="admissionActions">
                    <Button
                      type="button"
                      size="sm"
                      loading={busy === `leave-${request.id}`}
                      onClick={() => voteLeave(request, 'approve')}
                    >
                      Approve
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      loading={busy === `leave-${request.id}`}
                      onClick={() => voteLeave(request, 'decline')}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </Card>
  )
}