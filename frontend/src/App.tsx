import React, { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { api, clearToken, getToken, setToken } from './api'
import type {
  Contribution,
  Group,
  GroupDetail,
  User,
} from './api'
import {
  ActionBanner,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
} from './ui'
import CircleCalculator from './CircleCalculator'
import ProductPrinciples from './ProductPrinciples'
import LiveCircleSimulator from './LiveCircleSimulator'
import RotaLogo from './RotaLogo'
import NetworkBackground from './NetworkBackground'
import ThemeToggle from './ThemeToggle'
import TrustNetworkDashboard from './TrustNetworkDashboard'
import GroupGovernancePanel from './GroupGovernancePanel'
import ReceiptReviewActions from './ReceiptReviewActions'
import DiscoverPage from './DiscoverPage'
import ReviewsPage from './ReviewsPage'
import MemberReviewPanel from './MemberReviewPanel'
import MessagesPage from './MessagesPage'
import GroupChatPanel from './GroupChatPanel'
import ActionCenterPage from './ActionCenterPage'
import SettingsPage from './SettingsPage'
import TrustPassportPage from './TrustPassportPage'
import NotificationsBell from './NotificationsBell'
import GroupHealthPanel from './GroupHealthPanel'
import MobileBottomNav from './MobileBottomNav'
import ProfileMenu from './ProfileMenu'
import TodayPreview from './TodayPreview'
import OnboardingPage from './OnboardingPage'
import GroupExportActions from './GroupExportActions'
import DisputeCasePanel from './DisputeCasePanel'
import StructuredDisputeActions from './StructuredDisputeActions'

function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      setUser(await api.me())
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return { user, loading, refresh }
}

function Shell({
  user,
  onLogout,
  children,
}: {
  user: User | null
  onLogout: () => void
  children: React.ReactNode
}) {
  return (
    <div className="appShell">
      <NetworkBackground />

      <header className="topbar">
        <Link to="/" className="brand animatedBrand" aria-label="Rota home">
          <RotaLogo />
        </Link>

        <nav className="desktopNav">
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/actions">Actions</Link>
              <Link to="/discover">Discover</Link>
              <Link to="/messages">Messages</Link>
              <Link to="/network">Trust Network</Link>
              <Link to="/groups/new">Create group</Link>
              <NotificationsBell />
              <ProfileMenu user={user} onLogout={onLogout} />
            </>
          ) : (
            <>
              <a href="/#how-it-works">How it works</a>
              <a href="/#trust">Trust</a>
              <Link to="/discover">Discover</Link>
              <Link to="/simulator">Simulator</Link>
              <ThemeToggle />
              <Link to="/login">Log in</Link>
              <Link className="navButton" to="/register">Create account</Link>
            </>
          )}
        </nav>
      </header>

      <main className="container">{children}</main>

      {user && <MobileBottomNav />}
    </div>
  )
}

