import { ChangeEvent, useRef, useState } from 'react'
import type { User } from './api'
import { ActionBanner, Button } from './ui'
import ProfileAvatar from './ProfileAvatar'
import { broadcastProfilePictureUpdated, profilePictureApi } from './profilePictureApi'

type Props = {
  user: User
  compact?: boolean
}

export default function ProfilePictureManager({ user, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setMessage('')

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.')
      event.target.value = ''
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('Profile picture must be 3MB or smaller.')
      event.target.value = ''
      return
    }

    setBusy('upload')

    try {
      await profilePictureApi.upload(file)
      broadcastProfilePictureUpdated()
      setMessage('Profile picture updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload profile picture')
    } finally {
      setBusy('')
      event.target.value = ''
    }
  }

  async function remove() {
    setBusy('remove')
    setError('')
    setMessage('')

    try {
      await profilePictureApi.remove()
      broadcastProfilePictureUpdated()
      setMessage('Profile picture removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove profile picture')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className={compact ? 'profilePictureManager compact' : 'profilePictureManager'}>
      {error && (
        <ActionBanner
          tone="danger"
          title="Profile picture failed"
          description={error}
          icon="!"
        />
      )}

      {message && !compact && (
        <ActionBanner
          tone="success"
          title="Saved"
          description={message}
          icon="✓"
        />
      )}

      <div className="profilePictureManagerRow">
        <ProfileAvatar user={user} size={compact ? 'md' : 'lg'} />

        <div>
          <strong>Profile picture</strong>
          <span>JPG, PNG, or WebP · max 3MB</span>
        </div>
      </div>

      <input
        ref={inputRef}
        className="srOnlyFileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={upload}
      />

      <div className="profilePictureActions">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={busy === 'upload'}
          onClick={() => inputRef.current?.click()}
        >
          Upload photo
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          loading={busy === 'remove'}
          onClick={remove}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}