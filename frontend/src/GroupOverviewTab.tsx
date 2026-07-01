import { FormEvent } from 'react'
import type { Contribution, GroupDetail, User } from './api'
import { Badge, Button, ButtonLink, Card, EmptyState, StatCard } from './ui'
import GroupTodayCard from './GroupTodayCard'
import GroupHealthPanel from './GroupHealthPanel'

type Props = {
  detail: GroupDetail
  user: User
  isOrganizer: boolean
  currentCycle: any | null
  currentContributions: Contribution[]
  dueDate: string
  setDueDate: (value: string) => void
  onCreateCycle: (event: FormEvent) => Promise<void>
}

export default function GroupOverviewTab({
  detail,
  user,
  isOrganizer,
  currentCycle,
  currentContributions,
  dueDate,
  setDueDate,
  onCreateCycle,
}: Props) {
  const expectedTotal = currentContributions.reduce((sum, contribution) => sum + contribution.amount, 0)

  const confirmedTotal = currentContributions
    .filter(contribution => contribution.status === 'confirmed' || contribution.status === 'group_verified')
    .reduce((sum, contribution) => sum + contribution.amount, 0)

  const pendingCount = currentContributions.filter(contribution => contribution.status === 'pending').length
  const progressPercent = expectedTotal ? Math.round((confirmedTotal / expectedTotal) * 100) : 0

  const recentLogs = detail.audit_logs.slice(0, 5)

  return (
    <div className="groupWorkspacePanel">
      <GroupTodayCard
        groupId={detail.group.id}
        fallback={{
          memberCount: detail.members.length,
          confirmedTotal,
          expectedTotal,
          pendingCount,
          currentCycleLabel: currentCycle ? String(currentCycle.cycle_number) : 'None',
        }}
      />

      <section className="compactWorkspaceGrid">
        <Card
          className="workspacePrimaryCard"
          eyebrow="Current cycle"
          title={currentCycle ? `Cycle ${currentCycle.cycle_number}` : 'No active cycle'}
          actions={currentCycle ? <Badge tone={progressPercent === 100 ? 'success' : 'warning'}>{progressPercent}% confirmed</Badge> : undefined}
        >
          {currentCycle ? (
            <>
              <div className="compactCycleSummary">
                <div>
                  <span>Receiver</span>
                  <strong>{currentCycle.receiver_name}</strong>
                </div>

                <div>
                  <span>Due date</span>
                  <strong>{new Date(currentCycle.due_date).toLocaleDateString()}</strong>
                </div>

                <div>
                  <span>Confirmed</span>
                  <strong>{confirmedTotal} / {expectedTotal} {detail.group.currency}</strong>
                </div>
              </div>

              <div className="progress compactProgress">
                <span style={{ width: `${Math.min(progressPercent, 100)}%` }} />
              </div>
            </>
          ) : (
            <EmptyState
              title="No cycle yet"
              description="Create a cycle after members accept the Circle Commitment."
            />
          )}

          {isOrganizer && (
            <form className="form compact compactCycleForm" onSubmit={onCreateCycle}>
              <label>
                Next cycle due date
                <input type="datetime-local" value={dueDate} onChange={event => setDueDate(event.target.value)} />
              </label>

              <Button type="submit">
                Create next cycle
              </Button>
            </form>
          )}
        </Card>

        <Card
          eyebrow="Members"
          title={`${detail.members.length} people`}
          actions={<ButtonLink to={`/reviews/${user.id}`} variant="ghost" size="sm">My reviews</ButtonLink>}
        >
          <div className="compactMemberPreview">
            {detail.members.slice(0, 4).map(member => (
              <div key={member.id}>
                <span className="avatar">{member.name?.slice(0, 1).toUpperCase() || '?'}</span>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <GroupHealthPanel groupId={detail.group.id} />

      <Card wide eyebrow="Recent activity" title="Latest group events">
        {recentLogs.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="New group events will appear here."
          />
        ) : (
          <div className="compactActivityList">
            {recentLogs.map(log => (
              <div key={log.id}>
                <span />
                <div>
                  <strong>{log.action.replace(/_/g, ' ')}</strong>
                  <small>{new Date(log.created_at).toLocaleString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}