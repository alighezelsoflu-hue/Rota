import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button } from '../ui/ui'
import { platformApi } from '../../api/platformApi'
import type { ActionItem, NotificationItem } from '../../api/platformApi'

function formatCount(count: number) {
  if (count <= 0) return ''
  if (count > 99) return '99+'
  return String(count)
}

function actionTone(priority: string) {
  if (priority === 'high') return 'danger'
  if (priority === 'medium') return 'warning'
  return 'info'
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [actions, setActions] = useState<ActionItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [error, setError] = useState('')

  async function load() {
    try {
      const [notificationData, actionData] = await Promise.all([
        platformApi.notifications(),
        platformApi.actionItems(),
      ])

      setUnreadCount(notificationData.unread_count)
      setNotifications(notificationData.notifications)
      setActions(actionData.items)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notifications unavailable')
    }
  }

  useEffect(() => {
    load()

    function onFocus() {
      load()
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  async function markRead(notification: NotificationItem) {
    try {
      if (!notification.read_at) {
        await platformApi.markNotificationRead(notification.id)
        await load()
      }
    } finally {
      setOpen(false)
    }
  }

  async function readAll() {
    await platformApi.markAllNotificationsRead()
    await load()
  }

  const highActions = actions.filter(item => item.priority === 'high').length
  const totalBadge = unreadCount + actions.length
  const label = formatCount(totalBadge)

  return (
    <div className="notificationsBell">
      <button
        className={totalBadge > 0 ? 'notificationsButton hasAlerts' : 'notificationsButton'}
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-label={`Notifications${totalBadge > 0 ? `, ${totalBadge} alerts` : ''}`}
      >
        <span className="notificationIcon">◌</span>
        <span>Alerts</span>
        {label && <Badge tone={highActions > 0 ? 'danger' : 'warning'}>{label}</Badge>}
      </button>

      {open && (
        <div className="notificationsMenu">
          <div className="notificationsHeader">
            <div>
              <strong>Alerts</strong>
              <small>{actions.length} actions · {unreadCount} unread</small>
            </div>

            <Button size="sm" variant="ghost" type="button" onClick={readAll}>
              Mark read
            </Button>
          </div>

          {error ? (
            <p className="mutedText">{error}</p>
          ) : (
            <>
              {actions.length > 0 && (
                <div className="notificationSection">
                  <div className="notificationSectionTitle">
                    <span>Action required</span>
                    <Badge tone={highActions > 0 ? 'danger' : 'warning'}>
                      {actions.length}
                    </Badge>
                  </div>

                  <div className="notificationList">
                    {actions.slice(0, 4).map(action => (
                      <Link
                        key={action.id}
                        to={action.url}
                        className="notificationItem action"
                        onClick={() => setOpen(false)}
                      >
                        <strong>{action.title}</strong>
                        <span>{action.body}</span>
                        <Badge tone={actionTone(action.priority)}>{action.priority}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="notificationSection">
                <div className="notificationSectionTitle">
                  <span>Notifications</span>
                  <Badge tone={unreadCount > 0 ? 'danger' : 'success'}>
                    {unreadCount}
                  </Badge>
                </div>

                {notifications.length === 0 ? (
                  <p className="mutedText">No notifications yet.</p>
                ) : (
                  <div className="notificationList">
                    {notifications.slice(0, 6).map(notification => (
                      <Link
                        key={notification.id}
                        to={notification.related_url || '/actions'}
                        className={notification.read_at ? 'notificationItem read' : 'notificationItem'}
                        onClick={() => {
                          void markRead(notification)
                        }}
                      >
                        <strong>{notification.title}</strong>
                        <span>{notification.body}</span>
                        {!notification.read_at && <i />}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <Link className="notificationsFooter" to="/actions" onClick={() => setOpen(false)}>
            Open Action Center
          </Link>
        </div>
      )}
    </div>
  )
}