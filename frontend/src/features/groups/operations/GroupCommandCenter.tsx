import { useEffect, useState } from 'react'
import { ActionBanner, Badge, ButtonLink, Card, Skeleton, StatCard } from '../../../components/ui/ui'
import { groupOperationsApi } from '../../../api/groupOperationsApi'
import type { GroupCommandCenter as GroupCommandCenterType } from '../../../api/groupOperationsApi'

type Props = {
  groupId: string
}

export default function GroupCommandCenter({ groupId }: Props) {
  const [data, setData] = useState<GroupCommandCenterType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      setData(await groupOperationsApi.commandCenter(groupId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load group command center')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  if (loading) return <Skeleton variant="card" />

  if (error) {
    return (
      <ActionBanner
        tone="danger"
        title="Command center unavailable"
        description={error}
        icon="!"
      />
    )
  }

  if (!data) return null

  const stats = data.contribution_stats
  const progress = stats.expected_total ? Math.round((stats.confirmed_total / stats.expected_total) * 100) : 0
  const healthTone = data.open_disputes || data.open_late_cases ? 'danger' : stats.pending_count ? 'warning' : 'success'

  return (
    <Card
      wide
      className="groupCommandCenter"
      eyebrow="Command center"
      title="What needs attention now"
      description="A quick operational view of this circle’s current cycle, member readiness, payments, disputes, and announcements."
      actions={<Badge tone={healthTone} dot>{healthTone === 'success' ? 'Healthy' : 'Needs attention'}</Badge>}
    >
      <ActionBanner
        tone={healthTone}
        title="Suggested next action"
        description={data.next_action}
        icon={healthTone === 'success' ? '✓' : '!'}
        action={<ButtonLink to="/actions" variant="secondary" size="sm">Open actions</ButtonLink>}
      />

      <section className="statsGrid compactStats">
        <StatCard label="Members" value={data.member_count} icon="👥" tone="info" />
        <StatCard label="Confirmed" value={`${stats.confirmed_total}`} icon="✓" tone="success" />
        <StatCard label="Pending" value={stats.pending_count} icon="…" tone={stats.pending_count > 0 ? 'warning' : 'success'} />
        <StatCard label="Late cases" value={data.open_late_cases} icon="!" tone={data.open_late_cases > 0 ? 'danger' : 'success'} />
        <StatCard label="Disputes" value={data.open_disputes} icon="⚑" tone={data.open_disputes > 0 ? 'danger' : 'success'} />
        <StatCard label="Unread chat" value={data.unread_messages} icon="✉" tone={data.unread_messages > 0 ? 'warning' : 'neutral'} />
      </section>

      <div className="groupCommandProgress">
        <div>
          <strong>Cycle progress</strong>
          <span>{progress}% confirmed</span>
        </div>
        <div className="progress">
          <span style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>

      {data.current_cycle && (
        <div className="commandCycleCard">
          <div>
            <span>Current cycle</span>
            <strong>Cycle {data.current_cycle.cycle_number}</strong>
          </div>
          <div>
            <span>Receiver</span>
            <strong>{data.current_cycle.receiver_name || 'Not assigned'}</strong>
          </div>
          <div>
            <span>Due date</span>
            <strong>{new Date(data.current_cycle.due_date).toLocaleDateString()}</strong>
          </div>
        </div>
      )}
    </Card>
  )
}