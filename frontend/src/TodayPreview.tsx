import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, ButtonLink, Card, EmptyState, Skeleton } from './ui'
import { platformApi } from './platformApi'
import type { ActionItem } from './platformApi'

function priorityTone(priority: string) {
  if (priority === 'high') return 'danger'
  if (priority === 'medium') return 'warning'
  return 'info'
}

function typeLabel(type: string) {
  return type.replace(/_/g, ' ')
}

export default function TodayPreview() {
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)

    try {
      const data = await platformApi.actionItems()
      setItems(data.items)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const topItems = items.slice(0, 4)
  const highCount = items.filter(item => item.priority === 'high').length

  return (
    <Card
      className="todayPreviewCard wide"
      eyebrow="Today"
      title="Action required"
      description="Your most important payment, agreement, vote, request, and message tasks."
      actions={<ButtonLink to="/actions" variant="secondary" size="sm">Open Action Center</ButtonLink>}
    >
      {loading ? (
        <Skeleton variant="card" />
      ) : topItems.length === 0 ? (
        <EmptyState
          icon="✓"
          title="You are all caught up"
          description="No urgent actions were found. You can review groups, discover trusted circles, or check messages."
          action={<ButtonLink to="/discover">Discover circles</ButtonLink>}
          secondaryAction={<ButtonLink to="/messages" variant="secondary">Messages</ButtonLink>}
        />
      ) : (
        <>
          <div className="todaySummaryLine">
            <Badge tone={highCount > 0 ? 'danger' : 'success'}>
              {highCount} high priority
            </Badge>
            <Badge tone={items.length > 0 ? 'warning' : 'success'}>
              {items.length} open action{items.length === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="todayActionGrid">
            {topItems.map(item => (
              <Link key={item.id} to={item.url} className="todayActionCard">
                <div>
                  <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
                  <Badge tone="neutral">{typeLabel(item.type)}</Badge>
                </div>

                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}