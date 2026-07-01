import { useEffect, useState } from 'react'
import { ActionBanner, Badge, Card, Skeleton, StatCard } from './ui'
import { platformApi } from './platformApi'
import type { GroupHealth } from './platformApi'

type Props = {
  groupId: string
}

export default function GroupHealthPanel({ groupId }: Props) {
  const [health, setHealth] = useState<GroupHealth | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi.groupHealth(groupId)
      .then(setHealth)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load group health'))
  }, [groupId])

  if (error) {
    return (
      <ActionBanner
        tone="warning"
        title="Group health unavailable"
        description={error}
        icon="!"
      />
    )
  }

  if (!health) {
    return <Skeleton variant="card" />
  }

  return (
    <Card
      wide
      eyebrow="Group health"
      title={`${health.label} · ${health.score}/100`}
      description="Group health combines agreement status, contribution progress, payment confirmations, and disputes."
      actions={<Badge tone={health.tone} dot>{health.label}</Badge>}
    >
      <section className="groupHealthGrid">
        <StatCard label="Health score" value={`${health.score}/100`} tone={health.tone} icon="◎" />
        <StatCard label="Active members" value={health.members.active_members} tone="success" icon="✓" />
        <StatCard label="Pending agreements" value={health.members.pending_agreements} tone={health.members.pending_agreements ? 'warning' : 'success'} icon="!" />
        <StatCard label="Confirmed rows" value={health.contributions.confirmed + health.contributions.group_verified} tone="success" icon="✓" />
        <StatCard label="Pending rows" value={health.contributions.pending} tone={health.contributions.pending ? 'warning' : 'success'} icon="…" />
        <StatCard label="Disputes" value={health.contributions.disputed} tone={health.contributions.disputed ? 'danger' : 'success'} icon="!" />
      </section>

      <div className="groupHealthSignals">
        {health.signals.map(signal => (
          <ActionBanner
            key={signal}
            tone={health.tone}
            title={signal}
            icon={health.tone === 'success' ? '✓' : '!'}
          />
        ))}
      </div>
    </Card>
  )
}