function RequireAuth({
  user,
  loading,
  children,
}: {
  user: User | null
  loading: boolean
  children: React.ReactNode
}) {
  if (loading) return <Skeleton variant="page" />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Landing() {
  return (
    <div className="landing">
      <section className="heroShell">
        <div className="heroCopy">
          <div className="heroLogoLine">
            <RotaLogo size="large" />
          </div>

          <p className="eyebrow">Coordination-only savings circles</p>
          <h1>Build interest-free savings circles with people you trust.</h1>
          <p className="lead">
            Rota helps ROSCA, tontine, susu, tanda, and jamiya groups coordinate contributions,
            receive a lump sum in turn, and grow trusted decentralized circles — without holding your money.
          </p>

          <div className="actions">
            <ButtonLink to="/register">Create a group</ButtonLink>
            <ButtonLink to="/simulator" variant="secondary">Try simulator</ButtonLink>
          </div>

          <ActionBanner
            tone="success"
            title="Rota does not hold money"
            description="Your group charges no interest. No wallet, no deposits, no platform balance. Members pay each other directly."
            icon="0%"
          />
        </div>

        <Card className="heroDemo">
          <div className="demoHeader">
            <div>
              <p className="eyebrow">Current cycle</p>
              <h3>Ali receives this month</h3>
            </div>
            <Badge tone="success" dot>Live ledger</Badge>
          </div>

          <div className="moneyLine">
            <div>
              <span className="muted">Expected pot</span>
              <strong>€1,000</strong>
            </div>
            <div>
              <span className="muted">Confirmed</span>
              <strong>€800</strong>
            </div>
          </div>

          <div className="progress">
            <span style={{ width: '80%' }} />
          </div>

          <div className="miniLedger">
            <div><span className="dot ok" />David uploaded proof <strong>Confirmed</strong></div>
            <div><span className="dot ok" />Sara paid by transfer <strong>Confirmed</strong></div>
            <div><span className="dot wait" />Omar uploaded proof <strong>Waiting</strong></div>
            <div><span className="dot late" />Lina has not paid <strong>Pending</strong></div>
          </div>
        </Card>
      </section>

      <ProductPrinciples />

      <section id="how-it-works" className="sectionBlock">
        <div className="sectionIntro">
          <p className="eyebrow">How it works</p>
          <h2>Simple enough for a family group. Clear enough for a community organizer.</h2>
        </div>

        <div className="featureGrid three">
          <Card compact>
            <article className="featureCard">
              <span className="icon">1</span>
              <h3>Create your circle</h3>
              <p>Set the contribution amount, currency, frequency, member limit, and payout order.</p>
            </article>
          </Card>

          <Card compact>
            <article className="featureCard">
              <span className="icon">2</span>
              <h3>Members pay directly</h3>
              <p>
                Each cycle, members send money to the selected receiver using bank transfer,
                mobile money, or cash.
              </p>
            </article>
          </Card>

          <Card compact>
            <article className="featureCard">
              <span className="icon">3</span>
              <h3>Proof is tracked</h3>
              <p>
                Members upload proof, receivers confirm receipt, and everyone sees the shared group ledger.
              </p>
            </article>
          </Card>
        </div>
      </section>

      <section id="trust" className="trustPanel">
        <div>
          <p className="eyebrow">Built for transparency</p>
          <h2>Rota is the scorekeeper, not the bank.</h2>
          <p className="mutedText">
            Your group keeps control of the money flow. Rota keeps the records clear,
            visible, and easy to review.
          </p>
        </div>

        <div className="trustGrid">
          <div><strong>Never holds money</strong><span>No wallet, no deposits, no platform balance.</span></div>
          <div><strong>Payment proof</strong><span>Store references, notes, and screenshots.</span></div>
          <div><strong>Receiver confirmation</strong><span>The receiver confirms what arrived.</span></div>
          <div><strong>Shared ledger</strong><span>Members can see status and history.</span></div>
        </div>
      </section>

      <section className="sectionBlock exampleSection">
        <div className="sectionIntro">
          <p className="eyebrow">Example cycle</p>
          <h2>10 members × €100 = €1,000 pot</h2>
          <p className="mutedText">This month, Ali receives the pot.</p>
        </div>

        <div className="flowCards">
          <div>Members see: <strong>Pay €100 to Ali by 5 Jan</strong></div>
          <div>They pay outside the app</div>
          <div>They upload proof in Rota</div>
          <div>Ali confirms receipt</div>
        </div>
      </section>

      <Card className="finalCta">
        <p className="eyebrow">Start small</p>
        <h2>Use Rota first with people who already trust each other.</h2>
        <p>Invite your existing group, run one cycle, and check whether the ledger is clearer than paper or WhatsApp.</p>

        <div className="actions centered">
          <ButtonLink to="/register">Create account</ButtonLink>
          <ButtonLink to="/simulator" variant="secondary">Try simulator</ButtonLink>
        </div>
      </Card>
    </div>
  )
}

function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const token = await api.login({ email, password })
      setToken(token.access_token)
      await onLogin()
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <section className="authLayout">
      <form className="uiCard form authCard" onSubmit={submit}>
        <p className="uiEyebrow">Welcome back</p>
        <h1>Log in to Rota</h1>
        <p className="mutedText">Continue tracking your circles, contributions, confirmations, and group ledger.</p>

        {error && (
          <ActionBanner
            tone="danger"
            title="Login failed"
            description={error}
            icon="!"
          />
        )}

        <label>
          Email
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </label>

        <label>
          Password
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        </label>

        <Button full type="submit">Log in</Button>
        <p className="smallText">New to Rota? <Link to="/register">Create an account</Link></p>
      </form>
    </section>
  )
}

