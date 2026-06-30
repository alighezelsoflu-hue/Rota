import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import type { NetworkEdge, NetworkGraph, NetworkNode } from './api'

function initials(label: string) {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?'
}

function healthLabel(node: NetworkNode) {
  if (node.health === 'risk') return 'At risk'
  if (node.health === 'watch') return 'Watch'
  if (node.health === 'healthy') return 'Strong'
  if ((node.member_count || 0) >= 5) return 'Strong'
  if ((node.member_count || 0) >= 2) return 'Building'
  return 'New'
}

function healthClass(label: string) {
  const value = label.toLowerCase()
  if (value.includes('risk')) return 'risk'
  if (value.includes('watch')) return 'watch'
  if (value.includes('strong')) return 'strong'
  if (value.includes('building')) return 'building'
  return 'new'
}

function relationshipLabel(edge: NetworkEdge) {
  return edge.type.replace(/_/g, ' ')
}

function groupMembers(group: NetworkNode, graph: NetworkGraph) {
  const people = graph.nodes.filter(node => node.type === 'person')
  const memberIds = graph.edges
    .filter(edge => edge.target === group.id || edge.source === group.id)
    .map(edge => (edge.target === group.id ? edge.source : edge.target))

  return people.filter(person => memberIds.includes(person.id))
}

function personGroups(person: NetworkNode, graph: NetworkGraph) {
  const groups = graph.nodes.filter(node => node.type === 'group')
  const groupIds = graph.edges
    .filter(edge => edge.source === person.id || edge.target === person.id)
    .map(edge => (edge.source === person.id ? edge.target : edge.source))

  return groups.filter(group => groupIds.includes(group.id))
}

function selectedConnections(node: NetworkNode, graph: NetworkGraph) {
  return graph.edges.filter(edge => edge.source === node.id || edge.target === node.id)
}

