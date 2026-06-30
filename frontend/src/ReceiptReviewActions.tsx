import { useState } from 'react'
import { api } from './api'
import type { Contribution } from './api'

type Props = {
  contribution: Contribution
  currentUserId: string
  onSaved: () => Promise<void>
}

export default function ReceiptReviewActions({ contribution, currentUserId, onSaved }: Props) {
  const [busy, setBusy] = useState('')

  const canReview =
    Boolean(contribution.proof_url) &&
    contribution.payer_user_id !== currentUserId

  if (!canReview) return <span className="mutedText">-</span>

  async function confirm() {
    setBusy('confirm')
    try {
      await api.memberConfirmContribution(contribution.id)
      await onSaved()
    } finally {
      setBusy('')
    }
  }

  async function dispute() {
    const note = window.prompt('Why are you disputing this receipt?')
    if (!note) return

    setBusy('dispute')
    try {
      await api.memberDisputeContribution(contribution.id, note)
      await onSaved()
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="receiptReviewActions">
      <button
        className="button mini secondary"
        type="button"
        disabled={Boolean(busy)}
        onClick={confirm}
      >
        {busy === 'confirm' ? 'Saving...' : 'Confirm receipt'}
      </button>

      <button
        className="ghost mini"
        type="button"
        disabled={Boolean(busy)}
        onClick={dispute}
      >
        Dispute
      </button>
    </div>
  )
}