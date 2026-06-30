import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import type { ChatMessage, ChatThread } from './api'

type Props = {
  groupId: string
}

export default function GroupChatPanel({ groupId }: Props) {
  const [thread, setThread] = useState<ChatThread | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  async function load() {
    const opened = await api.groupChatThread(groupId)
    setThread(opened)
    setMessages(await api.chatMessages(opened.id))
  }

  useEffect(() => {
    load().catch(err => setError(err instanceof Error ? err.message : 'Could not load group chat'))
  }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!thread || !body.trim()) return

    setBusy(true)
    setError('')

    try {
      const saved = await api.sendChatMessage(thread.id, body)
      setMessages(current => [...current, saved])
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message')
    } finally {
      setBusy(false)
    }
  }

  async function report(message: ChatMessage) {
    const reason = window.prompt('Why are you reporting this message?')
    if (!reason) return

    setError('')

    try {
      await api.reportChatMessage(message.id, reason)
      setError('Message reported for review.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report message')
    }
  }

  return (
    <section className="card wide chatPanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Circle chat</p>
          <h2>Group messages</h2>
          <p className="mutedText">
            Discuss payment proof, due dates, confirmations, and group rules with members of this circle.
          </p>
        </div>

        <Link className="button secondary" to="/messages">All messages</Link>
      </div>

      {error && (
        <p className={error.includes('reported') ? 'safeNote' : 'error'}>
          {error}
        </p>
      )}

      <div className="chatSafetyNote">
        Rota does not hold or transfer money. Never send money outside an agreed group cycle.
      </div>

      <div className="chatMessages">
        {messages.length === 0 ? (
          <p className="mutedText">No messages yet. Start the group conversation.</p>
        ) : messages.map(message => (
          <div key={message.id} className={message.mine ? 'chatBubble mine' : 'chatBubble'}>
            <div>
              <strong>{message.sender_name}</strong>
              <small>{message.created_at ? new Date(message.created_at).toLocaleString() : ''}</small>
            </div>

            <p>{message.body}</p>

            {!message.mine && (
              <button className="ghost mini" type="button" onClick={() => report(message)}>
                Report
              </button>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <form className="chatComposer" onSubmit={send}>
        <input
          value={body}
          onChange={event => setBody(event.target.value)}
          placeholder="Write a group message..."
          maxLength={2000}
        />
        <button className="button" type="submit" disabled={busy || !body.trim()}>
          {busy ? 'Sending...' : 'Send'}
        </button>
      </form>
    </section>
  )
}