import { FormEvent, useEffect, useState } from 'react'
import { ActionBanner, Badge, Button, Card, Skeleton } from '../../../components/ui/ui'
import { groupOperationsApi } from '../../../api/groupOperationsApi'
import type { GroupRules } from '../../../api/groupOperationsApi'

type Props = {
  groupId: string
  isOrganizer: boolean
}

const defaultRules: GroupRules = {
  group_id: '',
  due_grace_days: 3,
  proof_required: true,
  minimum_member_confirmations: 1,
  late_payment_policy: 'Members should upload proof before the due date. Late payments are tracked for transparency.',
  dispute_policy: 'Payment issues should be opened as structured disputes and resolved by the organizer or co-organizer.',
  review_policy: 'Members are encouraged to review each other after completed cycles.',
  custom_rules: '',
}

export default function GroupRulesPage({ groupId, isOrganizer }: Props) {
  const [rules, setRules] = useState<GroupRules>({ ...defaultRules, group_id: groupId })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      setRules(await groupOperationsApi.rules(groupId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load group rules')
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
      setRules(await groupOperationsApi.updateRules(groupId, rules))
      setMessage('Group rules saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save group rules')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton variant="card" />

  return (
    <Card
      wide
      eyebrow="Group rules"
      title="Operating rules"
      description="Set clear expectations for proof, late payments, disputes, reviews, and custom group guidelines."
      actions={<Badge tone={rules.proof_required ? 'success' : 'warning'}>{rules.proof_required ? 'Proof required' : 'Proof optional'}</Badge>}
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Rules unavailable"
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

      <form className="form groupRulesForm" onSubmit={save}>
        <div className="settingsGrid two">
          <label>
            Grace period after due date
            <input
              type="number"
              min={0}
              max={30}
              value={rules.due_grace_days}
              disabled={!isOrganizer}
              onChange={event => setRules(current => ({ ...current, due_grace_days: Number(event.target.value) }))}
            />
          </label>

          <label>
            Minimum member confirmations
            <input
              type="number"
              min={0}
              max={50}
              value={rules.minimum_member_confirmations}
              disabled={!isOrganizer}
              onChange={event => setRules(current => ({ ...current, minimum_member_confirmations: Number(event.target.value) }))}
            />
          </label>
        </div>

        <label className="checkRow">
          <input
            type="checkbox"
            checked={rules.proof_required}
            disabled={!isOrganizer}
            onChange={event => setRules(current => ({ ...current, proof_required: event.target.checked }))}
          />
          Proof upload is required for contributions
        </label>

        <label>
          Late payment policy
          <textarea
            value={rules.late_payment_policy}
            disabled={!isOrganizer}
            onChange={event => setRules(current => ({ ...current, late_payment_policy: event.target.value }))}
          />
        </label>

        <label>
          Dispute policy
          <textarea
            value={rules.dispute_policy}
            disabled={!isOrganizer}
            onChange={event => setRules(current => ({ ...current, dispute_policy: event.target.value }))}
          />
        </label>

        <label>
          Review policy
          <textarea
            value={rules.review_policy}
            disabled={!isOrganizer}
            onChange={event => setRules(current => ({ ...current, review_policy: event.target.value }))}
          />
        </label>

        <label>
          Custom group rules
          <textarea
            value={rules.custom_rules || ''}
            disabled={!isOrganizer}
            placeholder="Optional: add custom rules for your circle."
            onChange={event => setRules(current => ({ ...current, custom_rules: event.target.value }))}
          />
        </label>

        {isOrganizer && (
          <Button type="submit" loading={saving}>
            Save rules
          </Button>
        )}
      </form>
    </Card>
  )
}