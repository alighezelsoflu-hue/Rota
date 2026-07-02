import React, { FormEvent, useMemo, useState } from 'react'
import { api } from '../../../api/api'
import type { Contribution, GroupDetail, User } from '../../../api/api'
import { ActionBanner, Badge, Button, Card, EmptyState } from '../../../components/ui/ui'
import ReceiptReviewActions from '../payments/ReceiptReviewActions'
import StructuredDisputeActions from '../payments/StructuredDisputeActions'
import DisputeCasePanel from '../payments/DisputeCasePanel'
import LatePaymentPanel from '../payments/LatePaymentPanel'

type Props = {
  detail: GroupDetail
  user: User
  isOrganizer: boolean
  onChanged: () => Promise<void>
}

function PayCard({
  contribution,
  groupCurrency,
  onSaved,
}: {
  contribution: Contribution
  groupCurrency: string
  onSaved: () => Promise<void>
}) {
  const [reference, setReference] = useState(contribution.payment_reference || '')
  const [note, setNote] = useState(contribution.note || '')
  const [proof, setProof] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const form = new FormData()
      form.append('payment_reference', reference)
      form.append('note', note)
      if (proof) form.append('proof', proof)

      await api.markPaid(contribution.id, form)
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save payment proof')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="uiCard form paymentCard compactPaymentAction" onSubmit={submit}>
      <div>
        <p className="uiEyebrow">Your payment</p>
        <h2>Record payment proof</h2>
        <p>
          Pay <strong>{contribution.amount} {groupCurrency}</strong> to{' '}
          <strong>{contribution.receiver_name}</strong> outside the app, then upload proof here.
        </p>
        <p>Status: <Badge status={contribution.status} /></p>
      </div>

      {error && (
        <ActionBanner
          tone="danger"
          title="Could not save payment proof"
          description={error}
          icon="!"
        />
      )}

      <label>
        Payment reference
        <input value={reference} onChange={event => setReference(event.target.value)} placeholder="Bank/mobile money reference" />
      </label>

      <label>
        Note
        <textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Optional note" />
      </label>

      <label>
        Proof screenshot or PDF
        <input type="file" accept="image/*,application/pdf" onChange={event => setProof(event.target.files?.[0] || null)} />
      </label>

      <Button full type="submit" loading={saving}>
        I paid / upload proof
      </Button>
    </form>
  )
}

function ConfirmTable({
  contributions,
  currency,
  onSaved,
}: {
  contributions: Contribution[]
  currency: string
  onSaved: () => Promise<void>
}) {
  const [error, setError] = useState('')

  async function confirm(id: string) {
    setError('')

    try {
      await api.confirmContribution(id)
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm')
    }
  }

  async function dispute(id: string) {
    const reason = window.prompt('Why are you disputing this contribution?')
    if (!reason) return

    try {
      await api.disputeContribution(id, reason)
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not dispute')
    }
  }

  return (
    <Card wide eyebrow="Receiver / organizer" title="Confirm received payments">
      {error && (
        <ActionBanner
          tone="danger"
          title="Payment review failed"
          description={error}
          icon="!"
        />
      )}

      <ContributionTable
        contributions={contributions}
        currency={currency}
        actions={contribution => (
          <div className="rowActions">
            <Button
              size="sm"
              type="button"
              onClick={() => confirm(contribution.id)}
              disabled={contribution.status === 'confirmed' || contribution.status === 'group_verified'}
            >
              Confirm
            </Button>

            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => dispute(contribution.id)}
            >
              Dispute
            </Button>
          </div>
        )}
      />
    </Card>
  )
}

function ContributionTable({
  contributions,
  currency,
  actions,
}: {
  contributions: Contribution[]
  currency: string
  actions?: (contribution: Contribution) => React.ReactNode
}) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Payer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Reference</th>
            <th>Proof</th>
            {actions && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {contributions.map(contribution => (
            <tr key={contribution.id}>
              <td>{contribution.payer_name}</td>
              <td>{contribution.amount} {currency}</td>
              <td><Badge status={contribution.status} /></td>
              <td>{contribution.payment_reference || '-'}</td>
              <td>
                {contribution.proof_url ? (
                  <a href={`${api.apiBase}${contribution.proof_url}`} target="_blank" rel="noreferrer">
                    View proof
                  </a>
                ) : '-'}
              </td>
              {actions && <td>{actions(contribution)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function GroupPaymentsTab({ detail, user, isOrganizer, onChanged }: Props) {
  const currentCycle = detail.cycles[0]

  const currentContributions = useMemo(() => {
    if (!currentCycle) return []
    return detail.contributions.filter(contribution => contribution.cycle_id === currentCycle.id)
  }, [detail.contributions, currentCycle])

  const myContribution = currentContributions.find(contribution => contribution.payer_user_id === user.id)
  const canConfirm = currentContributions.some(contribution => contribution.receiver_user_id === user.id)

  return (
    <div className="groupWorkspacePanel">
      {!currentCycle && (
        <Card wide>
          <EmptyState
            title="No payment cycle yet"
            description="Create a cycle before payments and proof records appear."
          />
        </Card>
      )}

      {currentCycle && myContribution && (
        <PayCard
          contribution={myContribution}
          groupCurrency={detail.group.currency}
          onSaved={onChanged}
        />
      )}

      {currentCycle && (canConfirm || isOrganizer) && (
        <ConfirmTable
          contributions={currentContributions}
          currency={detail.group.currency}
          onSaved={onChanged}
        />
      )}

      <Card wide eyebrow="Shared record" title="Contribution ledger">
        {currentContributions.length === 0 ? (
          <EmptyState
            title="No contribution rows yet"
            description="Create a cycle to generate the shared ledger for this group."
          />
        ) : (
          <ContributionTable
            contributions={currentContributions}
            currency={detail.group.currency}
            actions={contribution => (
              <div className="ledgerActionStack">
                <ReceiptReviewActions
                  contribution={contribution}
                  currentUserId={user.id}
                  onSaved={onChanged}
                />

                <StructuredDisputeActions
                  contribution={contribution}
                  onSaved={onChanged}
                />
              </div>
            )}
          />
        )}
      </Card>

      <DisputeCasePanel
        groupId={detail.group.id}
        isOrganizer={isOrganizer}
        onChanged={onChanged}
      />

      <LatePaymentPanel
        groupId={detail.group.id}
        currentUserId={user.id}
        isOrganizer={isOrganizer}
        onChanged={onChanged}
      />
    </div>
  )
}