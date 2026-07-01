import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getToken } from './api'
import { ActionBanner, Badge, Button, ButtonLink, Card, EmptyState, PageHeader, Skeleton, StatCard } from './ui'
import { communityGrowthApi } from './communityGrowthApi'
import type { PublicGroupInvite } from './communityGrowthApi'
import ProductPrinciples from './ProductPrinciples'
import { groupOperationsApi } from './groupOperationsApi'

export default function PublicInvitePage() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()

  const [invite, setInvite] = useState<PublicGroupInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    if (!inviteCode) return

    setLoading(true)
    setError('')

    try {
      const data = await communityGrowthApi.publicGroupInvite(inviteCode)
      setInvite(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite not found')
      setInvite(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [inviteCode])

  async function joinGroup() {
    if (!inviteCode) return

    if (!getToken()) {
      navigate('/register')
      return
    }

    setJoining(true)
    setError('')
    setMessage('')

    try {
      const result = await groupOperationsApi.joinByInvite(inviteCode)

      if (result.status === 'approval_required') {
        setMessage('Your request was sent to the organizer for approval.')
        return
      }

      setMessage('You joined the group.')
      navigate(`/groups/${result.group.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join group')
    } finally {
      setJoining(false)
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(window.location.href)
    setMessage('Invite link copied.')
  }

  if (loading) return <Skeleton variant="page" />

  if (error && !invite) {
    return (
      <div className="publicInvitePage">
        <EmptyState
          icon="?"
          title="Invite not found"
          description={error}
          action={<ButtonLink to="/">Go home</ButtonLink>}
        />
      </div>
    )
  }

  if (!invite) return null

  const group = invite.group
  const estimatedPot = group.contribution_amount * group.member_limit
  const isLoggedIn = Boolean(getToken())

  return (
    <div className="publicInvitePage">
      <PageHeader
        eyebrow="Rota group invite"
        title={`Join ${group.name}`}
        description={`${invite.organizer_name} invited you to an interest-free coordination circle. Rota records agreement, proof, confirmations, and trust signals — it does not hold money.`}
        meta={
          <>
            <Badge tone="success">Rota holds €0</Badge>
            <Badge tone="info">Invite code {group.invite_code}</Badge>
            <Badge status={group.status} />
          </>
        }
        actions={
          <>
            <Button type="button" onClick={joinGroup} loading={joining}>
              {isLoggedIn ? 'Join or request access' : 'Create account to join'}
            </Button>
            <Button type="button" variant="secondary" onClick={copyInvite}>
              Copy invite
            </Button>
          </>
        }
      />

      {error && (
        <ActionBanner
          tone="danger"
          title="Could not join"
          description={error}
          icon="!"
        />
      )}

      {message && (
        <ActionBanner
          tone="success"
          title="Done"
          description={message}
          icon="✓"
        />
      )}

      <section className="statsGrid">
        <StatCard label="Contribution" value={`${group.contribution_amount} ${group.currency}`} icon="◎" tone="info" />
        <StatCard label="Estimated pot" value={`${estimatedPot} ${group.currency}`} icon="↗" tone="success" />
        <StatCard label="Members" value={`${invite.member_count}/${group.member_limit}`} icon="👥" tone="purple" />
        <StatCard label="Open slots" value={invite.open_slots} icon="+" tone={invite.open_slots > 0 ? 'success' : 'neutral'} />
      </section>

      <section className="publicInviteGrid">
        <Card eyebrow="Circle details" title={group.name}>
          <div className="publicInviteDetails">
            <div>
              <span>Frequency</span>
              <strong>{group.frequency}</strong>
            </div>
            <div>
              <span>Payout method</span>
              <strong>{group.payout_method.replace(/_/g, ' ')}</strong>
            </div>
            <div>
              <span>Organizer</span>
              <strong>{invite.organizer_name}</strong>
            </div>
            <div>
              <span>Invite code</span>
              <strong>{group.invite_code}</strong>
            </div>
          </div>
        </Card>

        <Card eyebrow="Safety note" title="Rota is coordination-only">
          <ul className="checkList compact">
            <li>Rota does not hold deposits.</li>
            <li>Members pay each other directly outside the app.</li>
            <li>Payment proof and confirmations are recorded.</li>
            <li>Disputes are tracked with structured records.</li>
            <li>Groups can use agreements, reviews, and audit logs.</li>
          </ul>
        </Card>
      </section>

      {invite.discovery?.message && (
        <ActionBanner
          tone="info"
          title="Organizer message"
          description={invite.discovery.message}
          icon="◎"
        />
      )}

      {!isLoggedIn && (
        <Card className="publicInviteSignup">
          <h2>New to Rota?</h2>
          <p>
            Create an account to join this invite, accept the Circle Commitment, and build your Trust Passport.
          </p>

          <div className="actions">
            <ButtonLink to="/register">Create account</ButtonLink>
            <ButtonLink to="/login" variant="secondary">Log in</ButtonLink>
          </div>
        </Card>
      )}

      <ProductPrinciples compact />

      <p className="publicInviteFooter">
        Already have the app open? Use invite code <strong>{group.invite_code}</strong> from your dashboard.
      </p>
    </div>
  )
}