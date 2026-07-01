import { useEffect, useState } from 'react'
import { ActionBanner, Badge, Card, Skeleton, StatCard } from './ui'
import { groupOperationsApi } from './groupOperationsApi'
import type { GroupCommandCenter } from './groupOperationsApi'

type Props = {
  groupId: string
  fallback: {
    memberCount: number
    confirmedTotal: number
    expectedTotal: number
    pendingCount: number
    currentCycleLabel: string
  }
}

export default function GroupTodayCard({ groupId, fallback }: Props) {
  const [data, setData] = useState<GroupCommandCenter | null>(null)
  const [loading, setLoading] = useState(true)
  const [softError, setSoftError] = useState('')

  async function load() {
    setLoading(true)
    setSoftError('')

    try {
      setData(await groupOperationsApi.commandCenter(groupId))
    } catch {
      setSoftError('Live command center could not refresh. Showing local group summary.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  if (loading) return <Skeleton variant="card" />

  const stats = data?.contribution_stats
  const confirmed = stats?.confirmed_total ?? fallback.confirmedTotal
  const expected = stats?.expected_total ?? fallback.expectedTotal
  const pending = stats?.pending_count ?? fallback.pendingCount
  const members = data?.member_count ?? fallback.memberCount
  const lateCases = data?.open_late_cases ?? 0
  const disputes = data?.open_disputes ?? 0
  const unread = data?.unread_messages ?? 0

  const isHealthy = pending === 0 && lateCases === 0 && disputes === 0
  const nextAction = data?.next_action || 'Review the current cycle and group activity.'

  return (
    <Card
      wide
      className="groupTodayCard"
      eyebrow="Today"
      title="What matters now"
      description="A compact summary of the current cycle, payment status, and next action."
      actions={<Badge tone={isHealthy ? 'success' : 'warning'} dot>{isHealthy ? 'Clear' : 'Needs attention'}</Badge>}
    >
      {softError && (
        <ActionBanner
          tone="warning"
          title="Live summary unavailable"
          description={softError}
          icon="!"
        />
      )}

      <ActionBanner
        tone={isHealthy ? 'success' : 'warning'}
        title="Suggested next action"
        description={nextAction}
        icon={isHealthy ? '✓' : '!'}
      />

      <div className="compactTodayGrid">
        <StatCard label="Confirmed" value={`${confirmed}/${expected}`} icon="✓" tone={confirmed >= expected && expected > 0 ? 'success' : 'warning'} />
        <StatCard label="Pending" value={pending} icon="…" tone={pending > 0 ? 'warning' : 'success'} />
        <StatCard label="Members" value={members} icon="👥" tone="info" />
        <StatCard label="Issues" value={lateCases + disputes} icon="!" tone={lateCases + disputes > 0 ? 'danger' : 'success'} />
        <StatCard label="Unread chat" value={unread} icon="✉" tone={unread > 0 ? 'warning' : 'neutral'} />
        <StatCard label="Cycle" value={fallback.currentCycleLabel} icon="◎" tone="purple" />
      </div>
    </Card>
  )
}