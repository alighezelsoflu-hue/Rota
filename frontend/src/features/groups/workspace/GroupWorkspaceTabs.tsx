export type GroupWorkspaceTabId =
  | 'overview'
  | 'payments'
  | 'members'
  | 'messages'
  | 'reviews'
  | 'manage'

type Props = {
  activeTab: GroupWorkspaceTabId
  onChange: (tab: GroupWorkspaceTabId) => void
  counts?: Partial<Record<GroupWorkspaceTabId, number>>
}

const tabs: { id: GroupWorkspaceTabId; label: string; shortLabel: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Home', icon: '◎' },
  { id: 'payments', label: 'Payments', shortLabel: 'Pay', icon: '✓' },
  { id: 'members', label: 'Members', shortLabel: 'People', icon: '👥' },
  { id: 'messages', label: 'Messages', shortLabel: 'Chat', icon: '✉' },
  { id: 'reviews', label: 'Reviews', shortLabel: 'Review', icon: '★' },
  { id: 'manage', label: 'Manage', shortLabel: 'Manage', icon: '⚙' },
]

export default function GroupWorkspaceTabs({ activeTab, onChange, counts = {} }: Props) {
  return (
    <nav className="groupWorkspaceTabs" aria-label="Group workspace sections">
      {tabs.map(tab => {
        const count = counts[tab.id] || 0

        return (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => onChange(tab.id)}
          >
            <span className="workspaceTabIcon">{tab.icon}</span>
            <span className="workspaceTabLabel">{tab.label}</span>
            <span className="workspaceTabShortLabel">{tab.shortLabel}</span>
            {count > 0 && <strong>{count > 99 ? '99+' : count}</strong>}
          </button>
        )
      })}
    </nav>
  )
}