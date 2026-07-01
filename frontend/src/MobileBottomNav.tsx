import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import type { User } from './api'
import { platformApi } from './platformApi'
import ThemeToggle from './ThemeToggle'
import ProfileAvatar from './ProfileAvatar'
import { broadcastProfilePictureUpdated, profilePictureApi } from './profilePictureApi'

type Props = {
  user: User
  onLogout: () => void
}

function formatCount(count: number) {
  if (count <= 0) return ''
  if (count > 99) return '99+'
  return String(count)
}

function MobileBadge({ count, tone = 'danger' }: { count: number; tone?: 'danger' | 'warning' | 'success' }) {
  const label = formatCount(count)
  if (!label) return null

  return <span className={`mobileNavBadge ${tone}`}>{label}</span>
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

export default function MobileBottomNav({ user, onLogout }: Props) {
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [moreOpen, setMoreOpen] = useState(false)
  const [actionCount, setActionCount] = useState(0)
  const [highPriorityCount, setHighPriorityCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(0)

  const [busy, setBusy] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [photoMessage, setPhotoMessage] = useState('')

  async function loadBadges() {
    try {
      const [actions, notifications] = await Promise.all([
        platformApi.actionItems(),
        platformApi.notifications(),
      ])

      setActionCount(actions.items.length)
      setHighPriorityCount(actions.items.filter(item => item.priority === 'high').length)
      setNotificationCount(notifications.unread_count)
    } catch {
      setActionCount(0)
      setHighPriorityCount(0)
      setNotificationCount(0)
    }
  }

  useEffect(() => {
    loadBadges()

    function onFocus() {
      loadBadges()
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!moreOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [moreOpen])

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

  const actionBadgeTone = highPriorityCount > 0 ? 'danger' : 'warning'
  const moreIsActive = [
    '/settings',
    '/trust-passport',
    '/network',
    '/simulator',
    '/groups/new',
    '/admin/safety',
  ].some(path => location.pathname.startsWith(path))

  const menuLinks = [
    { to: '/dashboard', icon: '⌂', label: 'Dashboard', description: 'Your circles and today view' },
    { to: '/actions', icon: '!', label: 'Actions', description: 'Payments, votes, requests' },
    { to: '/discover', icon: '◎', label: 'Discover', description: 'People and open groups' },
    { to: '/messages', icon: '✉', label: 'Messages', description: 'Group and direct chats' },
    { to: '/network', icon: '↗', label: 'Trust Network', description: 'Trusted people and graph' },
    { to: '/groups/new', icon: '+', label: 'Create group', description: 'Start a new circle' },
    { to: '/simulator', icon: '∑', label: 'Simulator', description: 'Plan contribution circles' },
    { to: '/trust-passport', icon: '★', label: 'Trust Passport', description: 'Your trust profile' },
    { to: '/settings', icon: '⚙', label: 'Settings', description: 'Profile and notifications' },
  ]

  return (
    <>
      <nav className="mobileBottomNav" aria-label="Main mobile navigation">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="mobileNavIcon">⌂</span>
          <span>Home</span>
        </NavLink>

        <NavLink to="/actions" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="mobileNavIcon">!</span>
          <span>Actions</span>
          <MobileBadge count={actionCount} tone={actionBadgeTone} />
        </NavLink>

        <NavLink to="/discover" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="mobileNavIcon">◎</span>
          <span>Discover</span>
        </NavLink>

        <NavLink to="/messages" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="mobileNavIcon">✉</span>
          <span>Messages</span>
          <MobileBadge count={notificationCount} tone="danger" />
        </NavLink>

        <button
          className={moreIsActive || moreOpen ? 'mobileNavMore active' : 'mobileNavMore'}
          type="button"
          onClick={() => setMoreOpen(current => !current)}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
        >
          <span className="mobileNavIcon">☰</span>
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <button
            className="mobileMoreBackdrop"
            type="button"
            aria-label="Close mobile menu"
            onClick={() => setMoreOpen(false)}
          />

          <aside id="mobile-more-menu" className="mobileMoreSheet" aria-label="More navigation">
            <div className="mobileMoreHandle" />

            <input
              ref={fileInputRef}
              className="srOnlyFileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadPhoto}
            />

            <div
              className="mobileMoreHeader mobilePhotoHeader"
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

              <div className="mobileMoreUser">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
                <span>Trust {user.trust_score}</span>

                <div className="profilePhotoInlineActions" onClick={event => event.stopPropagation()}>
                  <button
                    type="button"
                    disabled={busy === 'upload'}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {busy === 'upload' ? 'Uploading...' : 'Change photo'}
                  </button>

                  <button
                    type="button"
                    disabled={busy === 'remove'}
                    onClick={removePhoto}
                  >
                    {busy === 'remove' ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>

            {(photoError || photoMessage) && (
              <div className={photoError ? 'profilePhotoFeedback error' : 'profilePhotoFeedback success'}>
                {photoError || photoMessage}
              </div>
            )}

            <div className="mobileMoreTheme">
              <div>
                <strong>Appearance</strong>
                <small>Switch light or dark mode</small>
              </div>
              <ThemeToggle />
            </div>

            <div className="mobileMoreGrid">
              {menuLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="mobileMoreLink"
                  onClick={() => setMoreOpen(false)}
                >
                  <span>{link.icon}</span>
                  <div>
                    <strong>{link.label}</strong>
                    <small>{link.description}</small>
                  </div>
                </Link>
              ))}
            </div>

            <button
              className="mobileMoreLogout"
              type="button"
              onClick={() => {
                setMoreOpen(false)
                onLogout()
              }}
            >
              Logout
            </button>
          </aside>
        </>
      )}
    </>
  )
}