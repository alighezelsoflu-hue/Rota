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
import LoadingScreen from './LoadingScreen'
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
import GuestMobileAuthBar from './GuestMobileAuthBar'
import InviteCodeJoinCard from './InviteCodeJoinCard'
import HeroCycleDemo from './HeroCycleDemo'
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
  showGuestAuth = true,
}: {
  user: User | null
  onLogout: () => void
  children: React.ReactNode
  showGuestAuth?: boolean
}) {
  return (
    <div className={user ? 'appShell' : 'appShell guestShell'}>
      <NetworkBackground />

      <header className="topbar">
        <Link to="/" className="brand animatedBrand" aria-label="Rota home">
          <RotaLogo showTagline={false} />
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
      {!user && showGuestAuth && <GuestMobileAuthBar />}
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
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Landing() {
  return (
    <div className="landing">
      <section className="heroShell">
        <div className="heroCopy">
          <div className="heroLogoLine">
            <RotaLogo size="lg" />
          </div>

          <p className="heroTrustLine">Trusted groups · direct contributions · clear records</p>

          <h1>Build trusted circles instead of paying bank interest.</h1>

          <p className="lead">
            Join one or more trusted groups, contribute directly, take turns receiving the lump sum,
            and grow a stronger community through trust, responsibility, and clear records.
          </p>

          <div className="businessHeroMessage">
            <div>
              <strong>0% group interest</strong>
              <span>Members support each other directly without bank-interest debt.</span>
            </div>

            <div>
              <strong>Trusted groups</strong>
              <span>Build reliable circles with people you already know or carefully approve.</span>
            </div>

            <div>
              <strong>Responsible records</strong>
              <span>Agreements, proof, confirmations, reviews, and audit logs keep the group accountable.</span>
            </div>
          </div>

          <div className="actions">
            <ButtonLink to="/register">Create account</ButtonLink>
            <ButtonLink to="/simulator" variant="secondary">Try simulator</ButtonLink>
          </div>

          <ActionBanner
            tone="success"
            title="Rota coordinates circles. Rota does not lend or hold money."
            description="Members pay each other directly outside the app. Rota provides structure, trust signals, records, approvals, and transparency."
            icon="0%"
          />
        </div>

        <HeroCycleDemo />
      </section>

      <ProductPrinciples />

      <section id="how-it-works" className="sectionBlock">
        <div className="sectionIntro">
          <p className="eyebrow">How it works</p>
          <h2>A trusted alternative to paying interest.</h2>
          <p className="mutedText">
            Rota helps your group organize direct contributions, payout turns, proof,
            confirmations, member reviews, and shared accountability.
          </p>
        </div>

        <div className="featureGrid three">
          <Card compact>
            <article className="featureCard">
              <span className="icon">1</span>
              <h3>Create or join</h3>
              <p>Start with people you trust, or request access using an invite code or link.</p>
            </article>
          </Card>

          <Card compact>
            <article className="featureCard">
              <span className="icon">2</span>
              <h3>Pay directly</h3>
              <p>Each cycle, members send money directly to the selected receiver.</p>
            </article>
          </Card>

          <Card compact>
            <article className="featureCard">
              <span className="icon">3</span>
              <h3>Build trust</h3>
              <p>Proof, confirmations, reviews, and transparent records help everyone stay accountable.</p>
            </article>
          </Card>
        </div>
      </section>

      <section id="trust" className="trustPanel premiumPanel">
        <div>
          <p className="eyebrow">Trust and responsibility</p>
          <h2>Structure for trusted financial cooperation.</h2>
          <p className="mutedText">
            Your group keeps control of the money flow. Rota keeps the records clear,
            visible, and easy to review.
          </p>
        </div>

        <div className="trustGrid">
          <div><strong>0% interest</strong><span>No group interest charges and no platform wallet.</span></div>
          <div><strong>Direct payments</strong><span>Members pay the receiver outside the app.</span></div>
          <div><strong>Proof records</strong><span>Payment status is visible to the group.</span></div>
          <div><strong>Trust network</strong><span>Responsible members build stronger reputation.</span></div>
        </div>
      </section>

      <section className="sectionBlock exampleSection">
        <div className="sectionIntro">
          <p className="eyebrow">Example circle</p>
          <h2>10 members × €100 = €1,000 community pot</h2>
          <p className="mutedText">
            One member receives the pot each cycle. The group continues until every member has received.
          </p>
        </div>

        <div className="flowCards">
          <div>Pay <strong>€100</strong> to the receiver</div>
          <div>Upload proof</div>
          <div>Receiver confirms</div>
          <div>Group record updates</div>
        </div>
      </section>

      <Card className="finalCta">
        <p className="eyebrow">Start carefully</p>
        <h2>Begin with people who already trust each other.</h2>
        <p>
          Create a circle, invite responsible members, coordinate direct contributions,
          and build a stronger trust network over time.
        </p>

        <div className="actions centered">
          <ButtonLink to="/register">Create account</ButtonLink>
          <ButtonLink to="/simulator" variant="secondary">Plan a circle</ButtonLink>
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
        <h1>Log in</h1>
        <p className="mutedText">Continue tracking your trusted circles.</p>

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
        <p className="uiEyebrow">Create account</p>
        <h1>Start with Rota</h1>
        <p className="mutedText">Create or join invite-only contribution circles. Rota coordinates records, not money.</p>

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

function GroupListSection({
  groups,
  loading,
}: {
  groups: Group[]
  loading: boolean
}) {
  const activeGroups = groups.filter(group => group.status !== 'archived')
  const archivedGroups = groups.filter(group => group.status === 'archived')

  return (
    <Card
      className="dashboardGroupsSection"
      wide
      eyebrow="My Groups"
      title="Your circles"
      description="Open a group to see payments, members, messages, reviews, and settings."
    >
      {loading ? (
        <Skeleton variant="card" />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="◎"
          title="No groups yet"
          description="Create your first circle from the top button, or use an invite code below."
        />
      ) : (
        <div className="professionalGroupList">
          {activeGroups.map(group => (
            <Link className="professionalGroupRow" key={group.id} to={`/groups/${group.id}`}>
              <div className="professionalGroupIcon">
                {group.name.slice(0, 1).toUpperCase()}
              </div>

              <div className="professionalGroupInfo">
                <div>
                  <strong>{group.name}</strong>
                  <Badge status={group.status} />
                </div>

                <p>
                  {group.contribution_amount} {group.currency} · {group.frequency} · {group.member_limit} members max
                </p>
              </div>

              <div className="professionalGroupArrow">
                Open
              </div>
            </Link>
          ))}

          {archivedGroups.length > 0 && (
            <details className="archivedGroupDetails">
              <summary>{archivedGroups.length} archived group{archivedGroups.length === 1 ? '' : 's'}</summary>

              <div className="professionalGroupList archived">
                {archivedGroups.map(group => (
                  <Link className="professionalGroupRow" key={group.id} to={`/groups/${group.id}`}>
                    <div className="professionalGroupIcon muted">
                      {group.name.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="professionalGroupInfo">
                      <div>
                        <strong>{group.name}</strong>
                        <Badge status={group.status} />
                      </div>

                      <p>
                        {group.contribution_amount} {group.currency} · {group.frequency}
                      </p>
                    </div>

                    <div className="professionalGroupArrow">
                      View
                    </div>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </Card>
  )
}

function Dashboard({ user }: { user: User }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState('')
  const [loadingGroups, setLoadingGroups] = useState(true)

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

  const openGroups = groups.filter(group => group.status !== 'archived')
  const reviewGroups = groups.filter(group => ['cycle_review', 'pending', 'forming'].includes(group.status))

  return (
    <div className="professionalDashboard">
      <PageHeader
        className="wide compactDashboardHeader"
        eyebrow="My Groups"
        title={`Welcome, ${user.name}`}
        description="Open your groups first. Join or create a new circle when you are ready."
        meta={
          <>
            <Badge status={user.verification_status} dot />
            <Badge tone="success">Trust {user.trust_score}</Badge>
          </>
        }
        actions={
          <>
            <ButtonLink to="/actions" variant="secondary">Actions</ButtonLink>
            <ButtonLink to="/groups/new">Create group</ButtonLink>
          </>
        }
      />

      {error && (
        <ActionBanner
          className="wide"
          tone="danger"
          title="Something went wrong"
          description={error}
          icon="!"
        />
      )}

      {reviewGroups.length > 0 && (
        <ActionBanner
          className="wide"
          tone="warning"
          title="Groups need attention"
          description={`${reviewGroups.length} group${reviewGroups.length === 1 ? '' : 's'} are forming, pending, or in cycle review.`}
          action={<ButtonLink to="/actions" variant="secondary" size="sm">Review actions</ButtonLink>}
          icon="!"
        />
      )}

      <section className="dashboardPriorityLayout cleanDashboardLayout">
        <div className="dashboardPrimaryStack">
          <GroupListSection groups={groups} loading={loadingGroups} />
          <InviteCodeJoinCard />
        </div>

        <aside className="dashboardContextStack">
          <TodayPreview />

          <Card eyebrow="Summary" title="Your Rota">
            <div className="compactDashboardStats">
              <StatCard label="Groups" value={groups.length} icon="◎" tone="info" />
              <StatCard label="Active" value={openGroups.length} icon="↗" tone="success" />
              <StatCard label="Trust" value={user.trust_score} icon="★" tone="success" />
              <StatCard label="Held by Rota" value="€0" icon="0%" tone="neutral" />
            </div>
          </Card>
        </aside>
      </section>
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
        <p className="uiEyebrow">New circle</p>
        <h1>Create group</h1>
        <p className="mutedText">Start with a trusted invite-only group.</p>

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
          <input value={name} onChange={event => setName(event.target.value)} placeholder="Example: Family circle" required />
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

      <Card className="guideCard" eyebrow="Circle rules" title="Before you start">
        <ul className="checkList">
          <li>Invite-only members</li>
          <li>Members accept the Circle Commitment</li>
          <li>Members stay after the first cycle starts</li>
          <li>Group stops only if all members vote to stop</li>
          <li>Proof, confirmations, reviews, and audit logs are tracked</li>
        </ul>

        <ButtonLink full variant="secondary" to="/simulator">Open simulator</ButtonLink>
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

  if (!detail) return <LoadingScreen title="Opening group" subtitle="Loading your circle workspace..." />

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

  if (auth.loading) {
    return (
      <Shell user={null} onLogout={logout} showGuestAuth={false}>
        <LoadingScreen />
      </Shell>
    )
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