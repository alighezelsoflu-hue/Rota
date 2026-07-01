import { Link, useNavigate } from 'react-router-dom'
import type { User } from './api'
import { ActionBanner, Badge, Button, ButtonLink, Card, PageHeader, StatCard } from './ui'

type Props = {
  user: User
}

export default function OnboardingPage({ user }: Props) {
  const navigate = useNavigate()

  function finish() {
    localStorage.setItem('rota-onboarding-complete', 'true')
    navigate('/dashboard')
  }

  return (
    <div className="onboardingPage">
      <PageHeader
        eyebrow="Welcome to Rota"
        title={`Welcome, ${user.name}`}
        description="Rota helps trusted groups coordinate interest-free savings circles. Start by creating a circle, joining one, or exploring trusted discovery."
        meta={
          <>
            <Badge tone="success">Rota holds €0</Badge>
            <Badge tone="info">Coordination only</Badge>
            <Badge tone="purple">Trust network</Badge>
          </>
        }
      />

      <ActionBanner
        tone="success"
        title="Rota does not hold money"
        description="Members pay each other directly outside the app. Rota records proof, confirmations, reviews, agreements, and trust signals."
        icon="0%"
      />

      <section className="onboardingStats">
        <StatCard label="Platform balance" value="€0" description="Rota does not custody funds" icon="0%" tone="success" />
        <StatCard label="Trust Passport" value="Starts now" description="Build history through groups" icon="★" tone="purple" />
        <StatCard label="Discovery" value="Optional" description="You control visibility" icon="◎" tone="info" />
      </section>

      <section className="onboardingGrid">
        <Card eyebrow="Step 1" title="Create or join a trusted circle">
          <p>
            Start with people you already know, or use discovery carefully to find groups looking for members.
          </p>

          <div className="onboardingActions">
            <ButtonLink to="/groups/new">Create a circle</ButtonLink>
            <ButtonLink to="/dashboard" variant="secondary">Join with invite code</ButtonLink>
          </div>
        </Card>

        <Card eyebrow="Step 2" title="Accept the Circle Commitment">
          <p>
            Members agree to stay after the first cycle starts until every active member has received once.
          </p>

          <ul className="checkList compact">
            <li>No interest charged by the group</li>
            <li>No platform wallet or balance</li>
            <li>Proof and confirmations are recorded</li>
            <li>Stop/continue decisions are transparent</li>
          </ul>
        </Card>

        <Card eyebrow="Step 3" title="Build your Trust Passport">
          <p>
            Your Trust Passport grows from completed circles, reliable payments, confirmations, reviews, and trusted connections.
          </p>

          <div className="onboardingActions">
            <ButtonLink to="/trust-passport" variant="secondary">View Trust Passport</ButtonLink>
            <ButtonLink to="/discover" variant="secondary">Open discovery</ButtonLink>
          </div>
        </Card>
      </section>

      <Card className="onboardingFinal">
        <h2>Ready to continue?</h2>
        <p>
          You can always return to the simulator, discovery, settings, and Trust Passport from your profile menu.
        </p>

        <div className="onboardingActions centered">
          <Button type="button" onClick={finish}>Continue to dashboard</Button>
          <Link className="ghost" to="/simulator">Try simulator first</Link>
        </div>
      </Card>
    </div>
  )
}