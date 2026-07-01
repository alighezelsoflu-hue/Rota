import React, { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { api, clearToken, getToken, setToken } from './api'
import type {
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
import ProductPrinciples from './ProductPrinciples'
import LiveCircleSimulator from './LiveCircleSimulator'
import RotaLogo from './RotaLogo'
import NetworkBackground from './NetworkBackground'
import ThemeToggle from './ThemeToggle'
import TrustNetworkDashboard from './TrustNetworkDashboard'
import DiscoverPage from './DiscoverPage'
import ReviewsPage from './ReviewsPage'
import MessagesPage from './MessagesPage'
import ActionCenterPage from './ActionCenterPage'
import SettingsPage from './SettingsPage'
import TrustPassportPage from './TrustPassportPage'
import NotificationsBell from './NotificationsBell'
import MobileBottomNav from './MobileBottomNav'
import ProfileMenu from './ProfileMenu'
import TodayPreview from './TodayPreview'
import OnboardingPage from './OnboardingPage'
import PublicInvitePage from './PublicInvitePage'
import AdminSafetyDashboard from './AdminSafetyDashboard'
import { groupOperationsApi } from './groupOperationsApi'
import CompactGroupHeader from './CompactGroupHeader'
import GroupWorkspaceTabs from './GroupWorkspaceTabs'
import type { GroupWorkspaceTabId } from './GroupWorkspaceTabs'
import GroupOverviewTab from './GroupOverviewTab'
import GroupPaymentsTab from './GroupPaymentsTab'
import GroupMembersTab from './GroupMembersTab'
import GroupMessagesTab from './GroupMessagesTab'
import GroupReviewsTab from './GroupReviewsTab'
import GroupManageTab from './GroupManageTab'

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
              <Link to="/dashboard">My Groups</Link>
              <Link to="/actions">Actions</Link>
              <Link to="/discover">Discover</Link>
              <Link to="/messages">Messages</Link>
              <Link to="/network">Trust Network Map</Link>
              <Link to="/groups/new">Create group</Link>
              <ThemeToggle />
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

      {user && <MobileBottomNav user={user} onLogout={onLogout} />}
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

  async function submit(event: FormEvent) {
    event.preventDefault()
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
          <input value={email} onChange={event => setEmail(event.target.value)} type="email" required />
        </label>

        <label>
          Password
          <input value={password} onChange={event => setPassword(event.target.value)} type="password" required />
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

  async function submit(event: FormEvent) {
    event.preventDefault()
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
          <input value={name} onChange={event => setName(event.target.value)} required />
        </label>

        <label>
          Email
          <input value={email} onChange={event => setEmail(event.target.value)} type="email" required />
        </label>

        <label>
          Phone
          <input value={phone} onChange={event => setPhone(event.target.value)} placeholder="Optional" />
        </label>

        <label>
          Password
          <input value={password} onChange={event => setPassword(event.target.value)} type="password" minLength={8} required />
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
  const [joinMessage, setJoinMessage] = useState('')
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

  async function join(event: FormEvent) {
    event.preventDefault()
    setError('')
    setJoinMessage('')

    try {
      const result = await groupOperationsApi.joinByInvite(inviteCode)

      if (result.status === 'approval_required') {
        setJoinMessage('Your join request was sent for approval.')
        return
      }

      navigate(`/groups/${result.group.id}`)
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
        eyebrow="My Groups"
        title={`Welcome, ${user.name}`}
        description="See your circles, action items, messages, discovery requests, and trust network."
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

      {joinMessage && (
        <ActionBanner
          className="wide"
          tone="success"
          title="Request sent"
          description={joinMessage}
          icon="✓"
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
          description="Your dashboard is clear. Open a group to review its workspace."
          action={<ButtonLink to="/discover" variant="secondary" size="sm">Discover circles</ButtonLink>}
          icon="✓"
        />
      )}

      <ProductPrinciples compact />

      <Card
        className="mainPanel"
        eyebrow="Your circles"
        title="My Groups"
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
                onChange={event => setInviteCode(event.target.value.toUpperCase())}
                placeholder="Example: ABC123"
              />
            </label>

            <Button full type="submit">Join or request access</Button>
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

        <Card eyebrow="Trust Network Map" title="See trusted people and paths.">
          <p>Open the Trust Network Map to inspect group health, trusted members, and relationship signals.</p>
          <ButtonLink full variant="secondary" to="/network">View Trust Network Map</ButtonLink>
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

  async function submit(event: FormEvent) {
    event.preventDefault()
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
          <input value={name} onChange={event => setName(event.target.value)} placeholder="Example: Family monthly circle" required />
        </label>

        <label>
          Contribution amount
          <input value={amount} onChange={event => setAmount(Number(event.target.value))} type="number" min="1" required />
        </label>

        <label>
          Currency
          <input value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} maxLength={8} required />
        </label>

        <label>
          Frequency
          <select value={frequency} onChange={event => setFrequency(event.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        <label>
          Member limit
          <input value={memberLimit} onChange={event => setMemberLimit(Number(event.target.value))} type="number" min="2" max="50" />
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
  const [activeTab, setActiveTab] = useState<GroupWorkspaceTabId>('overview')
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16))

  async function load() {
    if (!id) return
    setError('')
    setDetail(await api.groupDetail(id))
  }

  useEffect(() => {
    load().catch(err => setError(err instanceof Error ? err.message : 'Could not load group'))
  }, [id])

  const currentCycle = useMemo(() => detail?.cycles[0] || null, [detail])

  const currentContributions = useMemo(() => {
    if (!detail || !currentCycle) return []
    return detail.contributions.filter(contribution => contribution.cycle_id === currentCycle.id)
  }, [detail, currentCycle])

  if (error) {
    return (
      <ActionBanner
        tone="danger"
        title="Could not load this group"
        description={error}
        icon="!"
        action={<ButtonLink to="/dashboard" variant="secondary" size="sm">Back to My Groups</ButtonLink>}
      />
    )
  }

  if (!detail) return <Skeleton variant="page" />

  const isOrganizer = detail.members.some(member => member.user_id === user.id && ['organizer', 'co_organizer'].includes(member.role))

  async function createCycle(event: FormEvent) {
    event.preventDefault()
    if (!id) return

    setError('')

    try {
      await api.createCycle(id, new Date(dueDate).toISOString())
      await load()
      setActiveTab('overview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create cycle')
    }
  }

  const pendingContributions = currentContributions.filter(contribution => contribution.status === 'pending').length
  const disputedContributions = currentContributions.filter(contribution => contribution.status === 'disputed').length
  const unpaidOrIssueCount = pendingContributions + disputedContributions
  const reviewCount = detail.cycles.filter(cycle => ['completed', 'cycle_review'].includes(cycle.status)).length

  return (
    <div className="compactGroupWorkspace">
      <CompactGroupHeader
        detail={detail}
        isOrganizer={isOrganizer}
      />

      <ActionBanner
        tone="info"
        title="Rota does not hold money"
        description="Members pay the receiver directly. Rota coordinates proof, confirmations, disputes, rules, and trust signals."
        icon="0%"
      />

      <GroupWorkspaceTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        counts={{
          payments: unpaidOrIssueCount,
          reviews: reviewCount,
        }}
      />

      {activeTab === 'overview' && (
        <GroupOverviewTab
          detail={detail}
          user={user}
          isOrganizer={isOrganizer}
          currentCycle={currentCycle}
          currentContributions={currentContributions}
          dueDate={dueDate}
          setDueDate={setDueDate}
          onCreateCycle={createCycle}
        />
      )}

      {activeTab === 'payments' && (
        <GroupPaymentsTab
          detail={detail}
          user={user}
          isOrganizer={isOrganizer}
          onChanged={load}
        />
      )}

      {activeTab === 'members' && (
        <GroupMembersTab
          detail={detail}
          user={user}
          isOrganizer={isOrganizer}
          onChanged={load}
        />
      )}

      {activeTab === 'messages' && (
        <GroupMessagesTab
          groupId={detail.group.id}
          isOrganizer={isOrganizer}
        />
      )}

      {activeTab === 'reviews' && (
        <GroupReviewsTab
          detail={detail}
          currentUserId={user.id}
        />
      )}

      {activeTab === 'manage' && (
        <GroupManageTab
          detail={detail}
          user={user}
          isOrganizer={isOrganizer}
          onChanged={load}
        />
      )}
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
        <Route path="/g/:inviteCode" element={<PublicInvitePage />} />

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
          path="/admin/safety"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <AdminSafetyDashboard />
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