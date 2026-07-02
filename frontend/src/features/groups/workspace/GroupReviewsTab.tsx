import type { GroupDetail } from '../../../api/api'
import MemberReviewPanel from '../reviews/MemberReviewPanel'
import CycleReviewPrompt from '../reviews/CycleReviewPrompt'

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