import { useEffect, useState } from 'react'
import { ActionBanner, Badge, ButtonLink, Card, Skeleton } from '../../../components/ui/ui'
import { communityGrowthApi } from '../../../api/communityGrowthApi'
import type { ReviewPromptMember } from '../../../api/communityGrowthApi'

type Props = {
  groupId: string
}

export default function CycleReviewPrompt({ groupId }: Props) {
  const [loading, setLoading] = useState(true)
  const [completedCycles, setCompletedCycles] = useState(0)
  const [members, setMembers] = useState<ReviewPromptMember[]>([])
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await communityGrowthApi.groupReviewPrompts(groupId)
      setCompletedCycles(data.completed_cycle_count)
      setMembers(data.pending_members)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load review prompts')
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
        title="Review prompts unavailable"
        description={error}
        icon="!"
      />
    )
  }

  if (completedCycles <= 0 || members.length === 0) return null

  return (
    <Card
      wide
      eyebrow="Cycle complete"
      title="Leave quick feedback for your circle"
      description="Reviews help members build a stronger Trust Passport after successful cycles."
      actions={<Badge tone="purple">{members.length} waiting</Badge>}
    >
      <ActionBanner
        tone="success"
        title={`${completedCycles} completed cycle${completedCycles === 1 ? '' : 's'} detected`}
        description="You can now review members you have shared this group with."
        icon="★"
        action={<a className="button secondary small" href="#member-review-panel">Review members</a>}
      />

      <div className="reviewPromptGrid">
        {members.slice(0, 6).map(member => (
          <div key={member.user_id} className="reviewPromptMember">
            <span>{member.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{member.name}</strong>
              <small>{member.role} · Trust {member.trust_score}</small>
            </div>
            <ButtonLink size="sm" variant="ghost" to={`/reviews/${member.user_id}`}>
              View
            </ButtonLink>
          </div>
        ))}
      </div>
    </Card>
  )
}