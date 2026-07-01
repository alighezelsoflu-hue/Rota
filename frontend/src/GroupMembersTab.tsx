import type { GroupDetail, User } from './api'
import { Badge, ButtonLink, Card } from './ui'
import MemberResponsibilityTracker from './MemberResponsibilityTracker'
import MemberAdmissionPanel from './MemberAdmissionPanel'

type Props = {
  detail: GroupDetail
  user: User
  isOrganizer: boolean
  onChanged: () => Promise<void>
}

export default function GroupMembersTab({ detail, user, isOrganizer, onChanged }: Props) {
  return (
    <div className="groupWorkspacePanel">
      <Card
        wide
        eyebrow="Members"
        title={`${detail.members.length} active people`}
        description="Review member roles, trust signals, reviews, responsibilities, and admission requests."
      >
        <div className="compactMemberGrid">
          {detail.members.map(member => (
            <article key={member.id} className="compactMemberCard">
              <span className="avatar">{member.name?.slice(0, 1).toUpperCase() || '?'}</span>

              <div>
                <strong>{member.name}</strong>
                <small>{member.email}</small>
                <div>
                  <Badge status={member.role} tone={member.role === 'organizer' ? 'purple' : 'neutral'} />
                </div>
              </div>

              {member.user_id !== user.id && (
                <ButtonLink size="sm" variant="ghost" to={`/reviews/${member.user_id}`}>
                  Reviews
                </ButtonLink>
              )}
            </article>
          ))}
        </div>
      </Card>

      <MemberAdmissionPanel
        groupId={detail.group.id}
        isOrganizer={isOrganizer}
      />

      <MemberResponsibilityTracker
        groupId={detail.group.id}
        onChanged={onChanged}
      />
    </div>
  )
}