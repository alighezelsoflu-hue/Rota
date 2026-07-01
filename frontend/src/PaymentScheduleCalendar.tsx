import { useEffect, useState } from 'react'
import { ActionBanner, Badge, Card, EmptyState, Skeleton } from './ui'
import { groupOperationsApi } from './groupOperationsApi'
import type { PaymentScheduleCycle } from './groupOperationsApi'

type Props = {
  groupId: string
}

function cycleTone(cycle: PaymentScheduleCycle) {
  if (cycle.disputed_count > 0) return 'danger'
  if (cycle.pending_count > 0 && new Date(cycle.due_date) < new Date()) return 'warning'
  if (cycle.contribution_count > 0 && cycle.confirmed_total >= cycle.expected_total) return 'success'
  return 'info'
}

export default function PaymentScheduleCalendar({ groupId }: Props) {
  const [cycles, setCycles] = useState<PaymentScheduleCycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await groupOperationsApi.schedule(groupId)
      setCycles(data.cycles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payment schedule')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  if (loading) return <Skeleton variant="card" />

  return (
    <Card
      wide
      eyebrow="Schedule"
      title="Payment schedule calendar"
      description="Review upcoming and completed cycles, due dates, receivers, expected totals, and payment progress."
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Schedule unavailable"
          description={error}
          icon="!"
        />
      )}

      {cycles.length === 0 ? (
        <EmptyState
          icon="◎"
          title="No cycles yet"
          description="Once cycles are created, the payment schedule will appear here."
        />
      ) : (
        <div className="scheduleTimeline">
          {cycles.map(cycle => {
            const progress = cycle.expected_total ? Math.round((cycle.confirmed_total / cycle.expected_total) * 100) : 0

            return (
              <article key={cycle.id} className="scheduleCycleCard">
                <div className="scheduleCycleMarker">
                  <span>{cycle.cycle_number}</span>
                </div>

                <div className="scheduleCycleBody">
                  <div className="scheduleCycleTop">
                    <div>
                      <strong>Cycle {cycle.cycle_number}</strong>
                      <small>Due {new Date(cycle.due_date).toLocaleDateString()}</small>
                    </div>

                    <Badge tone={cycleTone(cycle)}>{cycle.status}</Badge>
                  </div>

                  <div className="scheduleCycleGrid">
                    <div>
                      <span>Receiver</span>
                      <strong>{cycle.receiver_name || 'Not assigned'}</strong>
                    </div>
                    <div>
                      <span>Expected</span>
                      <strong>{cycle.expected_total}</strong>
                    </div>
                    <div>
                      <span>Confirmed</span>
                      <strong>{cycle.confirmed_total}</strong>
                    </div>
                    <div>
                      <span>Pending</span>
                      <strong>{cycle.pending_count}</strong>
                    </div>
                  </div>

                  <div className="progress">
                    <span style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </Card>
  )
}