import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { platformApi } from './platformApi'

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

export default function MobileBottomNav() {
  const [actionCount, setActionCount] = useState(0)
  const [highPriorityCount, setHighPriorityCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(0)

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

  const actionBadgeTone = highPriorityCount > 0 ? 'danger' : 'warning'

  return (
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

      <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="mobileNavIcon">☰</span>
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}