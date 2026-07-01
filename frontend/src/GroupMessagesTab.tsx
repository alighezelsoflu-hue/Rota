import GroupAnnouncementsPanel from './GroupAnnouncementsPanel'
import GroupChatPanel from './GroupChatPanel'

type Props = {
  groupId: string
  isOrganizer: boolean
}

export default function GroupMessagesTab({ groupId, isOrganizer }: Props) {
  return (
    <div className="groupWorkspacePanel">
      <GroupAnnouncementsPanel
        groupId={groupId}
        isOrganizer={isOrganizer}
      />

      <GroupChatPanel groupId={groupId} />
    </div>
  )
}