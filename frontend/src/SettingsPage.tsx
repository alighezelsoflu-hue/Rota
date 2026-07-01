import { FormEvent, useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, ButtonLink, Card, PageHeader, Skeleton, StatCard } from './ui'
import { platformApi } from './platformApi'
import type { NotificationPreferences, ProfileSettings } from './platformApi'

const preferenceLabels: Array<[keyof NotificationPreferences, string, string]> = [
  ['payment_reminders', 'Payment reminders', 'Payment due, proof uploaded, and confirmation waiting.'],
  ['group_messages', 'Group messages', 'Unread group and private chat messages.'],
  ['connection_requests', 'Connection requests', 'New accepted or pending trusted connections.'],
  ['join_requests', 'Join requests', 'Requests to join groups you organize.'],
  ['agreement_reminders', 'Agreement reminders', 'Circle Commitment tasks and pending agreements.'],
  ['vote_reminders', 'Vote reminders', 'Continuation votes and group close decisions.'],
  ['review_reminders', 'Review reminders', 'Member review prompts after group activity.'],
  ['email_notifications', 'Email notifications', 'Reserved for future email notification delivery.'],
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<ProfileSettings | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setError('')

    try {
      const data = await platformApi.profileSettings()
      setSettings(data)
      setPreferences(data.notification_preferences)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load settings')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()

    if (!preferences) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await platformApi.updateNotificationPreferences(preferences)
      setMessage('Notification preferences saved.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <div className="platformPage">
        <ActionBanner tone="danger" title="Settings unavailable" description={error} icon="!" />
      </div>
    )
  }

  if (!settings || !preferences) {
    return (
      <div className="platformPage">
        <Skeleton variant="page" />
      </div>
    )
  }

  return (
    <div className="platformPage">
      <PageHeader
        eyebrow="Settings"
        title="Profile, privacy, and notifications"
        description="Control how Rota communicates with you and review your trust profile."
        meta={
          <>
            <Badge tone="success">Trust {settings.user.trust_score}</Badge>
            <Badge status={settings.user.verification_status} />
          </>
        }
        actions={
          <>
            <ButtonLink to="/trust-passport" variant="secondary">Trust Passport</ButtonLink>
            <ButtonLink to="/discover" variant="secondary">Discovery</ButtonLink>
          </>
        }
      />

      {message && (
        <ActionBanner tone="success" title="Saved" description={message} icon="✓" />
      )}

      <section className="settingsGrid">
        <Card eyebrow="Account" title={settings.user.name}>
          <div className="settingsProfileBlock">
            <div>
              <span>Email</span>
              <strong>{settings.user.email}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{settings.user.phone || 'Not added'}</strong>
            </div>
            <div>
              <span>Discovery</span>
              <strong>{settings.discovery_profile?.is_discoverable ? 'Visible' : 'Hidden'}</strong>
            </div>
            <div>
              <span>Area</span>
              <strong>
                {[settings.discovery_profile?.city, settings.discovery_profile?.country].filter(Boolean).join(', ') || 'Not set'}
              </strong>
            </div>
          </div>
        </Card>

        <Card eyebrow="Trust Passport" title={settings.trust_passport.level}>
          <div className="miniStatsGrid">
            <StatCard label="Groups" value={settings.trust_passport.summary.groups_total} tone="info" />
            <StatCard label="Completed" value={settings.trust_passport.summary.groups_completed} tone="success" />
            <StatCard label="Reviews" value={settings.trust_passport.summary.review_count} tone="purple" />
            <StatCard label="Rating" value={settings.trust_passport.summary.average_rating || '-'} tone="success" />
          </div>
        </Card>
      </section>

      <Card eyebrow="Notifications" title="Notification preferences">
        <form className="settingsPreferenceList" onSubmit={submit}>
          {preferenceLabels.map(([key, title, description]) => (
            <label key={key} className="settingsToggleRow">
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={event => setPreferences({ ...preferences, [key]: event.target.checked })}
              />
              <div>
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
            </label>
          ))}

          <Button type="submit" loading={saving}>
            Save preferences
          </Button>
        </form>
      </Card>
    </div>
  )
}