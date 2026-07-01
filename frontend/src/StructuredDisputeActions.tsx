import { FormEvent, useState } from 'react'
import type { Contribution } from './api'
import { ActionBanner, Button, Modal } from './ui'
import { exportsDisputesApi } from './exportsDisputesApi'
import type { DisputeReason } from './exportsDisputesApi'

type Props = {
  contribution: Contribution
  onSaved: () => Promise<void>
}

const reasonOptions: Array<{ value: DisputeReason; label: string }> = [
  { value: 'payment_not_received', label: 'Payment not received' },
  { value: 'wrong_amount', label: 'Wrong amount' },
  { value: 'wrong_receiver', label: 'Wrong receiver' },
  { value: 'unclear_proof', label: 'Unclear proof' },
  { value: 'duplicate_proof', label: 'Duplicate proof' },
  { value: 'other', label: 'Other' },
]

export default function StructuredDisputeActions({ contribution, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<DisputeReason>('payment_not_received')
  const [note, setNote] = useState('')
  const [evidenceText, setEvidenceText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()

    setBusy(true)
    setError('')

    try {
      await exportsDisputesApi.createDisputeCase(contribution.id, {
        reason,
        note,
        evidence_text: evidenceText,
      })

      setOpen(false)
      setNote('')
      setEvidenceText('')
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open dispute case')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={contribution.status === 'disputed' ? 'secondary' : 'ghost'}
        onClick={() => setOpen(true)}
      >
        {contribution.status === 'disputed' ? 'Dispute case' : 'Open dispute'}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Open structured dispute"
        description="Create a clear record for this payment issue. The organizer can review and resolve it."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form={`dispute-form-${contribution.id}`} loading={busy}>
              Save dispute case
            </Button>
          </>
        }
      >
        <form id={`dispute-form-${contribution.id}`} className="form structuredDisputeForm" onSubmit={submit}>
          {error && (
            <ActionBanner
              tone="danger"
              title="Could not create dispute case"
              description={error}
              icon="!"
            />
          )}

          <label>
            Reason
            <select value={reason} onChange={event => setReason(event.target.value as DisputeReason)}>
              {reasonOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Notes
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="Explain what happened. Example: receiver says payment did not arrive, but proof was uploaded."
            />
          </label>

          <label>
            Evidence details
            <textarea
              value={evidenceText}
              onChange={event => setEvidenceText(event.target.value)}
              placeholder="Optional: add receipt reference, bank transfer note, dates, or other details."
            />
          </label>
        </form>
      </Modal>
    </>
  )
}