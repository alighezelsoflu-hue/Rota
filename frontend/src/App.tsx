import React, { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { api, clearToken, getToken, setToken } from './api'
import type {
  Contribution,
  Group,
  GroupDetail,
  User,
} from './api'
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

        <nav>
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/network">Trust Network</Link>
              <Link to="/discover">Discover</Link>
              <Link to="/messages">Messages</Link>
              <Link to="/simulator">Simulator</Link>
              <Link to="/groups/new">Create group</Link>
              <span className="trust">Trust {user.trust_score}</span>
              <ThemeToggle />
              <button className="ghost" onClick={onLogout}>Logout</button>
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
  if (loading) return <p className="muted">Loading...</p>
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
            <Link className="button" to="/register">Create a group</Link>
            <Link className="button secondary" to="/simulator">Try simulator</Link>
          </div>

          <div className="safeNote">
            <span>Important:</span> Your group charges no interest. No wallet. No deposits.
            Members pay each other directly.
          </div>
        </div>

        <div className="heroDemo card">
          <div className="demoHeader">
            <div>
              <p className="eyebrow">Current cycle</p>
              <h3>Ali receives this month</h3>
            </div>
            <span className="status confirmed">Live ledger</span>
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
        </div>
      </section>

      <ProductPrinciples />

      <section id="how-it-works" className="sectionBlock">
        <div className="sectionIntro">
          <p className="eyebrow">How it works</p>
          <h2>Simple enough for a family group. Clear enough for a community organizer.</h2>
        </div>

        <div className="featureGrid three">
          <article className="featureCard">
            <span className="icon">1</span>
            <h3>Create your circle</h3>
            <p>Set the contribution amount, currency, frequency, member limit, and payout order.</p>
          </article>

          <article className="featureCard">
            <span className="icon">2</span>
            <h3>Members pay directly</h3>
            <p>
              Each cycle, members send money to the selected receiver using bank transfer,
              mobile money, or cash.
            </p>
          </article>

          <article className="featureCard">
            <span className="icon">3</span>
            <h3>Proof is tracked</h3>
            <p>
              Members upload proof, receivers confirm receipt, and everyone sees the shared group ledger.
            </p>
          </article>
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

      <section className="finalCta card">
        <p className="eyebrow">Start small</p>
        <h2>Use Rota first with people who already trust each other.</h2>
        <p>Invite your existing group, run one cycle, and check whether the ledger is clearer than paper or WhatsApp.</p>

        <div className="actions centered">
          <Link className="button" to="/register">Create account</Link>
          <Link className="button secondary" to="/simulator">Try simulator</Link>
        </div>
      </section>
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
      <form className="card form authCard" onSubmit={submit}>
        <p className="eyebrow">Welcome back</p>
        <h1>Log in to Rota</h1>
        <p className="mutedText">Continue tracking your circles, contributions, confirmations, and group ledger.</p>

        {error && <p className="error">{error}</p>}

        <label>
          Email
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </label>

        <label>
          Password
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        </label>

        <button className="button full" type="submit">Log in</button>
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
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <section className="authLayout">
      <form className="card form authCard" onSubmit={submit}>
        <p className="eyebrow">Create your account</p>
        <h1>Start your first circle</h1>
        <p className="mutedText">Create or join invite-only contribution groups. Rota coordinates records, not money.</p>

        {error && <p className="error">{error}</p>}

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

        <button className="button full" type="submit">Create account</button>
        <p className="smallText">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </section>
  )
}

