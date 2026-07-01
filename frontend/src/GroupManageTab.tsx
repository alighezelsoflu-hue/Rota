import type { GroupDetail, User } from './api'
import { Card, EmptyState } from './ui'
import GroupRulesPage from './GroupRulesPage'
import GroupInviteControls from './GroupInviteControls'
import GroupGovernancePanel from './GroupGovernancePanel'
import GroupShareInvite from './GroupShareInvite'
import GroupExportActions from './GroupExportActions'
import PaymentScheduleCalendar from './PaymentScheduleCalendar'
import CircleCalculator from './CircleCalculator'

type Props = {
  detail: GroupDetail
  user: User
  isOrganizer: boolean
  onChanged: () => Promise<void>
}

export default function GroupManageTab({ detail, user, isOrganizer, onChanged }: Props) {
  return (
    <div className="groupWorkspacePanel">
      <section className="compactManageGrid">
        <GroupRulesPage
          groupId={detail.group.id}
          isOrganizer={isOrganizer}
        />

        <GroupInviteControls
          groupId={detail.group.id}
          isOrganizer={isOrganizer}
        />
      </section>

      <GroupGovernancePanel
        groupId={detail.group.id}
        isOrganizer={isOrganizer}
        onChanged={onChanged}
      />

      <GroupShareInvite
        inviteCode={detail.group.invite_code}
        groupName={detail.group.name}
      />

      <GroupExportActions
        groupId={detail.group.id}
        groupName={detail.group.name}
      />

      <PaymentScheduleCalendar groupId={detail.group.id} />

      <CircleCalculator
        detail={detail}
        currentUserId={user.id}
      />

      <Card wide eyebrow="Transparency" title="Audit log">
        <div className="timeline compactAuditTimeline">
          {detail.audit_logs.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Group events, payment updates, confirmations, and governance actions will appear here."
            />
          ) : detail.audit_logs.map(log => (
            <div key={log.id} className="timelineItem">
              <span />
              <div>
                <strong>{log.action.replace(/_/g, ' ')}</strong>
                <small>{new Date(log.created_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}