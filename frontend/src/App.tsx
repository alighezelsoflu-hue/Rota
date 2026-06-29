import React, { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { api, clearToken, getToken, setToken } from './api'
import type { Contribution, Group, GroupDetail, NetworkEdge, NetworkGraph, NetworkNode, User } from './api'
import CircleCalculator from './CircleCalculator'
import ProductPrinciples from './ProductPrinciples'
import LiveCircleSimulator from './LiveCircleSimulator'

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

function Shell({ user, onLogout, children }: { user: User | null; onLogout: () => void; children: React.ReactNode }) {
  return (
    <div>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Rota home">
          <span className="brandMark">R</span>
          <span>Rota</span>
        </Link>
        <nav>
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/network">Trust Network</Link>
              <Link to="/simulator">Simulator</Link>
              <Link to="/groups/new">Create group</Link>
              <span className="trust">Trust {user.trust_score}</span>
              <button className="ghost" onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <a href="/#how-it-works">How it works</a>
              <a href="/#trust">Trust</a>
              <Link to="/simulator">Simulator</Link>
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

function RequireAuth({ user, loading, children }: { user: User | null; loading: boolean; children: React.ReactNode }) {
  if (loading) return <p className="muted">Loading...</p>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Landing() {
  return (
    <div className="landing">
      <section className="heroShell">
        <div className="heroCopy">
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
            <span>Important:</span> Your group charges no interest. No wallet. No deposits. Members pay each other directly.
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
          <div className="progress"><span style={{ width: '80%' }} /></div>
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
            <p>Each cycle, members send money to the selected receiver using bank transfer, mobile money, or cash.</p>
          </article>
          <article className="featureCard">
            <span className="icon">3</span>
            <h3>Proof is tracked</h3>
            <p>Members upload proof, receivers confirm receipt, and everyone sees the shared group ledger.</p>
          </article>
        </div>
      </section>

      <section id="trust" className="trustPanel">
        <div>
          <p className="eyebrow">Built for transparency</p>
          <h2>Rota is the scorekeeper, not the bank.</h2>
          <p className="mutedText">
            Your group keeps control of the money flow. Rota keeps the records clear, visible, and easy to review.
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
        <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" required /></label>
        <label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" required /></label>
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
        <label>Name<input value={name} onChange={e => setName(e.target.value)} required /></label>
        <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" required /></label>
        <label>Phone<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" /></label>
        <label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" minLength={8} required /></label>
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

  useEffect(() => { load().catch(err => setError(err.message)) }, [])

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
            <label>Invite code<input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="Example: ABC123" /></label>
            <button className="button full" type="submit">Join group</button>
          </form>
        </section>

        <section className="card networkTeaser">
          <p className="eyebrow">Circle Simulator</p>
          <h2>Calculate before you create.</h2>
          <p>Simulate how many people you need, how much each person contributes, and how much each cycle creates.</p>
          <Link className="button full secondary" to="/simulator">Try simulator</Link>
        </section>

        <section className="card networkTeaser">
          <p className="eyebrow">Trust Network</p>
          <h2>See how people and groups connect.</h2>
          <p>Open the graph view to see members, groups, organizer links, and shared connections.</p>
          <Link className="button full secondary" to="/network">View network graph</Link>
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
        payout_method: 'fixed_rotation'
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
        <label>Group name<input value={name} onChange={e => setName(e.target.value)} placeholder="Example: Family monthly circle" required /></label>
        <label>Contribution amount<input value={amount} onChange={e => setAmount(Number(e.target.value))} type="number" min="1" required /></label>
        <label>Currency<input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={8} required /></label>
        <label>Frequency
          <select value={frequency} onChange={e => setFrequency(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <label>Member limit<input value={memberLimit} onChange={e => setMemberLimit(Number(e.target.value))} type="number" min="2" max="50" /></label>
        <div className="safeNote">
          <span>Estimated pot:</span> {memberLimit} members × {amount} {currency} = {estimatedPot} {currency} each cycle.
        </div>
        <button className="button full" type="submit">Create group</button>
      </form>

      <aside className="card guideCard">
        <p className="eyebrow">Recommended MVP rules</p>
        <h2>Keep the first groups simple</h2>
        <ul className="checkList">
          <li>Invite-only members</li>
          <li>One currency per group</li>
          <li>Fixed rotation payout order</li>
          <li>Direct payments outside Rota</li>
          <li>Proof upload and receiver confirmation</li>
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

  useEffect(() => { load().catch(err => setError(err.message)) }, [id])

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

  const confirmedTotal = currentContributions.filter(c => c.status === 'confirmed').reduce((sum, c) => sum + c.amount, 0)
  const paidTotal = currentContributions.filter(c => c.status === 'paid' || c.status === 'confirmed').reduce((sum, c) => sum + c.amount, 0)
  const expectedTotal = currentContributions.reduce((sum, c) => sum + c.amount, 0)
  const pendingCount = currentContributions.filter(c => c.status === 'pending').length
  const confirmedCount = currentContributions.filter(c => c.status === 'confirmed').length
  const progressPercent = expectedTotal ? (confirmedTotal / expectedTotal) * 100 : 0

  return (
    <div className="stack">
      <section className="groupHero card">
        <div>
          <p className="eyebrow">Invite code: <strong>{detail.group.invite_code}</strong></p>
          <h1>{detail.group.name}</h1>
          <p className="mutedText">
            {detail.group.contribution_amount} {detail.group.currency} • {detail.group.frequency} • {detail.group.payout_method.replace('_', ' ')}
          </p>
        </div>
        <div className="notice strongNotice">Rota does not hold money. Members pay the receiver directly, then record proof here.</div>
      </section>

      <section className="statsGrid">
        <div className="statCard"><span>Expected pot</span><strong>{expectedTotal || detail.group.contribution_amount * detail.members.length} {detail.group.currency}</strong></div>
        <div className="statCard"><span>Confirmed</span><strong>{confirmedTotal} {detail.group.currency}</strong></div>
        <div className="statCard"><span>Marked paid</span><strong>{paidTotal} {detail.group.currency}</strong></div>
        <div className="statCard"><span>Pending rows</span><strong>{pendingCount}</strong></div>
      </section>

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
              <div className="progress"><span style={{ width: `${progressPercent}%` }} /></div>
              <p className="mutedText">{confirmedTotal} {detail.group.currency} confirmed out of {expectedTotal} expected.</p>
            </>
          ) : <p className="mutedText">The organizer can create the first cycle. Contributions will appear automatically.</p>}
          {isOrganizer && (
            <form className="form compact cycleForm" onSubmit={createCycle}>
              <label>Next cycle due date<input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label>
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
                <div><strong>{m.name}</strong><span>{m.email}</span></div>
                <em>{m.role}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      {currentCycle && myContribution && <PayCard contribution={myContribution} groupCurrency={detail.group.currency} onSaved={load} />}
      {currentCycle && (canConfirm || isOrganizer) && <ConfirmTable contributions={currentContributions} currency={detail.group.currency} onSaved={load} />}

      <section className="card wide">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Shared record</p>
            <h2>Contribution ledger</h2>
          </div>
        </div>
        {currentContributions.length === 0 ? <p className="mutedText">No contribution rows yet. Create a cycle to generate the ledger.</p> : <ContributionTable contributions={currentContributions} currency={detail.group.currency} />}
      </section>

      <section className="card wide">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Transparency</p>
            <h2>Audit log</h2>
          </div>
        </div>
        <div className="timeline">
          {detail.audit_logs.length === 0 ? <p className="mutedText">No activity yet.</p> : detail.audit_logs.map(log => (
            <div key={log.id} className="timelineItem">
              <span />
              <div><strong>{log.action}</strong><small>{new Date(log.created_at).toLocaleString()}</small></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

type PositionedNode = NetworkNode & { x: number; y: number }

function nodeInitials(label: string) {
  const parts = label.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('') || '?'
}

function buildNetworkLayout(graph: NetworkGraph) {
  const width = 1040
  const height = 680
  const centerX = width / 2
  const centerY = height / 2
  const people = graph.nodes.filter(n => n.type === 'person')
  const groups = graph.nodes.filter(n => n.type === 'group')
  const currentUser = people.find(n => n.role === 'current_user') || people[0]
  const positioned: Record<string, PositionedNode> = {}

  if (currentUser) {
    positioned[currentUser.id] = { ...currentUser, x: centerX, y: centerY }
  }

  const groupRadius = groups.length <= 2 ? 190 : 225
  groups.forEach((group, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, groups.length)
    positioned[group.id] = {
      ...group,
      x: centerX + Math.cos(angle) * groupRadius,
      y: centerY + Math.sin(angle) * groupRadius,
    }
  })

  const otherPeople = people.filter(p => p.id !== currentUser?.id)
  otherPeople.forEach((person, index) => {
    const connectedGroupEdge = graph.edges.find(e => e.source === person.id && e.target.startsWith('group:'))
    const groupPosition = connectedGroupEdge ? positioned[connectedGroupEdge.target] : undefined
    if (groupPosition) {
      const targetGroupId = connectedGroupEdge?.target || ''
      const sameGroupPeople = otherPeople.filter(p => graph.edges.some(e => e.source === p.id && e.target === targetGroupId))
      const groupIndex = sameGroupPeople.findIndex(p => p.id === person.id)
      const fanAngle = -Math.PI / 2 + (Math.PI * 2 * groupIndex) / Math.max(1, sameGroupPeople.length)
      positioned[person.id] = {
        ...person,
        x: groupPosition.x + Math.cos(fanAngle) * 110,
        y: groupPosition.y + Math.sin(fanAngle) * 92,
      }
    } else {
      const angle = Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, otherPeople.length)
      positioned[person.id] = {
        ...person,
        x: centerX + Math.cos(angle) * 300,
        y: centerY + Math.sin(angle) * 260,
      }
    }
  })

  return { width, height, positioned }
}

function NetworkPage() {
  const [graph, setGraph] = useState<NetworkGraph | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    const data = await api.network()
    setGraph(data)
    setSelectedId(current => current || data.nodes.find(n => n.role === 'current_user')?.id || data.nodes[0]?.id || null)
  }

  useEffect(() => { load().catch(err => setError(err.message)) }, [])

  const layout = useMemo(() => graph ? buildNetworkLayout(graph) : null, [graph])
  const selected = graph?.nodes.find(n => n.id === selectedId) || graph?.nodes.find(n => n.role === 'current_user') || null
  const connectedEdges = selected && graph ? graph.edges.filter(e => e.source === selected.id || e.target === selected.id) : []

  if (error) return <p className="error">{error}</p>
  if (!graph || !layout) return <p className="muted">Loading trust network...</p>

  return (
    <div className="networkLayout">
      <section className="networkHero card wide">
        <div>
          <p className="eyebrow">Trust Network</p>
          <h1>People and groups, connected visually.</h1>
          <p className="mutedText">Your network shows who belongs to which circle, who organizes groups, and where shared trust connections are forming.</p>
        </div>
        <div className="actions noMargin">
          <Link className="button secondary" to="/dashboard">Dashboard</Link>
          <Link className="button secondary" to="/simulator">Simulator</Link>
          <Link className="button" to="/groups/new">Create group</Link>
        </div>
      </section>

      <section className="statsGrid wide">
        <div className="statCard"><span>People</span><strong>{graph.stats.people}</strong></div>
        <div className="statCard"><span>Groups</span><strong>{graph.stats.groups}</strong></div>
        <div className="statCard"><span>Connections</span><strong>{graph.stats.connections}</strong></div>
        <div className="statCard"><span>Average trust</span><strong>{graph.stats.average_trust}</strong></div>
      </section>

      <section className="card graphCard">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Circle map</p>
            <h2>Your live relationship graph</h2>
          </div>
          <div className="legend">
            <span><i className="legendPerson" /> Person</span>
            <span><i className="legendGroup" /> Group</span>
            <span><i className="legendRisk" /> Risk</span>
          </div>
        </div>

        {graph.nodes.length <= 1 ? (
          <div className="emptyState networkEmpty">
            <h3>Your network starts with your first group</h3>
            <p>Create or join a group. Rota will draw the people, groups, and connection lines automatically.</p>
            <Link className="button" to="/groups/new">Create your first group</Link>
          </div>
        ) : (
          <div className="graphCanvas" aria-label="Trust network graph">
            <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img">
              <defs>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.12" />
                </filter>
              </defs>
              {graph.edges.map(edge => {
                const source = layout.positioned[edge.source]
                const target = layout.positioned[edge.target]
                if (!source || !target) return null
                const isSelected = selectedId === edge.source || selectedId === edge.target
                return (
                  <g key={edge.id}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      className={`graphEdge edge-${edge.type} ${isSelected ? 'selected' : ''}`}
                      strokeWidth={Math.max(1.5, edge.strength)}
                    />
                    {edge.type === 'shared_members' && (
                      <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 6} className="edgeLabel">{edge.label}</text>
                    )}
                  </g>
                )
              })}
              {Object.values(layout.positioned).map(node => {
                const isGroup = node.type === 'group'
                const isCurrent = node.role === 'current_user'
                const isSelected = selectedId === node.id
                const isRisk = node.health === 'risk'
                return (
                  <g key={node.id} className={`graphNode ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedId(node.id)} tabIndex={0} role="button">
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isGroup ? 56 : isCurrent ? 52 : 40}
                      className={`${isGroup ? 'nodeGroup' : 'nodePerson'} ${isCurrent ? 'nodeCurrent' : ''} ${isRisk ? 'nodeRisk' : ''}`}
                      filter="url(#softShadow)"
                    />
                    <text x={node.x} y={node.y - 2} className="nodeInitials">{isGroup ? '●' : nodeInitials(node.label)}</text>
                    <text x={node.x} y={node.y + (isGroup ? 76 : 62)} className="nodeLabel">{node.label}</text>
                    {!isGroup && node.trust_score !== undefined && node.trust_score !== null && (
                      <text x={node.x} y={node.y + (isGroup ? 94 : 80)} className="nodeSubLabel">Trust {node.trust_score}</text>
                    )}
                    {isGroup && (
                      <text x={node.x} y={node.y + 94} className="nodeSubLabel">{node.member_count || 0} members</text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        )}
      </section>

      <aside className="card networkDetails">
        <p className="eyebrow">Selected node</p>
        {selected ? <NodeDetails node={selected} edges={connectedEdges} /> : <p className="mutedText">Click a person or group to inspect it.</p>}
      </aside>
    </div>
  )
}

function NodeDetails({ node, edges }: { node: NetworkNode; edges: NetworkEdge[] }) {
  const isGroup = node.type === 'group'
  return (
    <div className="nodeDetailsBody">
      <div className={`detailAvatar ${isGroup ? 'group' : 'person'}`}>{isGroup ? '●' : nodeInitials(node.label)}</div>
      <h2>{node.label}</h2>
      {node.subtitle && <p className="mutedText">{node.subtitle}</p>}

      <div className="detailFacts">
        {isGroup ? (
          <>
            <div><span>Contribution</span><strong>{node.contribution_amount || 0} {node.currency}</strong></div>
            <div><span>Frequency</span><strong>{node.frequency || '-'}</strong></div>
            <div><span>Members</span><strong>{node.member_count || 0}</strong></div>
            <div><span>Health</span><strong>{(node.health || 'new').replace('_', ' ')}</strong></div>
          </>
        ) : (
          <>
            <div><span>Trust score</span><strong>{node.trust_score ?? '-'}</strong></div>
            <div><span>Role</span><strong>{(node.role || 'member').replace('_', ' ')}</strong></div>
            <div><span>Verification</span><strong>{node.verification_status || 'basic'}</strong></div>
            <div><span>Groups</span><strong>{node.group_count || 0}</strong></div>
          </>
        )}
      </div>

      <div className="connectionList">
        <h3>Connections</h3>
        {edges.length === 0 ? <p className="mutedText">No connections yet.</p> : edges.map(edge => (
          <div key={edge.id} className="connectionRow">
            <span>{edge.type.replace('_', ' ')}</span>
            <strong>{edge.label || edge.status || 'connected'}</strong>
          </div>
        ))}
      </div>

      {isGroup && node.id.startsWith('group:') && (
        <Link className="button full" to={`/groups/${node.id.replace('group:', '')}`}>Open group</Link>
      )}
    </div>
  )
}

function PayCard({ contribution, groupCurrency, onSaved }: { contribution: Contribution; groupCurrency: string; onSaved: () => Promise<void> }) {
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
        <p>Pay <strong>{contribution.amount} {groupCurrency}</strong> to <strong>{contribution.receiver_name}</strong> outside the app, then upload proof here.</p>
        <p>Status: <span className={`status ${contribution.status}`}>{contribution.status}</span></p>
      </div>
      {error && <p className="error">{error}</p>}
      <label>Payment reference<input value={reference} onChange={e => setReference(e.target.value)} placeholder="Bank/mobile money reference" /></label>
      <label>Note<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note for the receiver or organizer" /></label>
      <label>Proof screenshot or PDF<input type="file" accept="image/*,application/pdf" onChange={e => setProof(e.target.files?.[0] || null)} /></label>
      <button className="button full" type="submit" disabled={saving}>{saving ? 'Saving...' : 'I paid / upload proof'}</button>
    </form>
  )
}

function ConfirmTable({ contributions, currency, onSaved }: { contributions: Contribution[]; currency: string; onSaved: () => Promise<void> }) {
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
      <ContributionTable contributions={contributions} currency={currency} actions={(c) => (
        <div className="rowActions">
          <button className="button mini" onClick={() => confirm(c.id)} disabled={c.status === 'confirmed'}>Confirm</button>
          <button className="ghost mini" onClick={() => dispute(c.id)}>Dispute</button>
        </div>
      )} />
    </section>
  )
}

function ContributionTable({ contributions, currency, actions }: { contributions: Contribution[]; currency: string; actions?: (c: Contribution) => React.ReactNode }) {
  return (
    <div className="tableWrap">
      <table>
        <thead><tr><th>Payer</th><th>Amount</th><th>Status</th><th>Reference</th><th>Proof</th>{actions && <th>Actions</th>}</tr></thead>
        <tbody>
          {contributions.map(c => (
            <tr key={c.id}>
              <td>{c.payer_name}</td>
              <td>{c.amount} {currency}</td>
              <td><span className={`status ${c.status}`}>{c.status}</span></td>
              <td>{c.payment_reference || '-'}</td>
              <td>{c.proof_url ? <a href={`${api.apiBase}${c.proof_url}`} target="_blank">View proof</a> : '-'}</td>
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
        <Route path="/dashboard" element={<RequireAuth user={auth.user} loading={auth.loading}><Dashboard user={auth.user!} /></RequireAuth>} />
        <Route path="/groups/new" element={<RequireAuth user={auth.user} loading={auth.loading}><NewGroup /></RequireAuth>} />
        <Route path="/network" element={<RequireAuth user={auth.user} loading={auth.loading}><NetworkPage /></RequireAuth>} />
        <Route path="/groups/:id" element={<RequireAuth user={auth.user} loading={auth.loading}><GroupPage user={auth.user!} /></RequireAuth>} />
      </Routes>
    </Shell>
  )
}