export default function TrustNetworkDashboard() {
  const [graph, setGraph] = useState<NetworkGraph | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    const data = await api.network()
    setGraph(data)
    setSelectedId(current => current || data.nodes.find(node => node.role === 'current_user')?.id || data.nodes[0]?.id || null)
  }

  useEffect(() => {
    load().catch(err => setError(err instanceof Error ? err.message : 'Could not load network'))
  }, [])

  const summary = useMemo(() => {
    if (!graph) {
      return {
        people: 0,
        groups: 0,
        averageTrust: 0,
        connections: 0,
        atRisk: 0,
      }
    }

    const groups = graph.nodes.filter(node => node.type === 'group')
    const atRisk = groups.filter(group => healthClass(healthLabel(group)) === 'risk').length

    return {
      people: graph.stats.people,
      groups: graph.stats.groups,
      averageTrust: graph.stats.average_trust,
      connections: graph.stats.connections,
      atRisk,
    }
  }, [graph])

  if (error) return <p className="error">{error}</p>
  if (!graph) return <p className="muted">Loading trust network...</p>

  const currentUser = graph.nodes.find(node => node.role === 'current_user') || graph.nodes.find(node => node.type === 'person')
  const groups = graph.nodes.filter(node => node.type === 'group')
  const people = graph.nodes.filter(node => node.type === 'person')
  const trustedPeople = people.filter(person => person.id !== currentUser?.id)
  const selected = graph.nodes.find(node => node.id === selectedId) || currentUser || null
  const selectedEdges = selected ? selectedConnections(selected, graph) : []

  return (
    <div className="trustNetworkPage">
      <section className="trustNetworkHero">
        <div>
          <p className="eyebrow">Trust Network</p>
          <h1>Your circle reputation layer.</h1>
          <p>
            See who you save with, which circles are healthy, and where trusted relationships are growing.
            Rota tracks group activity, proof, confirmations, and connections — not bank balances.
          </p>
        </div>

        <div className="trustNetworkHeroCard">
          <span>Rota money custody</span>
          <strong>€0</strong>
          <small>Members pay each other directly.</small>
        </div>
      </section>

      <section className="trustNetworkStats">
        <article>
          <span>Trusted people</span>
          <strong>{summary.people}</strong>
          <small>People connected through circles</small>
        </article>

        <article>
          <span>Active circles</span>
          <strong>{summary.groups}</strong>
          <small>Groups in your network</small>
        </article>

        <article>
          <span>Connections</span>
          <strong>{summary.connections}</strong>
          <small>Relationship links</small>
        </article>

        <article>
          <span>Average trust</span>
          <strong>{summary.averageTrust}</strong>
          <small>Internal Rota activity signal</small>
        </article>

        <article className={summary.atRisk > 0 ? 'risk' : 'safe'}>
          <span>At-risk circles</span>
          <strong>{summary.atRisk}</strong>
          <small>{summary.atRisk > 0 ? 'Needs attention' : 'No active risks shown'}</small>
        </article>
      </section>

      <section className="trustNetworkMain">
        <div className="trustNetworkLeft">
          <section className="trustPanelCard">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Circle health</p>
                <h2>Which groups look strong?</h2>
              </div>
              <Link className="button secondary" to="/groups/new">Create circle</Link>
            </div>

            {groups.length === 0 ? (
              <div className="emptyState">
                <h3>No circles yet</h3>
                <p>Create or join your first circle to start building your Trust Network.</p>
              </div>
            ) : (
              <div className="circleHealthList">
                {groups.map(group => {
                  const label = healthLabel(group)
                  const members = groupMembers(group, graph)

                  return (
                    <button
                      key={group.id}
                      type="button"
                      className={`circleHealthCard ${selectedId === group.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(group.id)}
                    >
                      <div className="circleHealthTop">
                        <div>
                          <strong>{group.label}</strong>
                          <span>{group.member_count || members.length} members · {group.frequency || 'cycle'}</span>
                        </div>
                        <em className={`healthBadge ${healthClass(label)}`}>{label}</em>
                      </div>

                      <div className="circleHealthMeta">
                        <div>
                          <span>Contribution</span>
                          <strong>{group.contribution_amount || 0} {group.currency || ''}</strong>
                        </div>
                        <div>
                          <span>Members shown</span>
                          <strong>{members.length}</strong>
                        </div>
                        <div>
                          <span>Money held</span>
                          <strong>€0</strong>
                        </div>
                      </div>

                      <div className="memberChips">
                        {members.slice(0, 6).map(member => (
                          <span key={member.id}>{initials(member.label)}</span>
                        ))}
                        {members.length > 6 && <span>+{members.length - 6}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="trustPanelCard">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Trusted people</p>
                <h2>People connected to your circles</h2>
              </div>
            </div>

            {trustedPeople.length === 0 ? (
              <p className="mutedText">Invite members to groups to build your trusted people list.</p>
            ) : (
              <div className="trustedPeopleGrid">
                {trustedPeople.map(person => {
                  const groupsForPerson = personGroups(person, graph)

                  return (
                    <button
                      key={person.id}
                      type="button"
                      className={`trustedPersonCard ${selectedId === person.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(person.id)}
                    >
                      <span className="trustedAvatar">{initials(person.label)}</span>
                      <div>
                        <strong>{person.label}</strong>
                        <small>Trust {person.trust_score ?? '-'}</small>
                        <em>{groupsForPerson.length} shared circle{groupsForPerson.length === 1 ? '' : 's'}</em>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="trustNetworkRight">
          <section className="trustPanelCard">
            <p className="eyebrow">Relationship map</p>
            <h2>You → Circles → Members</h2>

            <div className="relationshipMap">
              {groups.length === 0 ? (
                <p className="mutedText">The relationship map appears after you join or create circles.</p>
              ) : groups.map(group => {
                const members = groupMembers(group, graph).filter(member => member.id !== currentUser?.id)

                return (
                  <div key={group.id} className="relationshipRow">
                    <button
                      type="button"
                      className={`relationshipYou ${selectedId === currentUser?.id ? 'selected' : ''}`}
                      onClick={() => currentUser && setSelectedId(currentUser.id)}
                    >
                      {currentUser ? initials(currentUser.label) : 'You'}
                    </button>

                    <span className="relationshipLine" />

                    <button
                      type="button"
                      className={`relationshipGroup ${selectedId === group.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(group.id)}
                    >
                      <strong>{group.label}</strong>
                      <small>{group.member_count || members.length} members</small>
                    </button>

                    <span className="relationshipLine" />

                    <div className="relationshipMembers">
                      {members.slice(0, 4).map(member => (
                        <button
                          key={member.id}
                          type="button"
                          className={selectedId === member.id ? 'selected' : ''}
                          onClick={() => setSelectedId(member.id)}
                        >
                          {initials(member.label)}
                        </button>
                      ))}
                      {members.length > 4 && <em>+{members.length - 4}</em>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="trustPanelCard selectedTrustCard">
            <p className="eyebrow">Selected profile</p>

            {selected ? (
              <>
                <div className="selectedTrustHeader">
                  <span className={selected.type === 'group' ? 'selectedAvatar group' : 'selectedAvatar'}>
                    {selected.type === 'group' ? '●' : initials(selected.label)}
                  </span>
                  <div>
                    <h2>{selected.label}</h2>
                    {selected.subtitle && <p>{selected.subtitle}</p>}
                  </div>
                </div>

                <div className="selectedTrustFacts">
                  {selected.type === 'group' ? (
                    <>
                      <div><span>Type</span><strong>Circle</strong></div>
                      <div><span>Health</span><strong>{healthLabel(selected)}</strong></div>
                      <div><span>Contribution</span><strong>{selected.contribution_amount || 0} {selected.currency || ''}</strong></div>
                      <div><span>Members</span><strong>{selected.member_count || 0}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>Type</span><strong>Person</strong></div>
                      <div><span>Trust score</span><strong>{selected.trust_score ?? '-'}</strong></div>
                      <div><span>Verification</span><strong>{selected.verification_status || 'basic'}</strong></div>
                      <div><span>Shared groups</span><strong>{personGroups(selected, graph).length}</strong></div>
                    </>
                  )}
                </div>

                <div className="selectedConnections">
                  <h3>Trust signals</h3>

                  {selectedEdges.length === 0 ? (
                    <p className="mutedText">No relationship signals yet.</p>
                  ) : selectedEdges.map(edge => (
                    <div key={edge.id}>
                      <span>{relationshipLabel(edge)}</span>
                      <strong>{edge.label || edge.status || 'connected'}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mutedText">Select a person or circle to inspect it.</p>
            )}
          </section>

          <section className="trustDisclaimer">
            <strong>Important trust note</strong>
            <p>
              Rota trust signals are based only on activity inside Rota groups. They are not a credit
              score, financial guarantee, bank rating, or identity verification.
            </p>
          </section>
        </aside>
      </section>
    </div>
  )
}