function Register({ onLogin }: { onLogin: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const token = await api.register({ name, email, phone, password })
      setToken(token.access_token)
      await onLogin()
      localStorage.removeItem('rota-onboarding-complete')
      navigate('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <section className="authLayout">
      <form className="uiCard form authCard" onSubmit={submit}>
        <p className="uiEyebrow">Create your account</p>
        <h1>Start your first circle</h1>
        <p className="mutedText">Create or join invite-only contribution groups. Rota coordinates records, not money.</p>

        {error && (
          <ActionBanner
            tone="danger"
            title="Registration failed"
            description={error}
            icon="!"
          />
        )}

        <label>
          Name
          <input value={name} onChange={e => setName(e.target.value)} required />
        </label>

        <label>
          Email
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </label>

        <label>
          Phone
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
        </label>

        <label>
          Password
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" minLength={8} required />
        </label>

        <Button full type="submit">Create account</Button>
        <p className="smallText">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </section>
  )
}

function Dashboard({ user }: { user: User }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loadingGroups, setLoadingGroups] = useState(true)
  const navigate = useNavigate()

  async function load() {
    setLoadingGroups(true)
    setError('')

    try {
      setGroups(await api.groups())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load groups')
    } finally {
      setLoadingGroups(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function join(e: FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const group = await api.joinGroup(inviteCode)
      navigate(`/groups/${group.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join group')
    }
  }

  const openGroups = groups.filter(group => group.status !== 'archived')
  const reviewGroups = groups.filter(group => ['cycle_review', 'pending', 'forming'].includes(group.status))

  return (
    <div className="dashboardLayout">
      <PageHeader
        className="wide"
        eyebrow="Dashboard"
        title={`Welcome, ${user.name}`}
        description="See what needs attention across your circles, messages, discovery requests, and trust network."
        meta={
          <>
            <Badge status={user.verification_status} dot />
            <Badge tone="success">Trust {user.trust_score}</Badge>
          </>
        }
        actions={
          <>
            <ButtonLink to="/actions" variant="secondary">Actions</ButtonLink>
            <ButtonLink to="/messages" variant="secondary">Messages</ButtonLink>
            <ButtonLink to="/groups/new">Create group</ButtonLink>
          </>
        }
      />

      <TodayPreview />

      {error && (
        <ActionBanner
          className="wide"
          tone="danger"
          title="Something went wrong"
          description={error}
          icon="!"
        />
      )}

      <section className="statsGrid wide">
        <StatCard label="Your groups" value={groups.length} icon="◎" tone="info" />
        <StatCard label="Active circles" value={openGroups.length} icon="↗" tone="success" />
        <StatCard label="Trust score" value={user.trust_score} icon="★" tone="success" />
        <StatCard label="Money held by Rota" value="€0" icon="0%" tone="neutral" />
      </section>

      {reviewGroups.length > 0 ? (
        <ActionBanner
          className="wide"
          tone="warning"
          title="Some circles may need attention"
          description={`${reviewGroups.length} group${reviewGroups.length === 1 ? '' : 's'} are forming, pending, or in cycle review.`}
          action={<ButtonLink to="/actions" variant="secondary" size="sm">Review actions</ButtonLink>}
          icon="!"
        />
      ) : (
        <ActionBanner
          className="wide"
          tone="success"
          title="No urgent group actions"
          description="Your dashboard is clear. Open your groups to review ledgers, chat, and agreement status."
          action={<ButtonLink to="/discover" variant="secondary" size="sm">Discover circles</ButtonLink>}
          icon="✓"
        />
      )}

      <ProductPrinciples compact />

      <Card
        className="mainPanel"
        eyebrow="Your circles"
        title="Active groups"
        actions={<ButtonLink to="/groups/new" variant="secondary" size="sm">New group</ButtonLink>}
      >
        {loadingGroups ? (
          <Skeleton variant="card" />
        ) : groups.length === 0 ? (
          <EmptyState
            title="No groups yet"
            description="Create your first circle or join an existing one with an invite code."
            action={<ButtonLink to="/groups/new">Create your first group</ButtonLink>}
          />
        ) : (
          <div className="groupCards">
            {groups.map(group => (
              <Link className="groupCard" key={group.id} to={`/groups/${group.id}`}>
                <div className="groupTopline">
                  <strong>{group.name}</strong>
                  <Badge status={group.status} />
                </div>

                <div className="groupMeta">
                  <span>{group.contribution_amount} {group.currency}</span>
                  <span>{group.frequency}</span>
                  <span>{group.member_limit} members max</span>
                </div>

                <div className="invitePill">Invite code: <strong>{group.invite_code}</strong></div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <aside className="sideStack">
        <Card eyebrow="Join existing circle" title="Use invite code">
          <form onSubmit={join} className="form compact">
            <label>
              Invite code
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Example: ABC123"
              />
            </label>

            <Button full type="submit">Join group</Button>
          </form>
        </Card>

        <Card eyebrow="Trusted Messages" title="Chat with groups and accepted connections.">
          <p>Use group chat for circle coordination, and private chat after a connection request is accepted.</p>
          <ButtonLink full variant="secondary" to="/messages">Open messages</ButtonLink>
        </Card>

        <Card eyebrow="Community Discovery" title="Find people open to trusted circles.">
          <p>Opt in to discovery, find nearby people or groups, send requests, and build new circles carefully.</p>
          <ButtonLink full variant="secondary" to="/discover">Open discovery</ButtonLink>
        </Card>

        <Card eyebrow="Circle Simulator" title="Calculate before you create.">
          <p>Simulate how many people you need, how much each person contributes, and how much each cycle creates.</p>
          <ButtonLink full variant="secondary" to="/simulator">Try simulator</ButtonLink>
        </Card>

        <Card eyebrow="Trust Network" title="See circle health and trusted people.">
          <p>Open the Trust Network dashboard to inspect group health, trusted members, and relationship signals.</p>
          <ButtonLink full variant="secondary" to="/network">View Trust Network</ButtonLink>
        </Card>
      </aside>
    </div>
  )
}

function NewGroup() {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState(100)
  const [currency, setCurrency] = useState('EUR')
  const [frequency, setFrequency] = useState('monthly')
  const [memberLimit, setMemberLimit] = useState(10)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const group = await api.createGroup({
        name,
        contribution_amount: amount,
        currency,
        frequency,
        member_limit: memberLimit,
        payout_method: 'fixed_rotation',
      })

      navigate(`/groups/${group.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create group')
    }
  }

  const estimatedPot = amount * memberLimit

  return (
    <div className="createLayout">
      <form className="uiCard form" onSubmit={submit}>
        <p className="uiEyebrow">New contribution circle</p>
        <h1>Create group</h1>
        <p className="mutedText">Start with a trusted invite-only group. You can share the invite code after creation.</p>

        {error && (
          <ActionBanner
            tone="danger"
            title="Could not create group"
            description={error}
            icon="!"
          />
        )}

        <label>
          Group name
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Example: Family monthly circle" required />
        </label>

        <label>
          Contribution amount
          <input value={amount} onChange={e => setAmount(Number(e.target.value))} type="number" min="1" required />
        </label>

        <label>
          Currency
          <input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={8} required />
        </label>

        <label>
          Frequency
          <select value={frequency} onChange={e => setFrequency(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        <label>
          Member limit
          <input value={memberLimit} onChange={e => setMemberLimit(Number(e.target.value))} type="number" min="2" max="50" />
        </label>

        <ActionBanner
          tone="success"
          title="Estimated pot"
          description={`${memberLimit} members × ${amount} ${currency} = ${estimatedPot} ${currency} each cycle.`}
          icon="◎"
        />

        <Button full type="submit">Create group</Button>
      </form>

      <Card className="guideCard" eyebrow="Circle rules" title="Members agree before the loop starts">
        <ul className="checkList">
          <li>Invite-only members</li>
          <li>Members accept the Circle Commitment</li>
          <li>Members stay after the first cycle starts</li>
          <li>Group stops only if all members vote to stop</li>
          <li>Organizer archives only after unanimous stop vote</li>
          <li>Proof upload, receiver confirmation, and member receipt review</li>
          <li>Members can review each other after sharing a group</li>
          <li>Group members can use circle chat</li>
        </ul>

        <ButtonLink full variant="secondary" to="/simulator">Open full simulator</ButtonLink>
      </Card>
    </div>
  )
}

function GroupPage({ user }: { user: User }) {
  const { id } = useParams()
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [error, setError] = useState('')
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16))

  async function load() {
    if (!id) return
    setError('')
    setDetail(await api.groupDetail(id))
  }

  useEffect(() => {
    load().catch(err => setError(err instanceof Error ? err.message : 'Could not load group'))
  }, [id])

  const currentCycle = useMemo(() => detail?.cycles[0], [detail])

  const currentContributions = useMemo(() => {
    if (!detail || !currentCycle) return []
    return detail.contributions.filter(c => c.cycle_id === currentCycle.id)
  }, [detail, currentCycle])

  if (error) {
    return (
      <ActionBanner
        tone="danger"
        title="Could not load this group"
        description={error}
        icon="!"
        action={<ButtonLink to="/dashboard" variant="secondary" size="sm">Back to dashboard</ButtonLink>}
      />
    )
  }

  if (!detail) return <Skeleton variant="page" />

  const myContribution = currentContributions.find(c => c.payer_user_id === user.id)
  const canConfirm = currentContributions.some(c => c.receiver_user_id === user.id)
  const isOrganizer = detail.members.some(m => m.user_id === user.id && ['organizer', 'co_organizer'].includes(m.role))

  async function createCycle(e: FormEvent) {
    e.preventDefault()
    if (!id) return

    setError('')

    try {
      await api.createCycle(id, new Date(dueDate).toISOString())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create cycle')
    }
  }

  const confirmedTotal = currentContributions
    .filter(c => c.status === 'confirmed' || c.status === 'group_verified')
    .reduce((sum, c) => sum + c.amount, 0)

  const paidTotal = currentContributions
    .filter(c => c.status === 'paid' || c.status === 'confirmed' || c.status === 'group_verified')
    .reduce((sum, c) => sum + c.amount, 0)

  const expectedTotal = currentContributions.reduce((sum, c) => sum + c.amount, 0)
  const pendingCount = currentContributions.filter(c => c.status === 'pending').length
  const confirmedCount = currentContributions.filter(c => c.status === 'confirmed' || c.status === 'group_verified').length
  const progressPercent = expectedTotal ? (confirmedTotal / expectedTotal) * 100 : 0

  return (
    <div className="stack">
      <PageHeader
        eyebrow={`Invite code: ${detail.group.invite_code}`}
        title={detail.group.name}
        description={`${detail.group.contribution_amount} ${detail.group.currency} • ${detail.group.frequency} • ${detail.group.payout_method.replace(/_/g, ' ')}`}
        meta={
          <>
            <Badge status={detail.group.status} dot />
            <Badge tone="success">Rota holds €0</Badge>
          </>
        }
        actions={
          <>
            <ButtonLink to="/messages" variant="secondary">Messages</ButtonLink>
            <ButtonLink to="/dashboard" variant="ghost">Dashboard</ButtonLink>
          </>
        }
      />

      <ActionBanner
        tone="info"
        title="Rota does not hold money"
        description="Members pay the receiver directly, then record proof, confirmation, and disputes here."
        icon="0%"
      />

      <section className="statsGrid">
        <StatCard
          label="Expected pot"
          value={`${expectedTotal || detail.group.contribution_amount * detail.members.length} ${detail.group.currency}`}
          icon="◎"
          tone="info"
        />
        <StatCard
          label="Confirmed"
          value={`${confirmedTotal} ${detail.group.currency}`}
          icon="✓"
          tone="success"
        />
        <StatCard
          label="Marked paid"
          value={`${paidTotal} ${detail.group.currency}`}
          icon="↗"
          tone="warning"
        />
        <StatCard
          label="Pending rows"
          value={pendingCount}
          icon="…"
          tone={pendingCount > 0 ? 'warning' : 'success'}
        />
      </section>

      <GroupHealthPanel groupId={detail.group.id} />

      <GroupExportActions
        groupId={detail.group.id}
        groupName={detail.group.name}
      />

      <GroupGovernancePanel
        groupId={detail.group.id}
        isOrganizer={isOrganizer}
        onChanged={load}
      />

      <DisputeCasePanel
        groupId={detail.group.id}
        isOrganizer={isOrganizer}
        onChanged={load}
      />

      <CircleCalculator detail={detail} currentUserId={user.id} />

      <section className="grid two">
        <Card className="cycleCard">
          <div className="panelHeader">
            <div>
              <p className="uiEyebrow">Current cycle</p>
              <h2>{currentCycle ? `Cycle ${currentCycle.cycle_number}` : 'No cycle yet'}</h2>
            </div>
            {currentCycle && <Badge tone="success">{confirmedCount}/{currentContributions.length} confirmed</Badge>}
          </div>

          {currentCycle ? (
            <>
              <div className="receiverBox">
                <span>This cycle’s receiver</span>
                <strong>{currentCycle.receiver_name}</strong>
                <small>Due {new Date(currentCycle.due_date).toLocaleString()}</small>
              </div>

              <div className="progress">
                <span style={{ width: `${progressPercent}%` }} />
              </div>

              <p className="mutedText">{confirmedTotal} {detail.group.currency} confirmed out of {expectedTotal} expected.</p>
            </>
          ) : (
            <EmptyState
              title="No cycle yet"
              description="The organizer can create the first cycle after members accept the Circle Commitment."
            />
          )}

          {isOrganizer && (
            <form className="form compact cycleForm" onSubmit={createCycle}>
              <label>
                Next cycle due date
                <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </label>

              <Button type="submit">Create next cycle</Button>
            </form>
          )}
        </Card>

        <Card
          title={`${detail.members.length} members`}
          eyebrow="Members"
        >
          <div className="memberList">
            {detail.members.map(m => (
              <div key={m.id} className="memberRow">
                <span className="avatar">{m.name?.slice(0, 1).toUpperCase() || '?'}</span>
                <div>
                  <strong>{m.name}</strong>
                  <span>{m.email}</span>
                </div>
                <div className="memberRowActions">
                  <Badge status={m.role} tone={m.role === 'organizer' ? 'purple' : 'neutral'} />
                  {m.user_id !== user.id && (
                    <ButtonLink size="sm" variant="ghost" to={`/reviews/${m.user_id}`}>
                      Reviews
                    </ButtonLink>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <MemberReviewPanel detail={detail} currentUserId={user.id} />

      <GroupChatPanel groupId={detail.group.id} />

      {currentCycle && myContribution && (
        <PayCard contribution={myContribution} groupCurrency={detail.group.currency} onSaved={load} />
      )}

      {currentCycle && (canConfirm || isOrganizer) && (
        <ConfirmTable contributions={currentContributions} currency={detail.group.currency} onSaved={load} />
      )}

      <Card wide eyebrow="Shared record" title="Contribution ledger">
        {currentContributions.length === 0 ? (
          <EmptyState
            title="No contribution rows yet"
            description="Create a cycle to generate the shared ledger for this group."
          />
        ) : (
          <ContributionTable
            contributions={currentContributions}
            currency={detail.group.currency}
            actions={c => (
              <div className="ledgerActionStack">
                <ReceiptReviewActions
                  contribution={c}
                  currentUserId={user.id}
                  onSaved={load}
                />

                <StructuredDisputeActions
                  contribution={c}
                  onSaved={load}
                />
              </div>
            )}
          />
        )}
      </Card>

      <Card wide eyebrow="Transparency" title="Audit log">
        <div className="timeline">
          {detail.audit_logs.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Group events, payment updates, confirmations, and governance actions will appear here."
            />
          ) : detail.audit_logs.map(log => (
            <div key={log.id} className="timelineItem">
              <span />
              <div>
                <strong>{log.action}</strong>
                <small>{new Date(log.created_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PayCard({
  contribution,
  groupCurrency,
  onSaved,
}: {
  contribution: Contribution
  groupCurrency: string
  onSaved: () => Promise<void>
}) {
  const [reference, setReference] = useState(contribution.payment_reference || '')
  const [note, setNote] = useState(contribution.note || '')
  const [proof, setProof] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const form = new FormData()
      form.append('payment_reference', reference)
      form.append('note', note)
      if (proof) form.append('proof', proof)

      await api.markPaid(contribution.id, form)
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save payment proof')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="uiCard form paymentCard" onSubmit={submit}>
      <div>
        <p className="uiEyebrow">Your action</p>
        <h2>Record your payment proof</h2>
        <p>
          Pay <strong>{contribution.amount} {groupCurrency}</strong> to{' '}
          <strong>{contribution.receiver_name}</strong> outside the app, then upload proof here.
        </p>
        <p>Status: <Badge status={contribution.status} /></p>
      </div>

      {error && (
        <ActionBanner
          tone="danger"
          title="Could not save payment proof"
          description={error}
          icon="!"
        />
      )}

      <label>
        Payment reference
        <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Bank/mobile money reference" />
      </label>

      <label>
        Note
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note for the receiver or organizer" />
      </label>

      <label>
        Proof screenshot or PDF
        <input type="file" accept="image/*,application/pdf" onChange={e => setProof(e.target.files?.[0] || null)} />
      </label>

      <Button full type="submit" loading={saving}>
        I paid / upload proof
      </Button>
    </form>
  )
}

function ConfirmTable({
  contributions,
  currency,
  onSaved,
}: {
  contributions: Contribution[]
  currency: string
  onSaved: () => Promise<void>
}) {
  const [error, setError] = useState('')

  async function confirm(id: string) {
    setError('')

    try {
      await api.confirmContribution(id)
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm')
    }
  }

  async function dispute(id: string) {
    const reason = window.prompt('Why are you disputing this contribution?')
    if (!reason) return

    try {
      await api.disputeContribution(id, reason)
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not dispute')
    }
  }

  return (
    <Card wide eyebrow="Receiver / organizer" title="Confirm received payments">
      {error && (
        <ActionBanner
          tone="danger"
          title="Payment review failed"
          description={error}
          icon="!"
        />
      )}

      <ContributionTable
        contributions={contributions}
        currency={currency}
        actions={c => (
          <div className="rowActions">
            <Button
              size="sm"
              type="button"
              onClick={() => confirm(c.id)}
              disabled={c.status === 'confirmed' || c.status === 'group_verified'}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => dispute(c.id)}
            >
              Dispute
            </Button>
          </div>
        )}
      />
    </Card>
  )
}

function ContributionTable({
  contributions,
  currency,
  actions,
}: {
  contributions: Contribution[]
  currency: string
  actions?: (c: Contribution) => React.ReactNode
}) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Payer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Reference</th>
            <th>Proof</th>
            {actions && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {contributions.map(c => (
            <tr key={c.id}>
              <td>{c.payer_name}</td>
              <td>{c.amount} {currency}</td>
              <td><Badge status={c.status} /></td>
              <td>{c.payment_reference || '-'}</td>
              <td>{c.proof_url ? <a href={`${api.apiBase}${c.proof_url}`} target="_blank" rel="noreferrer">View proof</a> : '-'}</td>
              {actions && <td>{actions(c)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function App() {
  const auth = useAuth()
  const navigate = useNavigate()

  function logout() {
    clearToken()
    auth.refresh()
    navigate('/')
  }

  return (
    <Shell user={auth.user} onLogout={logout}>
      <Routes>
        <Route path="/" element={auth.user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={<Login onLogin={auth.refresh} />} />
        <Route path="/register" element={<Register onLogin={auth.refresh} />} />
        <Route path="/simulator" element={<LiveCircleSimulator />} />

        <Route
          path="/onboarding"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <OnboardingPage user={auth.user!} />
            </RequireAuth>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <Dashboard user={auth.user!} />
            </RequireAuth>
          }
        />

        <Route
          path="/actions"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <ActionCenterPage />
            </RequireAuth>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <SettingsPage />
            </RequireAuth>
          }
        />

        <Route
          path="/trust-passport"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <TrustPassportPage />
            </RequireAuth>
          }
        />

        <Route
          path="/trust-passport/:userId"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <TrustPassportPage />
            </RequireAuth>
          }
        />

        <Route
          path="/groups/new"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <NewGroup />
            </RequireAuth>
          }
        />

        <Route
          path="/network"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <TrustNetworkDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/discover"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <DiscoverPage />
            </RequireAuth>
          }
        />

        <Route
          path="/messages"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <MessagesPage />
            </RequireAuth>
          }
        />

        <Route
          path="/reviews/:userId"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <ReviewsPage />
            </RequireAuth>
          }
        />

        <Route
          path="/groups/:id"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <GroupPage user={auth.user!} />
            </RequireAuth>
          }
        />
      </Routes>
    </Shell>
  )
}