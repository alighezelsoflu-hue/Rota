import { Link } from 'react-router-dom'
import type { GroupDetail } from '../../../api/api'
import { Badge, ButtonLink } from '../../../components/ui/ui'

type Props = {
  detail: GroupDetail
  isOrganizer: boolean
}

export default function CompactGroupHeader({ detail, isOrganizer }: Props) {
  const group = detail.group
  const currentCycle = detail.cycles[0]
  const activeMembers = detail.members.length

  return (
    <section className="compactGroupHeader">
      <div className="compactGroupMain">
        <p className="uiEyebrow">Invite code: {group.invite_code}</p>

        <div className="compactGroupTitleRow">
          <h1>{group.name}</h1>
          <Badge status={group.status} dot />
        </div>

        <div className="compactGroupMeta">
          <span>{group.contribution_amount} {group.currency}</span>
          <span>{group.frequency}</span>
          <span>{activeMembers} members</span>
          {currentCycle && <span>Cycle {currentCycle.cycle_number}</span>}
          {isOrganizer && <span>Organizer controls</span>}
        </div>
      </div>

      <div className="compactGroupActions">
        <ButtonLink to={`/g/${group.invite_code}`} variant="secondary" size="sm">
          Public invite
        </ButtonLink>

        <ButtonLink to="/messages" variant="secondary" size="sm">
          Messages
        </ButtonLink>

        <Link className="compactTextLink" to="/dashboard">
          My Groups
        </Link>
      </div>
    </section>
  )
}