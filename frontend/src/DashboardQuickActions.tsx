import { Link } from 'react-router-dom'

const actions = [
  {
    to: '/actions',
    icon: '!',
    title: 'Action Center',
    description: 'Payments, approvals, votes, and requests',
  },
  {
    to: '/messages',
    icon: '✉',
    title: 'Messages',
    description: 'Group chat and trusted direct messages',
  },
  {
    to: '/discover',
    icon: '↗',
    title: 'Discover',
    description: 'Find trusted people and open circles',
  },
  {
    to: '/groups/new',
    icon: '+',
    title: 'Create Group',
    description: 'Start a new trusted circle',
  },
  {
    to: '/trust-passport',
    icon: '★',
    title: 'My Trust Passport',
    description: 'Your reputation and reliability profile',
  },
  {
    to: '/network',
    icon: '⌁',
    title: 'Trust Network Map',
    description: 'See your trusted relationship graph',
  },
  {
    to: '/simulator',
    icon: '∑',
    title: 'Simulator',
    description: 'Plan a circle before creating it',
  },
]

export default function DashboardQuickActions() {
  return (
    <section className="dashboardQuickActions">
      <div className="dashboardSectionHeader">
        <div>
          <p className="uiEyebrow">Explore</p>
          <h2>Useful tools</h2>
        </div>
      </div>

      <div className="dashboardQuickActionGrid">
        {actions.map(action => (
          <Link key={action.to} to={action.to} className="dashboardQuickAction">
            <span>{action.icon}</span>
            <div>
              <strong>{action.title}</strong>
              <small>{action.description}</small>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}