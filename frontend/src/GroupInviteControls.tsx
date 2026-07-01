import { FormEvent, useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, ButtonLink, Card, Skeleton } from './ui'
import { groupOperationsApi } from './groupOperationsApi'
import type { InviteControls } from './groupOperationsApi'

type Props = {
  groupId: string
  isOrganizer: boolean
}

const emptyControls: InviteControls = {
  group_id: '',
  invite_code: '',
  invite_enabled: true,
  invite_approval_required: false,
  invite_expires_at: null,
  invite_max_uses: null,
  invite_uses: 0,
  min_trust_score_to_join: 0,
  public_invite_message: '',
}

function toDatetimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

function fromDatetimeLocal(value: string) {
  if (!value) return null
  return new Date(value).toISOString()
}

export default function GroupInviteControls({ groupId, isOrganizer }: Props) {
  const [controls, setControls] = useState<InviteControls>(emptyControls)
  const [expiresLocal, setExpiresLocal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await groupOperationsApi.inviteControls(groupId)
      setControls(data)
      setExpiresLocal(toDatetimeLocal(data.invite_expires_at))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load invite controls')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const saved = await groupOperationsApi.updateInviteControls(groupId, {
        ...controls,
        invite_expires_at: fromDatetimeLocal(expiresLocal),
      })
      setControls(saved)
      setExpiresLocal(toDatetimeLocal(saved.invite_expires_at))
      setMessage('Invite controls saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save invite controls')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton variant="card" />

  const publicUrl = `${window.location.origin}/g/${controls.invite_code}`

  return (
    <Card
      wide
      eyebrow="Invite controls"
      title="Manage how members join"
      description="Control whether the public invite works, whether approval is required, and which trust score is needed."
      actions={<Badge tone={controls.invite_enabled ? 'success' : 'danger'}>{controls.invite_enabled ? 'Enabled' : 'Disabled'}</Badge>}
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Invite controls unavailable"
          description={error}
          icon="!"
        />
      )}

      {message && (
        <ActionBanner
          tone="success"
          title="Saved"
          description={message}
          icon="✓"
        />
      )}

      <div className="inviteControlPreview">
        <div>
          <span>Public invite</span>
          <strong>{publicUrl}</strong>
        </div>
        <ButtonLink to={`/g/${controls.invite_code}`} variant="secondary" size="sm">Preview</ButtonLink>
      </div>

      <form className="form inviteControlsForm" onSubmit={save}>
        <label className="checkRow">
          <input
            type="checkbox"
            checked={controls.invite_enabled}
            disabled={!isOrganizer}
            onChange={event => setControls(current => ({ ...current, invite_enabled: event.target.checked }))}
          />
          Enable invite link
        </label>

        <label className="checkRow">
          <input
            type="checkbox"
            checked={controls.invite_approval_required}
            disabled={!isOrganizer}
            onChange={event => setControls(current => ({ ...current, invite_approval_required: event.target.checked }))}
          />
          Require organizer approval before joining
        </label>

        <div className="settingsGrid two">
          <label>
            Minimum trust score
            <input
              type="number"
              min={0}
              max={100}
              value={controls.min_trust_score_to_join}
              disabled={!isOrganizer}
              onChange={event => setControls(current => ({ ...current, min_trust_score_to_join: Number(event.target.value) }))}
            />
          </label>

          <label>
            Max invite uses
            <input
              type="number"
              min={1}
              value={controls.invite_max_uses || ''}
              disabled={!isOrganizer}
              placeholder="No limit"
              onChange={event => setControls(current => ({ ...current, invite_max_uses: event.target.value ? Number(event.target.value) : null }))}
            />
          </label>
        </div>

        <label>
          Expiration date
          <input
            type="datetime-local"
            value={expiresLocal}
            disabled={!isOrganizer}
            onChange={event => setExpiresLocal(event.target.value)}
          />
        </label>

        <label>
          Public invite message
          <textarea
            value={controls.public_invite_message || ''}
            disabled={!isOrganizer}
            placeholder="Optional message shown to invited people."
            onChange={event => setControls(current => ({ ...current, public_invite_message: event.target.value }))}
          />
        </label>

        <div className="inviteUsageLine">
          <Badge tone="info">Used {controls.invite_uses}</Badge>
          {controls.invite_max_uses && <Badge tone="warning">Limit {controls.invite_max_uses}</Badge>}
        </div>

        {isOrganizer && (
          <Button type="submit" loading={saving}>
            Save invite controls
          </Button>
        )}
      </form>
    </Card>
  )
}