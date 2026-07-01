import { useState } from 'react'
import { ActionBanner, Button, Card } from './ui'
import { exportsDisputesApi } from './exportsDisputesApi'

type Props = {
  groupId: string
  groupName: string
}

export default function GroupExportActions({ groupId, groupName }: Props) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function downloadLedger() {
    setBusy('ledger')
    setError('')
    setMessage('')

    try {
      await exportsDisputesApi.downloadLedger(groupId, groupName)
      setMessage('Ledger CSV downloaded.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download ledger')
    } finally {
      setBusy('')
    }
  }

  async function downloadAudit() {
    setBusy('audit')
    setError('')
    setMessage('')

    try {
      await exportsDisputesApi.downloadAudit(groupId, groupName)
      setMessage('Audit log CSV downloaded.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download audit log')
    } finally {
      setBusy('')
    }
  }

  return (
    <Card
      wide
      eyebrow="Exports"
      title="Download group records"
      description="Export the shared ledger and audit log for offline review, transparency, and record keeping."
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Export failed"
          description={error}
          icon="!"
        />
      )}

      {message && (
        <ActionBanner
          tone="success"
          title="Export ready"
          description={message}
          icon="✓"
        />
      )}

      <div className="groupExportActions">
        <Button type="button" onClick={downloadLedger} loading={busy === 'ledger'}>
          Export ledger CSV
        </Button>

        <Button type="button" variant="secondary" onClick={downloadAudit} loading={busy === 'audit'}>
          Export audit log CSV
        </Button>
      </div>

      <p className="mutedText">
        Exports are private to group members. They include contribution statuses, payment references, proof links, and audit activity.
      </p>
    </Card>
  )
}