import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '../../api/api'
import { Badge, Button } from '../ui/ui'
import ThemeToggle from './ThemeToggle'
import ProfileAvatar from '../user/ProfileAvatar'
import { broadcastProfilePictureUpdated, profilePictureApi } from '../../api/profilePictureApi'

type Props = {
  user: User
  onLogout: () => void
}

function validateProfileImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Choose a JPG, PNG, or WebP image.'
  }

  if (file.size > 3 * 1024 * 1024) {
    return 'Profile picture must be 3MB or smaller.'
  }

  return ''
}

export default function ProfileMenu({ user, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [photoMessage, setPhotoMessage] = useState('')
  const menuRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setPhotoError('')
    setPhotoMessage('')

    const validationError = validateProfileImage(file)
    if (validationError) {
      setPhotoError(validationError)
      event.target.value = ''
      return
    }

    setBusy('upload')

    try {
      await profilePictureApi.upload(file)
      broadcastProfilePictureUpdated()
      setPhotoMessage('Photo updated.')
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not upload photo')
    } finally {
      setBusy('')
      event.target.value = ''
    }
  }

  async function removePhoto() {
    setPhotoError('')
    setPhotoMessage('')
    setBusy('remove')

    try {
      await profilePictureApi.remove()
      broadcastProfilePictureUpdated()
      setPhotoMessage('Photo removed.')
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not remove photo')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="profileMenu" ref={menuRef}>
      <button
        className="profileMenuButton"
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ProfileAvatar user={user} size="sm" />
        <span className="profileMenuText">
          <strong>{user.name.split(' ')[0]}</strong>
          <small>Trust {user.trust_score}</small>
        </span>
        <span className="profileChevron">⌄</span>
      </button>

      {open && (
        <div className="profileDropdown" role="menu">
          <input
            ref={fileInputRef}
            className="srOnlyFileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={uploadPhoto}
          />

          <div
            className="profileDropdownHeader profilePhotoHeader"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            aria-label="Change profile picture"
          >
            <div className="profilePhotoAvatarWrap">
              <ProfileAvatar user={user} size="lg" />
              <span className="profilePhotoCamera">✎</span>
            </div>

            <div className="profilePhotoHeaderText">
              <strong>{user.name}</strong>
              <span>{user.email}</span>

              <div className="profileHeaderBadges">
                <Badge tone="success">Trust {user.trust_score}</Badge>
              </div>

              <div className="profilePhotoInlineActions" onClick={event => event.stopPropagation()}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={busy === 'upload'}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change photo
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={busy === 'remove'}
                  onClick={removePhoto}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>

          {(photoError || photoMessage) && (
            <div className={photoError ? 'profilePhotoFeedback error' : 'profilePhotoFeedback success'}>
              {photoError || photoMessage}
            </div>
          )}

          <div className="profileThemeRow">
            <div>
              <strong>Appearance</strong>
              <span>Light / dark mode</span>
            </div>
            <ThemeToggle />
          </div>

          <Link to="/trust-passport" onClick={() => setOpen(false)}>Trust Passport</Link>
          <Link to="/settings" onClick={() => setOpen(false)}>Settings</Link>
          <Link to="/groups/new" onClick={() => setOpen(false)}>Create group</Link>
          <Link to="/simulator" onClick={() => setOpen(false)}>Simulator</Link>
          <Link to="/network" onClick={() => setOpen(false)}>Trust Network</Link>

          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  )
}