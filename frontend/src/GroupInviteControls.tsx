import { FormEvent, useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, ButtonLink, Card, Skeleton } from './ui'
import { memberAdmissionApi } from './memberAdmissionApi'
import type { AdmissionSettings, JoinApprovalMode, LeaveApprovalMode } from './memberAdmissionApi'

type Props = {
  groupId: string
  isOrganizer: boolean
}

const emptySettings: AdmissionSettings = {
  group_id: '',
  invite_code: '',
  invite_enabled: true,
  join_approval_mode: 'organizer',
  leave_approval_mode: 'organizer',
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
  const [settings, setSettings] = useState<AdmissionSettings>(emptySettings)
  const [expiresLocal, setExpiresLocal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await memberAdmissionApi.settings(groupId)
      setSettings(data)
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
      const saved = await memberAdmissionApi.updateSettings(groupId, {
        ...settings,
        invite_expires_at: fromDatetimeLocal(expiresLocal),
      })

      setSettings(saved)
      setExpiresLocal(toDatetimeLocal(saved.invite_expires_at))
      setMessage('Admission controls saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save admission controls')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton variant="card" />

  const publicUrl = `${window.location.origin}/g/${settings.invite_code}`

  return (
    <Card
      wide
      eyebrow="Admission controls"
      title="Invite and joining rules"
      description="Control whether an invite link gives direct access or creates a join request that must be approved."
      actions={<Badge tone={settings.invite_enabled ? 'success' : 'danger'}>{settings.invite_enabled ? 'Invite enabled' : 'Invite disabled'}</Badge>}
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Admission controls unavailable"
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
        <ButtonLink to={`/g/${settings.invite_code}`} variant="secondary" size="sm">Preview</ButtonLink>
      </div>

      <form className="form inviteControlsForm" onSubmit={save}>
        <label className="checkRow">
          <input
            type="checkbox"
            checked={settings.invite_enabled}
            disabled={!isOrganizer}
            onChange={event => setSettings(current => ({ ...current, invite_enabled: event.target.checked }))}
          />
          Enable invite link and invite code
        </label>

        <div className="settingsGrid two">
          <label>
            Join approval mode
            <select
              value={settings.join_approval_mode}
              disabled={!isOrganizer}
              onChange={event => setSettings(current => ({ ...current, join_approval_mode: event.target.value as JoinApprovalMode }))}
            >
              <option value="open">Open invite — join directly</option>
              <option value="organizer">Organizer approval</option>
              <option value="all_members">All active members approve</option>
              <option value="majority">Majority approval</option>
            </select>
          </label>

          <label>
            Leave approval mode
            <select
              value={settings.leave_approval_mode}
              disabled={!isOrganizer}
              onChange={event => setSettings(current => ({ ...current, leave_approval_mode: event.target.value as LeaveApprovalMode }))}
            >
              <option value="organizer">Organizer approval</option>
              <option value="all_members">All active members approve</option>
              <option value="majority">Majority approval</option>
            </select>
          </label>
        </div>

        <ActionBanner
          tone="info"
          title="Recommended setting"
          description="For trusted money circles, use Organizer approval or All active members approval. Open invite is best only for low-risk test groups."
          icon="◎"
        />

        <div className="settingsGrid two">
          <label>
            Minimum trust score
            <input
              type="number"
              min={0}
              max={100}
              value={settings.min_trust_score_to_join}
              disabled={!isOrganizer}
              onChange={event => setSettings(current => ({ ...current, min_trust_score_to_join: Number(event.target.value) }))}
            />
          </label>

          <label>
            Max invite uses
            <input
              type="number"
              min={1}
              value={settings.invite_max_uses || ''}
              disabled={!isOrganizer}
              placeholder="No limit"
              onChange={event => setSettings(current => ({ ...current, invite_max_uses: event.target.value ? Number(event.target.value) : null }))}
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
            value={settings.public_invite_message || ''}
            disabled={!isOrganizer}
            placeholder="Optional message shown to invited people."
            onChange={event => setSettings(current => ({ ...current, public_invite_message: event.target.value }))}
          />
        </label>

        <div className="inviteUsageLine">
          <Badge tone="info">Used {settings.invite_uses}</Badge>
          {settings.invite_max_uses && <Badge tone="warning">Limit {settings.invite_max_uses}</Badge>}
        </div>

        {isOrganizer && (
          <Button type="submit" loading={saving}>
            Save admission controls
          </Button>
        )}
      </form>
    </Card>
  )
}