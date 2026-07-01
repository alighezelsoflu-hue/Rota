import { useState } from 'react'
import { Badge, Card } from './ui'
import GroupRulesPage from './GroupRulesPage'
import GroupInviteControls from './GroupInviteControls'

type Props = {
  groupId: string
  isOrganizer: boolean
}

type Tab = 'rules' | 'invite'

export default function GroupSettingsPanel({ groupId, isOrganizer }: Props) {
  const [tab, setTab] = useState<Tab>('rules')

  return (
    <Card
      wide
      eyebrow="Group settings"
      title="Organization settings"
      description="Manage operating rules and invite controls from one professional group settings area."
      actions={<Badge tone={isOrganizer ? 'success' : 'neutral'}>{isOrganizer ? 'Organizer controls' : 'View only'}</Badge>}
    >
      <div className="groupSettingsTabs">
        <button type="button" className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>
          Rules
        </button>
        <button type="button" className={tab === 'invite' ? 'active' : ''} onClick={() => setTab('invite')}>
          Invite controls
        </button>
      </div>

      <div className="groupSettingsBody">
        {tab === 'rules' && <GroupRulesPage groupId={groupId} isOrganizer={isOrganizer} />}
        {tab === 'invite' && <GroupInviteControls groupId={groupId} isOrganizer={isOrganizer} />}
      </div>
    </Card>
  )
}