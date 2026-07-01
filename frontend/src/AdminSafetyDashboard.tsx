import { useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, Card, EmptyState, PageHeader, Skeleton, StatCard } from './ui'
import { adminSafetyApi } from './adminSafetyApi'
import type { AdminSafetyOverview } from './adminSafetyApi'

export default function AdminSafetyDashboard() {
  const [data, setData] = useState<AdminSafetyOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      setData(await adminSafetyApi.overview())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin safety dashboard')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <Skeleton variant="page" />

  if (error) {
    return (
      <div className="adminSafetyPage">
        <ActionBanner
          tone="danger"
          title="Admin safety unavailable"
          description={error}
          icon="!"
          action={<Button type="button" variant="secondary" onClick={load}>Retry</Button>}
        />
      </div>
    )
  }

  if (!data) return null

  const summary = data.summary
  const needsAttention =
    summary.open_disputes +
    summary.message_reports +
    summary.pending_join_requests +
    summary.pending_connection_requests

  return (
    <div className="adminSafetyPage">
      <PageHeader
        eyebrow="Admin safety"
        title="Platform safety dashboard"
        description="Monitor operational risk, disputes, reports, pending requests, and recent activity."
        meta={
          <>
            <Badge tone={needsAttention > 0 ? 'danger' : 'success'}>{needsAttention} items</Badge>
            <Badge tone="info">Internal only</Badge>
          </>
        }
        actions={<Button type="button" variant="secondary" onClick={load}>Refresh</Button>}
      />

      <section className="statsGrid">
        <StatCard label="Users" value={summary.total_users} icon="👥" tone="info" />
        <StatCard label="Groups" value={summary.total_groups} icon="◎" tone="purple" />
        <StatCard label="Active groups" value={summary.active_groups} icon="↗" tone="success" />
        <StatCard label="Open disputes" value={summary.open_disputes} icon="!" tone={summary.open_disputes > 0 ? 'danger' : 'success'} />
        <StatCard label="Message reports" value={summary.message_reports} icon="⚑" tone={summary.message_reports > 0 ? 'warning' : 'success'} />
        <StatCard label="Join requests" value={summary.pending_join_requests} icon="+" tone={summary.pending_join_requests > 0 ? 'warning' : 'neutral'} />
        <StatCard label="Connection requests" value={summary.pending_connection_requests} icon="↔" tone={summary.pending_connection_requests > 0 ? 'warning' : 'neutral'} />
        <StatCard label="Resolved disputes" value={summary.resolved_disputes} icon="✓" tone="success" />
      </section>

      <section className="adminSafetyGrid">
        <Card wide eyebrow="Risk groups" title="Groups with dispute activity">
          {data.high_dispute_groups.length === 0 ? (
            <EmptyState
              icon="✓"
              title="No dispute-heavy groups"
              description="No groups currently show dispute concentration."
            />
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Total disputes</th>
                    <th>Open disputes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.high_dispute_groups.map(group => (
                    <tr key={group.group_id}>
                      <td>{group.group_name}</td>
                      <td>{group.total_disputes}</td>
                      <td>
                        <Badge tone={group.open_disputes > 0 ? 'danger' : 'success'}>
                          {group.open_disputes}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card wide eyebrow="Reports" title="Recent message reports">
          {data.recent_message_reports.length === 0 ? (
            <EmptyState
              icon="✓"
              title="No message reports"
              description="Reported messages will appear here for review."
            />
          ) : (
            <div className="adminReportList">
              {data.recent_message_reports.map(report => (
                <article key={report.id} className="adminReportCard">
                  <div>
                    <Badge tone="warning">Reported</Badge>
                    <small>{new Date(report.created_at).toLocaleString()}</small>
                  </div>
                  <strong>{report.reason}</strong>
                  <p>{report.message_body}</p>
                  <span>Reporter: {report.reporter_name} · Sender: {report.sender_name}</span>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card wide eyebrow="Growth" title="Recent signups">
          {data.recent_signups.length === 0 ? (
            <EmptyState
              icon="?"
              title="No users found"
              description="Recent signups will appear here."
            />
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Trust</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_signups.map(user => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.trust_score}</td>
                      <td><Badge status={user.verification_status || 'unknown'} /></td>
                      <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}