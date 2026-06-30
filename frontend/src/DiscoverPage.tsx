import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import type { DiscoveryGroup, DiscoveryPerson, DiscoveryProfile } from './api'

function moneyRange(person: DiscoveryPerson) {
  if (person.preferred_min_amount && person.preferred_max_amount) {
    return `${person.preferred_min_amount}–${person.preferred_max_amount} ${person.preferred_currency}`
  }

  if (person.preferred_min_amount) {
    return `From ${person.preferred_min_amount} ${person.preferred_currency}`
  }

  if (person.preferred_max_amount) {
    return `Up to ${person.preferred_max_amount} ${person.preferred_currency}`
  }

  return `Open amount · ${person.preferred_currency}`
}

function mapPoint(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return null

  const left = ((lng + 180) / 360) * 100
  const top = ((90 - lat) / 180) * 100

  return {
    left: `${Math.min(96, Math.max(4, left))}%`,
    top: `${Math.min(92, Math.max(8, top))}%`,
  }
}

export default function DiscoverPage() {
  const [profile, setProfile] = useState<DiscoveryProfile | null>(null)
  const [people, setPeople] = useState<DiscoveryPerson[]>([])
  const [groups, setGroups] = useState<DiscoveryGroup[]>([])
  const [requests, setRequests] = useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    const [profileData, peopleData, groupData, requestData] = await Promise.all([
      api.discoveryProfile(),
      api.discoverPeople(),
      api.discoverGroups(),
      api.discoveryRequests(),
    ])

    setProfile(profileData)
    setPeople(peopleData)
    setGroups(groupData)
    setRequests(requestData)
  }

  useEffect(() => {
    load().catch(err => setError(err instanceof Error ? err.message : 'Could not load discovery'))
  }, [])

  const mapPins = useMemo(() => {
    const peoplePins = people
      .map(person => ({
        id: `person-${person.user_id}`,
        type: 'person',
        label: person.name,
        point: mapPoint(person.latitude_approx, person.longitude_approx),
      }))
      .filter(pin => pin.point)

    const groupPins = groups
      .map(group => ({
        id: `group-${group.group_id}`,
        type: 'group',
        label: group.name,
        point: mapPoint(group.latitude_approx, group.longitude_approx),
      }))
      .filter(pin => pin.point)

    return [...peoplePins, ...groupPins]
  }, [people, groups])

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!profile) return

    setBusy('profile')
    setError('')
    setMessage('')

    try {
      await api.saveDiscoveryProfile({
        is_discoverable: profile.is_discoverable,
        city: profile.city,
        country: profile.country,
        latitude_approx: profile.latitude_approx,
        longitude_approx: profile.longitude_approx,
        radius_km: profile.radius_km,
        preferred_min_amount: profile.preferred_min_amount,
        preferred_max_amount: profile.preferred_max_amount,
        preferred_currency: profile.preferred_currency,
        preferred_frequency: profile.preferred_frequency,
        bio: profile.bio,
        open_to_new_groups: profile.open_to_new_groups,
      })
      setMessage('Discovery profile saved.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setBusy('')
    }
  }

  async function connect(person: DiscoveryPerson) {
    const note = window.prompt(`Send a short connection message to ${person.name}`)
    if (note === null) return

    setBusy(`person-${person.user_id}`)
    setError('')
    setMessage('')

    try {
      await api.sendConnectionRequest(person.user_id, note)
      setMessage(`Connection request sent to ${person.name}.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send request')
    } finally {
      setBusy('')
    }
  }

  async function joinGroup(group: DiscoveryGroup) {
    const note = window.prompt(`Send a short join request to ${group.name}`)
    if (note === null) return

    setBusy(`group-${group.group_id}`)
    setError('')
    setMessage('')

    try {
      await api.requestToJoinDiscoveredGroup(group.group_id, note)
      setMessage(`Join request sent to ${group.name}.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request to join')
    } finally {
      setBusy('')
    }
  }

  async function respond(requestId: string, decision: 'accepted' | 'declined' | 'blocked') {
    setBusy(requestId)
    setError('')
    setMessage('')

    try {
      await api.respondConnectionRequest(requestId, decision)
      setMessage('Connection request updated.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update request')
    } finally {
      setBusy('')
    }
  }

  if (!profile) {
    return <p className="mutedText">Loading discovery...</p>
  }

  return (
    <div className="discoverPage">
      <section className="discoverHero">
        <div>
          <p className="eyebrow">Community discovery</p>
          <h1>Find people and groups open to trusted 0% interest circles.</h1>
          <p>
            Discovery is opt-in. Rota shows approximate area only, never an exact home address.
            Send connection or join requests before building a circle with new people.
          </p>
        </div>

        <div className="discoverHeroBadge">
          <strong>Approximate</strong>
          <span>location only</span>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {message && <p className="safeNote">{message}</p>}

      <section className="discoverGrid">
        <form className="discoverPanel form" onSubmit={saveProfile}>
          <p className="eyebrow">Your discovery profile</p>
          <h2>Control how people find you</h2>

          <label className="toggleLine">
            <input
              type="checkbox"
              checked={profile.is_discoverable}
              onChange={event => setProfile({ ...profile, is_discoverable: event.target.checked })}
            />
            Show me in community discovery
          </label>

          <label className="toggleLine">
            <input
              type="checkbox"
              checked={profile.open_to_new_groups}
              onChange={event => setProfile({ ...profile, open_to_new_groups: event.target.checked })}
            />
            I am open to new groups
          </label>

          <label>
            City / area
            <input
              value={profile.city || ''}
              onChange={event => setProfile({ ...profile, city: event.target.value })}
              placeholder="Amsterdam"
            />
          </label>

          <label>
            Country
            <input
              value={profile.country || ''}
              onChange={event => setProfile({ ...profile, country: event.target.value })}
              placeholder="Netherlands"
            />
          </label>

          <div className="grid two">
            <label>
              Approx latitude
              <input
                type="number"
                step="0.01"
                value={profile.latitude_approx ?? ''}
                onChange={event => setProfile({ ...profile, latitude_approx: event.target.value ? Number(event.target.value) : null })}
                placeholder="52.37"
              />
            </label>

            <label>
              Approx longitude
              <input
                type="number"
                step="0.01"
                value={profile.longitude_approx ?? ''}
                onChange={event => setProfile({ ...profile, longitude_approx: event.target.value ? Number(event.target.value) : null })}
                placeholder="4.90"
              />
            </label>
          </div>

          <label>
            Discovery radius: {profile.radius_km} km
            <input
              type="range"
              min="5"
              max="250"
              value={profile.radius_km}
              onChange={event => setProfile({ ...profile, radius_km: Number(event.target.value) })}
            />
          </label>

          <div className="grid two">
            <label>
              Min contribution
              <input
                type="number"
                value={profile.preferred_min_amount ?? ''}
                onChange={event => setProfile({ ...profile, preferred_min_amount: event.target.value ? Number(event.target.value) : null })}
              />
            </label>

            <label>
              Max contribution
              <input
                type="number"
                value={profile.preferred_max_amount ?? ''}
                onChange={event => setProfile({ ...profile, preferred_max_amount: event.target.value ? Number(event.target.value) : null })}
              />
            </label>
          </div>

          <label>
            Currency
            <input
              value={profile.preferred_currency}
              onChange={event => setProfile({ ...profile, preferred_currency: event.target.value.toUpperCase() })}
            />
          </label>

          <label>
            Frequency
            <select
              value={profile.preferred_frequency}
              onChange={event => setProfile({ ...profile, preferred_frequency: event.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          <label>
            Short bio
            <textarea
              value={profile.bio || ''}
              onChange={event => setProfile({ ...profile, bio: event.target.value })}
              placeholder="I am open to small monthly community circles."
            />
          </label>

          <button className="button full" type="submit" disabled={busy === 'profile'}>
            {busy === 'profile' ? 'Saving...' : 'Save discovery profile'}
          </button>
        </form>

        <section className="discoverMapPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">World trust map</p>
              <h2>Approximate people and groups</h2>
            </div>
          </div>

          <div className="worldMapMock">
            <div className="mapGridLines" />
            {mapPins.map(pin => (
              <span
                key={pin.id}
                className={`mapPin ${pin.type}`}
                style={{
                  left: pin.point?.left,
                  top: pin.point?.top,
                }}
                title={pin.label}
              >
                {pin.type === 'group' ? '●' : pin.label.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>

          <p className="mutedText">
            This MVP map uses approximate coordinates. Later we can upgrade it to Mapbox or Google Maps.
          </p>
        </section>
      </section>

      <section className="discoverListGrid">
        <section className="discoverPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Nearby people</p>
              <h2>Open to new circles</h2>
            </div>
          </div>

          {people.length === 0 ? (
            <p className="mutedText">No discoverable people found yet.</p>
          ) : (
            <div className="discoverCards">
              {people.map(person => (
                <article key={person.user_id} className="discoverCard">
                  <div className="discoverCardTop">
                    <span className="discoverAvatar">{person.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <h3>{person.name}</h3>
                      <p>{person.display_location || 'Approximate area hidden'}</p>
                    </div>
                  </div>

                  <div className="discoverFacts">
                    <div><span>Trust</span><strong>{person.trust_score}</strong></div>
                    <div><span>Reviews</span><strong>{person.average_rating || '-'}</strong></div>
                    <div><span>Distance</span><strong>{person.distance_km ? `${person.distance_km} km` : '-'}</strong></div>
                  </div>

                  <p className="mutedText">{person.bio || 'Open to trusted savings circles.'}</p>
                  <p className="safeNote noMargin">{moneyRange(person)} · {person.preferred_frequency}</p>

                  <div className="actions">
                    <button
                      className="button"
                      type="button"
                      disabled={busy === `person-${person.user_id}`}
                      onClick={() => connect(person)}
                    >
                      Connect
                    </button>
                    <Link className="button secondary" to={`/reviews/${person.user_id}`}>
                      Reviews
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="discoverPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Open groups</p>
              <h2>Circles looking for members</h2>
            </div>
          </div>

          {groups.length === 0 ? (
            <p className="mutedText">No discoverable groups found yet.</p>
          ) : (
            <div className="discoverCards">
              {groups.map(group => (
                <article key={group.group_id} className="discoverCard group">
                  <div className="discoverCardTop">
                    <span className="discoverAvatar group">●</span>
                    <div>
                      <h3>{group.name}</h3>
                      <p>{group.display_location || 'Approximate area hidden'}</p>
                    </div>
                  </div>

                  <div className="discoverFacts">
                    <div><span>Pot</span><strong>{group.contribution_amount} {group.currency}</strong></div>
                    <div><span>Members</span><strong>{group.member_count}/{group.member_limit}</strong></div>
                    <div><span>Organizer</span><strong>{group.organizer_trust_score}</strong></div>
                  </div>

                  <p className="mutedText">
                    {group.message || `${group.organizer_name} is looking for trusted members.`}
                  </p>

                  <div className="actions">
                    <button
                      className="button"
                      type="button"
                      disabled={busy === `group-${group.group_id}`}
                      onClick={() => joinGroup(group)}
                    >
                      Request to join
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="discoverPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Connection requests</p>
            <h2>People who want to connect</h2>
          </div>
        </div>

        {requests.incoming.length === 0 ? (
          <p className="mutedText">No incoming requests.</p>
        ) : (
          <div className="requestList">
            {requests.incoming.map(request => (
              <div key={request.id} className="requestRow">
                <div>
                  <strong>{request.requester_name}</strong>
                  <p>{request.message || 'Wants to connect with you.'}</p>
                  <small>Status: {request.status}</small>
                </div>

                {request.status === 'pending' && (
                  <div className="actions noMargin">
                    <button className="button mini" onClick={() => respond(request.id, 'accepted')}>Accept</button>
                    <button className="ghost mini" onClick={() => respond(request.id, 'declined')}>Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}