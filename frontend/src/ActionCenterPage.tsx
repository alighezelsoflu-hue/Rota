import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionBanner, Badge, ButtonLink, Card, EmptyState, PageHeader, Skeleton } from './ui'
import { platformApi } from './platformApi'
import type { ActionItem } from './platformApi'

function toneForPriority(priority: string) {
  if (priority === 'high') return 'danger'
  if (priority === 'medium') return 'warning'
  return 'info'
}

export default function ActionCenterPage() {
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await platformApi.actionItems()
      setItems(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load action items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const highCount = items.filter(item => item.priority === 'high').length
  const mediumCount = items.filter(item => item.priority === 'medium').length

  return (
    <div className="platformPage">
      <PageHeader
        eyebrow="Action Center"
        title="What needs your attention"
        description="Payments, confirmations, agreements, votes, requests, and unread messages are collected here."
        meta={
          <>
            <Badge tone={highCount ? 'danger' : 'success'}>{highCount} high priority</Badge>
            <Badge tone={mediumCount ? 'warning' : 'success'}>{mediumCount} medium priority</Badge>
          </>
        }
        actions={<ButtonLink to="/dashboard" variant="secondary">Dashboard</ButtonLink>}
      />

      {error && (
        <ActionBanner
          tone="danger"
          title="Could not load action center"
          description={error}
          icon="!"
        />
      )}

      <Card eyebrow="Open actions" title="Action required">
        {loading ? (
          <Skeleton variant="card" />
        ) : items.length === 0 ? (
          <EmptyState
            icon="✓"
            title="You are all caught up"
            description="No pending payments, confirmations, agreement tasks, votes, join requests, or unread messages were found."
            action={<ButtonLink to="/discover">Discover circles</ButtonLink>}
            secondaryAction={<ButtonLink to="/messages" variant="secondary">Messages</ButtonLink>}
          />
        ) : (
          <div className="actionItemList">
            {items.map(item => (
              <Link key={item.id} className="actionItemCard" to={item.url}>
                <div>
                  <Badge tone={toneForPriority(item.priority)}>{item.priority}</Badge>
                  <Badge status={item.type} />
                </div>

                <h3>{item.title}</h3>
                <p>{item.body}</p>

                {item.group_name && <small>{item.group_name}</small>}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}