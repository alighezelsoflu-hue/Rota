import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ActionBanner, Badge, ButtonLink, Card, EmptyState, PageHeader, Skeleton, StatCard } from '../../components/ui/ui'
import { platformApi } from '../../api/platformApi'
import type { TrustPassport } from '../../api/platformApi'

function rate(value: number | null) {
  return value === null ? 'Not enough data' : `${value}%`
}

export default function TrustPassportPage() {
  const { userId } = useParams()
  const [passport, setPassport] = useState<TrustPassport | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')

    try {
      setPassport(userId ? await platformApi.userTrustPassport(userId) : await platformApi.myTrustPassport())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Trust Passport')
    }
  }

  useEffect(() => {
    load()
  }, [userId])

  if (error) {
    return (
      <div className="platformPage">
        <ActionBanner tone="danger" title="Trust Passport unavailable" description={error} icon="!" />
      </div>
    )
  }

  if (!passport) {
    return (
      <div className="platformPage">
        <Skeleton variant="page" />
      </div>
    )
  }

  return (
    <div className="platformPage">
      <PageHeader
        eyebrow="Trust Passport"
        title={passport.user.name}
        description="A community trust profile based only on Rota group activity, contribution records, reviews, and connections."
        meta={
          <>
            <Badge tone="success">Trust {passport.summary.trust_score}</Badge>
            <Badge status={passport.user.verification_status} />
            <Badge tone="purple">{passport.level}</Badge>
          </>
        }
        actions={
          <>
            <ButtonLink to="/settings" variant="secondary">Settings</ButtonLink>
            <ButtonLink to="/discover" variant="secondary">Discover</ButtonLink>
          </>
        }
      />

      <ActionBanner
        tone="info"
        title="Not a credit score"
        description={passport.disclaimer}
        icon="◎"
      />

      <section className="trustPassportStats">
        <StatCard label="Groups joined" value={passport.summary.groups_total} tone="info" icon="◎" />
        <StatCard label="Completed groups" value={passport.summary.groups_completed} tone="success" icon="✓" />
        <StatCard label="Organizer history" value={passport.summary.groups_organized} tone="purple" icon="★" />
        <StatCard label="Connections" value={passport.summary.accepted_connections} tone="info" icon="↗" />
        <StatCard label="Average rating" value={passport.summary.average_rating || '-'} tone="success" icon="★" />
        <StatCard label="Reviews" value={passport.summary.review_count} tone="purple" icon="◷" />
      </section>

      <Card eyebrow="Reliability" title="Contribution activity">
        <div className="passportMetricGrid">
          <div>
            <span>Contributions</span>
            <strong>{passport.metrics.contribution_count}</strong>
          </div>
          <div>
            <span>Marked paid</span>
            <strong>{passport.metrics.marked_paid_count}</strong>
          </div>
          <div>
            <span>Confirmed</span>
            <strong>{passport.metrics.confirmed_count}</strong>
          </div>
          <div>
            <span>On-time rate</span>
            <strong>{rate(passport.metrics.on_time_rate)}</strong>
          </div>
          <div>
            <span>Confirmation rate</span>
            <strong>{rate(passport.metrics.confirmation_rate)}</strong>
          </div>
          <div>
            <span>Receiver confirmation rate</span>
            <strong>{rate(passport.metrics.receiver_confirmation_rate)}</strong>
          </div>
          <div>
            <span>Dispute rate</span>
            <strong>{passport.metrics.dispute_rate}%</strong>
          </div>
        </div>
      </Card>

      <Card eyebrow="Review tags" title="What people mention">
        {passport.top_tags.length === 0 ? (
          <EmptyState
            title="No public review tags yet"
            description="Tags appear after members review each other from shared Rota groups."
          />
        ) : (
          <div className="reviewTagList large">
            {passport.top_tags.map(item => (
              <span key={item.tag}>{item.tag} × {item.count}</span>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}