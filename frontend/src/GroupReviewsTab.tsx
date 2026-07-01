import type { GroupDetail } from './api'
import MemberReviewPanel from './MemberReviewPanel'
import CycleReviewPrompt from './CycleReviewPrompt'

type Props = {
  detail: GroupDetail
  currentUserId: string
}

export default function GroupReviewsTab({ detail, currentUserId }: Props) {
  return (
    <div className="groupWorkspacePanel">
      <CycleReviewPrompt groupId={detail.group.id} />

      <div id="member-review-panel">
        <MemberReviewPanel
          detail={detail}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  )
}