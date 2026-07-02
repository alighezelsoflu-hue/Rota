import { FormEvent, useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, Card, EmptyState, Skeleton } from '../../../components/ui/ui'
import { groupOperationsApi } from '../../../api/groupOperationsApi'
import type { GroupAnnouncement } from '../../../api/groupOperationsApi'

type Props = {
  groupId: string
  isOrganizer: boolean
}

function priorityTone(priority: string) {
  if (priority === 'urgent') return 'danger'
  if (priority === 'important') return 'warning'
  return 'info'
}

export default function GroupAnnouncementsPanel({ groupId, isOrganizer }: Props) {
  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal')
  const [pinned, setPinned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await groupOperationsApi.announcements(groupId)
      setAnnouncements(data.announcements)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy('create')
    setError('')

    try {
      await groupOperationsApi.createAnnouncement(groupId, { title, body, priority, pinned })
      setTitle('')
      setBody('')
      setPriority('normal')
      setPinned(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create announcement')
    } finally {
      setBusy('')
    }
  }

  async function acknowledge(announcement: GroupAnnouncement) {
    setBusy(announcement.id)
    setError('')

    try {
      await groupOperationsApi.acknowledgeAnnouncement(announcement.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not acknowledge announcement')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <Skeleton variant="card" />

  return (
    <Card
      wide
      eyebrow="Announcements"
      title="Group announcements"
      description="Keep important operational updates separate from chat."
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Announcements unavailable"
          description={error}
          icon="!"
        />
      )}

      {isOrganizer && (
        <form className="form announcementForm" onSubmit={create}>
          <div className="settingsGrid two">
            <label>
              Title
              <input value={title} onChange={event => setTitle(event.target.value)} required />
            </label>

            <label>
              Priority
              <select value={priority} onChange={event => setPriority(event.target.value as any)}>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>

          <label>
            Message
            <textarea value={body} onChange={event => setBody(event.target.value)} required />
          </label>

          <label className="checkRow">
            <input type="checkbox" checked={pinned} onChange={event => setPinned(event.target.checked)} />
            Pin this announcement
          </label>

          <Button type="submit" loading={busy === 'create'}>
            Post announcement
          </Button>
        </form>
      )}

      {announcements.length === 0 ? (
        <EmptyState
          icon="◎"
          title="No announcements"
          description="Organizer announcements will appear here."
        />
      ) : (
        <div className="announcementList">
          {announcements.map(announcement => (
            <article key={announcement.id} className={announcement.pinned ? 'announcementCard pinned' : 'announcementCard'}>
              <div className="announcementTop">
                <div>
                  <Badge tone={priorityTone(announcement.priority)}>{announcement.priority}</Badge>
                  {announcement.pinned && <Badge tone="purple">Pinned</Badge>}
                  {announcement.acknowledged_by_me ? <Badge tone="success">Acknowledged</Badge> : <Badge tone="warning">Unread</Badge>}
                </div>

                <small>{new Date(announcement.created_at).toLocaleString()}</small>
              </div>

              <h3>{announcement.title}</h3>
              <p>{announcement.body}</p>

              <div className="announcementFooter">
                <span>By {announcement.author_name} · {announcement.acknowledgement_count} acknowledgements</span>

                {!announcement.acknowledged_by_me && (
                  <Button type="button" size="sm" loading={busy === announcement.id} onClick={() => acknowledge(announcement)}>
                    Acknowledge
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}