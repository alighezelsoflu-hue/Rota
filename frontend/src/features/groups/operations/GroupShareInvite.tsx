import { useMemo, useState } from 'react'
import { ActionBanner, Button, ButtonLink, Card } from '../../../components/ui/ui'

type Props = {
  inviteCode: string
  groupName: string
}

export default function GroupShareInvite({ inviteCode, groupName }: Props) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/g/${inviteCode}`
    return `${window.location.origin}/g/${inviteCode}`
  }, [inviteCode])

  async function copy() {
    setMessage('')
    setError('')

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setMessage('Public invite link copied.')
    } catch {
      setError('Could not copy invite link. You can copy it manually.')
    }
  }

  return (
    <Card
      wide
      eyebrow="Invite link"
      title="Share this circle professionally"
      description="Use this public invite page in WhatsApp, SMS, email, or community groups. People still need to create an account before joining."
      actions={<ButtonLink to={`/g/${inviteCode}`} variant="secondary" size="sm">Preview invite</ButtonLink>}
    >
      {message && (
        <ActionBanner
          tone="success"
          title="Copied"
          description={message}
          icon="✓"
        />
      )}

      {error && (
        <ActionBanner
          tone="danger"
          title="Copy failed"
          description={error}
          icon="!"
        />
      )}

      <div className="shareInviteBox">
        <div>
          <span>{groupName}</span>
          <strong>{inviteUrl}</strong>
        </div>

        <Button type="button" onClick={copy}>
          Copy link
        </Button>
      </div>
    </Card>
  )
}