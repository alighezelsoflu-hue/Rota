import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button } from './ui'
import { platformApi } from './platformApi'
import type { NotificationItem } from './platformApi'

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await platformApi.notifications()
      setUnreadCount(data.unread_count)
      setNotifications(data.notifications)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notifications unavailable')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function markRead(notification: NotificationItem) {
    if (!notification.read_at) {
      await platformApi.markNotificationRead(notification.id)
      await load()
    }

    setOpen(false)
  }

  async function readAll() {
    await platformApi.markAllNotificationsRead()
    await load()
  }

  return (
    <div className="notificationsBell">
      <button className="notificationsButton" type="button" onClick={() => setOpen(current => !current)}>
        <span>Notifications</span>
        {unreadCount > 0 && <Badge tone="danger">{unreadCount}</Badge>}
      </button>

      {open && (
        <div className="notificationsMenu">
          <div className="notificationsHeader">
            <strong>Notifications</strong>
            <Button size="sm" variant="ghost" type="button" onClick={readAll}>
              Mark all read
            </Button>
          </div>

          {error ? (
            <p className="mutedText">{error}</p>
          ) : notifications.length === 0 ? (
            <p className="mutedText">No notifications yet.</p>
          ) : (
            <div className="notificationList">
              {notifications.slice(0, 8).map(notification => (
                <Link
                  key={notification.id}
                  to={notification.related_url || '/actions'}
                  className={notification.read_at ? 'notificationItem read' : 'notificationItem'}
                  onClick={() => markRead(notification)}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.body}</span>
                  {!notification.read_at && <i />}
                </Link>
              ))}
            </div>
          )}

          <Link className="notificationsFooter" to="/actions" onClick={() => setOpen(false)}>
            Open Action Center
          </Link>
        </div>
      )}
    </div>
  )
}