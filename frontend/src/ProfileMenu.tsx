import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from './api'
import { Badge } from './ui'
import ThemeToggle from './ThemeToggle'

type Props = {
  user: User
  onLogout: () => void
}

function initials(name: string) {
  return name
    .split(' ')
    .map(part => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'
}

export default function ProfileMenu({ user, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

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

  return (
    <div className="profileMenu" ref={menuRef}>
      <button
        className="profileMenuButton"
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="profileAvatar">{initials(user.name)}</span>
        <span className="profileMenuText">
          <strong>{user.name.split(' ')[0]}</strong>
          <small>Trust {user.trust_score}</small>
        </span>
        <span className="profileChevron">⌄</span>
      </button>

      {open && (
        <div className="profileDropdown" role="menu">
          <div className="profileDropdownHeader">
            <span className="profileAvatar large">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <div>
                <Badge tone="success">Trust {user.trust_score}</Badge>
              </div>
            </div>
          </div>

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