function Dashboard({ user }: { user: User }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function load() {
    setGroups(await api.groups())
  }

  useEffect(() => {
    load().catch(err => setError(err.message))
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

  return (
    <div className="dashboardLayout">
      <section className="dashboardHero card wide">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome, {user.name}</h1>
          <p className="mutedText">Create groups, join with invite codes, and monitor contribution cycles from one place.</p>
        </div>

        <div className="actions noMargin">
          <Link className="button secondary" to="/simulator">Open simulator</Link>
          <Link className="button secondary" to="/network">Open Trust Network</Link>
          <Link className="button secondary" to="/discover">Discover people</Link>
          <Link className="button secondary" to="/messages">Messages</Link>
          <Link className="button" to="/groups/new">Create group</Link>
        </div>
      </section>

      {error && <p className="error wide">{error}</p>}

      <section className="statsGrid wide">
        <div className="statCard"><span>Your groups</span><strong>{groups.length}</strong></div>
        <div className="statCard"><span>Trust score</span><strong>{user.trust_score}</strong></div>
        <div className="statCard"><span>Verification</span><strong>{user.verification_status}</strong></div>
        <div className="statCard"><span>Money held by Rota</span><strong>€0</strong></div>
      </section>

      <ProductPrinciples compact />

      <section className="card mainPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Your circles</p>
            <h2>Active groups</h2>
          </div>
          <Link className="ghost" to="/groups/new">New group</Link>
        </div>

        {groups.length === 0 ? (
          <div className="emptyState">
            <h3>No groups yet</h3>
            <p>Create your first group or join an existing one with an invite code.</p>
            <Link className="button" to="/groups/new">Create your first group</Link>
          </div>
        ) : (
          <div className="groupCards">
            {groups.map(group => (
              <Link className="groupCard" key={group.id} to={`/groups/${group.id}`}>
                <div className="groupTopline">
                  <strong>{group.name}</strong>
                  <span className="status pending">{group.status}</span>
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
      </section>

      <aside className="sideStack">
        <section className="card">
          <p className="eyebrow">Join existing circle</p>
          <h2>Use invite code</h2>

          <form onSubmit={join} className="form compact">
            <label>
              Invite code
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Example: ABC123"
              />
            </label>

            <button className="button full" type="submit">Join group</button>
          </form>
        </section>

        <section className="card networkTeaser">
          <p className="eyebrow">Trusted Messages</p>
          <h2>Chat with groups and accepted connections.</h2>
          <p>Use group chat for circle coordination, and private chat after a connection request is accepted.</p>
          <Link className="button full secondary" to="/messages">Open messages</Link>
        </section>

        <section className="card networkTeaser">
          <p className="eyebrow">Community Discovery</p>
          <h2>Find people open to trusted circles.</h2>
          <p>Opt in to discovery, find nearby people or groups, send requests, and build new circles carefully.</p>
          <Link className="button full secondary" to="/discover">Open discovery</Link>
        </section>

        <section className="card networkTeaser">
          <p className="eyebrow">Circle Simulator</p>
          <h2>Calculate before you create.</h2>
          <p>Simulate how many people you need, how much each person contributes, and how much each cycle creates.</p>
          <Link className="button full secondary" to="/simulator">Try simulator</Link>
        </section>

        <section className="card networkTeaser">
          <p className="eyebrow">Trust Network</p>
          <h2>See circle health and trusted people.</h2>
          <p>Open the Trust Network dashboard to inspect group health, trusted members, and relationship signals.</p>
          <Link className="button full secondary" to="/network">View Trust Network</Link>
        </section>

        <section className="card safetyCard">
          <p className="eyebrow">Safety model</p>
          <h2>Rota tracks, your group pays.</h2>
          <p>Members pay the selected receiver directly. Rota records payment proof, confirmations, and disputes.</p>
        </section>
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
      <form className="card form" onSubmit={submit}>
        <p className="eyebrow">New contribution circle</p>
        <h1>Create group</h1>
        <p className="mutedText">Start with a trusted invite-only group. You can share the invite code after creation.</p>

        {error && <p className="error">{error}</p>}

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

        <div className="safeNote">
          <span>Estimated pot:</span> {memberLimit} members × {amount} {currency} = {estimatedPot} {currency} each cycle.
        </div>

        <button className="button full" type="submit">Create group</button>
      </form>

      <aside className="card guideCard">
        <p className="eyebrow">Circle rules</p>
        <h2>Members agree before the loop starts</h2>

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

        <Link className="button full secondary" to="/simulator">Open full simulator</Link>
      </aside>
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
    setDetail(await api.groupDetail(id))
  }

  useEffect(() => {
    load().catch(err => setError(err.message))
  }, [id])

  const currentCycle = useMemo(() => detail?.cycles[0], [detail])

  const currentContributions = useMemo(() => {
    if (!detail || !currentCycle) return []
    return detail.contributions.filter(c => c.cycle_id === currentCycle.id)
  }, [detail, currentCycle])

  const myContribution = currentContributions.find(c => c.payer_user_id === user.id)
  const canConfirm = currentContributions.some(c => c.receiver_user_id === user.id)
  const isOrganizer = detail?.members.some(m => m.user_id === user.id && ['organizer', 'co_organizer'].includes(m.role)) ?? false

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

  if (error) return <p className="error">{error}</p>
  if (!detail) return <p className="muted">Loading group...</p>

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
      <section className="groupHero card">
        <div>
          <p className="eyebrow">Invite code: <strong>{detail.group.invite_code}</strong></p>
          <h1>{detail.group.name}</h1>
          <p className="mutedText">
            {detail.group.contribution_amount} {detail.group.currency} • {detail.group.frequency} •{' '}
            {detail.group.payout_method.replace('_', ' ')}
          </p>
        </div>

        <div className="notice strongNotice">
          Rota does not hold money. Members pay the receiver directly, then record proof here.
        </div>
      </section>

      <section className="statsGrid">
        <div className="statCard">
          <span>Expected pot</span>
          <strong>{expectedTotal || detail.group.contribution_amount * detail.members.length} {detail.group.currency}</strong>
        </div>
        <div className="statCard"><span>Confirmed</span><strong>{confirmedTotal} {detail.group.currency}</strong></div>
        <div className="statCard"><span>Marked paid</span><strong>{paidTotal} {detail.group.currency}</strong></div>
        <div className="statCard"><span>Pending rows</span><strong>{pendingCount}</strong></div>
      </section>

      <GroupGovernancePanel
        groupId={detail.group.id}
        isOrganizer={isOrganizer}
        onChanged={load}
      />

      <CircleCalculator detail={detail} currentUserId={user.id} />

      <section className="grid two">
        <div className="card cycleCard">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Current cycle</p>
              <h2>{currentCycle ? `Cycle ${currentCycle.cycle_number}` : 'No cycle yet'}</h2>
            </div>
            {currentCycle && <span className="status confirmed">{confirmedCount}/{currentContributions.length} confirmed</span>}
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
            <p className="mutedText">The organizer can create the first cycle. Contributions will appear automatically.</p>
          )}

          {isOrganizer && (
            <form className="form compact cycleForm" onSubmit={createCycle}>
              <label>
                Next cycle due date
                <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </label>

              <button className="button" type="submit">Create next cycle</button>
            </form>
          )}
        </div>

        <div className="card">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Members</p>
              <h2>{detail.members.length} members</h2>
            </div>
          </div>

          <div className="memberList">
            {detail.members.map(m => (
              <div key={m.id} className="memberRow">
                <span className="avatar">{m.name?.slice(0, 1).toUpperCase() || '?'}</span>
                <div>
                  <strong>{m.name}</strong>
                  <span>{m.email}</span>
                </div>
                <div className="memberRowActions">
                  <em>{m.role}</em>
                  {m.user_id !== user.id && (
                    <Link className="ghost mini" to={`/reviews/${m.user_id}`}>
                      Reviews
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MemberReviewPanel detail={detail} currentUserId={user.id} />

      <GroupChatPanel groupId={detail.group.id} />

      {currentCycle && myContribution && (
        <PayCard contribution={myContribution} groupCurrency={detail.group.currency} onSaved={load} />
      )}

      {currentCycle && (canConfirm || isOrganizer) && (
        <ConfirmTable contributions={currentContributions} currency={detail.group.currency} onSaved={load} />
      )}

      <section className="card wide">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Shared record</p>
            <h2>Contribution ledger</h2>
          </div>
        </div>

        {currentContributions.length === 0 ? (
          <p className="mutedText">No contribution rows yet. Create a cycle to generate the ledger.</p>
        ) : (
          <ContributionTable
            contributions={currentContributions}
            currency={detail.group.currency}
            actions={c => (
              <ReceiptReviewActions
                contribution={c}
                currentUserId={user.id}
                onSaved={load}
              />
            )}
          />
        )}
      </section>

      <section className="card wide">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Transparency</p>
            <h2>Audit log</h2>
          </div>
        </div>

        <div className="timeline">
          {detail.audit_logs.length === 0 ? (
            <p className="mutedText">No activity yet.</p>
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
      </section>
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
    <form className="card form paymentCard" onSubmit={submit}>
      <div>
        <p className="eyebrow">Your action</p>
        <h2>Record your payment proof</h2>
        <p>
          Pay <strong>{contribution.amount} {groupCurrency}</strong> to{' '}
          <strong>{contribution.receiver_name}</strong> outside the app, then upload proof here.
        </p>
        <p>Status: <span className={`status ${contribution.status}`}>{contribution.status.replace(/_/g, ' ')}</span></p>
      </div>

      {error && <p className="error">{error}</p>}

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

      <button className="button full" type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'I paid / upload proof'}
      </button>
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
    <section className="card wide">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Receiver / organizer</p>
          <h2>Confirm received payments</h2>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <ContributionTable
        contributions={contributions}
        currency={currency}
        actions={c => (
          <div className="rowActions">
            <button
              className="button mini"
              onClick={() => confirm(c.id)}
              disabled={c.status === 'confirmed' || c.status === 'group_verified'}
            >
              Confirm
            </button>
            <button className="ghost mini" onClick={() => dispute(c.id)}>
              Dispute
            </button>
          </div>
        )}
      />
    </section>
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
              <td><span className={`status ${c.status}`}>{c.status.replace(/_/g, ' ')}</span></td>
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
          path="/dashboard"
          element={
            <RequireAuth user={auth.user} loading={auth.loading}>
              <Dashboard user={auth.user!} />
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