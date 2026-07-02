import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionBanner, Button, ButtonLink, Card } from '../../components/ui/ui'
import { groupOperationsApi } from '../../api/groupOperationsApi'

function normalizeInviteInput(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    const parts = url.pathname.split('/').filter(Boolean)
    const groupInviteIndex = parts.findIndex(part => part.toLowerCase() === 'g')

    if (groupInviteIndex >= 0 && parts[groupInviteIndex + 1]) {
      return parts[groupInviteIndex + 1].toUpperCase()
    }
  } catch {
    // Not a full URL. Continue with plain text parsing.
  }

  const withoutQuery = trimmed.split('?')[0]
  const lastSegment = withoutQuery.split('/').filter(Boolean).pop() || withoutQuery

  return lastSegment
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
}

export default function InviteCodeJoinCard() {
  const navigate = useNavigate()
  const [inviteInput, setInviteInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const inviteCode = useMemo(() => normalizeInviteInput(inviteInput), [inviteInput])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!inviteCode) {
      setError('Enter an invite code or paste an invite link.')
      return
    }

    setBusy(true)

    try {
      const result = await groupOperationsApi.joinByInvite(inviteCode)

      if (result.status === 'approval_required') {
        setMessage('Request sent. The group will approve you before you become a member.')
        setInviteInput('')
        return
      }

      if (result.group?.id) {
        navigate(`/groups/${result.group.id}`)
        return
      }

      setMessage('Invite accepted.')
      setInviteInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use this invite.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="inviteJoinCard dashboardJoinSection" wide eyebrow="Join a Circle" title="Use an invite code or link">
      <p className="inviteJoinLead">
        Paste a Rota invite link or enter the code shared by a group organizer. Some circles require approval before you become a member.
      </p>

      {error && (
        <ActionBanner
          tone="danger"
          title="Invite problem"
          description={error}
          icon="!"
        />
      )}

      {message && (
        <ActionBanner
          tone="success"
          title="Request sent"
          description={message}
          icon="✓"
        />
      )}

      <form className="form compact inviteJoinForm" onSubmit={submit}>
        <label>
          Invite code or link
          <input
            value={inviteInput}
            onChange={event => setInviteInput(event.target.value)}
            placeholder="Example: ABC123 or /g/ABC123"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>

        {inviteCode && (
          <div className="inviteCodePreview">
            <span>Detected code</span>
            <strong>{inviteCode}</strong>
          </div>
        )}

        <Button full type="submit" loading={busy}>
          Continue with invite
        </Button>
      </form>

      <div className="inviteJoinHelper">
        <span>What happens next?</span>
        <p>
          Open groups let you join immediately. Approval-based groups send your request to the organizer or members first.
        </p>
      </div>

      {inviteCode && (
        <ButtonLink full variant="secondary" to={`/g/${inviteCode}`}>
          Preview invite page
        </ButtonLink>
      )}
    </Card>
  )
}