import { useEffect, useState } from 'react'
import { api } from '../../../api/api'
import type { GroupGovernance } from '../../../api/api'

type Props = {
  groupId: string
  isOrganizer: boolean
  onChanged: () => Promise<void>
}

export default function GroupGovernancePanel({ groupId, isOrganizer, onChanged }: Props) {
  const [data, setData] = useState<GroupGovernance | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    setData(await api.governance(groupId))
  }

  useEffect(() => {
    load().catch(err => setError(err instanceof Error ? err.message : 'Could not load group agreement'))
  }, [groupId])

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(label)
    setError('')

    try {
      await action()
      await load()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy('')
    }
  }

  if (!data) {
    return <section className="card wide"><p className="mutedText">Loading circle agreement...</p></section>
  }

  const voteOpen = data.status === 'cycle_review'
  const memberAlreadyVoted = Boolean(data.my_vote)

  return (
    <section className="card wide governancePanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Circle agreement</p>
          <h2>Commitment and end-of-cycle rules</h2>
          <p className="mutedText">
            Members agree to stay in the loop after the first cycle starts. The group can stop only
            when all active members vote not to continue.
          </p>
        </div>

        <span className={`status ${data.status === 'cycle_review' ? 'pending' : data.status === 'completed' ? 'confirmed' : 'active'}`}>
          {data.status.replace(/_/g, ' ')}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      {!data.agreement_accepted && (
        <div className="agreementAcceptBox">
          <h3>Accept Circle Commitment</h3>
          <pre>{data.agreement_text}</pre>
          <button
            className="button"
            type="button"
            disabled={busy === 'accept'}
            onClick={() => run('accept', () => api.acceptAgreement(groupId))}
          >
            {busy === 'accept' ? 'Accepting...' : 'I understand and accept'}
          </button>
        </div>
      )}

      <div className="governanceStats">
        <div>
          <span>Agreement</span>
          <strong>{data.agreement_accepted ? 'Accepted' : 'Waiting'}</strong>
        </div>

        <div>
          <span>Rotation progress</span>
          <strong>{data.rotation_received_count}/{data.active_member_count}</strong>
        </div>

        <div>
          <span>Latest cycle</span>
          <strong>{data.latest_cycle_number || '-'}</strong>
        </div>

        <div>
          <span>Cycle complete</span>
          <strong>{data.latest_cycle_complete ? 'Yes' : 'No'}</strong>
        </div>
      </div>

      <div className="continuationBox">
        <div>
          <p className="eyebrow">End-of-cycle vote</p>
          <h3>Should this group continue another cycle?</h3>
          <p>
            Votes received: <strong>{data.vote_summary.votes_received}/{data.vote_summary.total_members}</strong>.
            Stop votes: <strong>{data.vote_summary.stop_votes}</strong>.
            Continue votes: <strong>{data.vote_summary.continue_votes}</strong>.
          </p>
        </div>

        {isOrganizer && data.permissions.can_open_continuation_vote && (
          <button
            className="button"
            type="button"
            disabled={busy === 'open'}
            onClick={() => run('open', () => api.openContinuationVote(groupId))}
          >
            {busy === 'open' ? 'Opening...' : 'Ask members whether to continue'}
          </button>
        )}

        {voteOpen && !memberAlreadyVoted && (
          <div className="voteActions">
            <button
              className="button secondary"
              type="button"
              disabled={busy === 'continue'}
              onClick={() => run('continue', () => api.castContinuationVote(groupId, 'continue'))}
            >
              Continue group
            </button>

            <button
              className="button"
              type="button"
              disabled={busy === 'stop'}
              onClick={() => run('stop', () => api.castContinuationVote(groupId, 'stop'))}
            >
              Stop after this cycle
            </button>
          </div>
        )}

        {voteOpen && memberAlreadyVoted && (
          <p className="safeNote noMargin">
            <span>Your vote:</span> {data.my_vote?.decision === 'stop' ? 'Stop after this cycle' : 'Continue group'}
          </p>
        )}

        {isOrganizer && data.permissions.can_close_group && (
          <button
            className="button"
            type="button"
            disabled={busy === 'close'}
            onClick={() => run('close', () => api.closeGroup(groupId))}
          >
            {busy === 'close' ? 'Closing...' : 'Close group after unanimous stop vote'}
          </button>
        )}

        {isOrganizer && data.permissions.can_archive_group && (
          <button
            className="button secondary"
            type="button"
            disabled={busy === 'archive'}
            onClick={() => run('archive', () => api.archiveGroup(groupId))}
          >
            {busy === 'archive' ? 'Archiving...' : 'Archive group from active dashboard'}
          </button>
        )}
      </div>
    </section>
  )
}