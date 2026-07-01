import { FormEvent, useEffect, useState } from 'react'
import { api } from './api'
import { messageReadApi } from './messageReadApi'
import { ActionBanner, Badge, Button, Card, EmptyState, Skeleton } from './ui'

type Props = {
  groupId: string
}

type ThreadLike = {
  id: string
  type?: string
  group_id?: string | null
  group_name?: string | null
}

type MessageLike = {
  id: string
  thread_id?: string
  sender_user_id?: string
  sender_name?: string | null
  sender_email?: string | null
  body: string
  created_at: string
  deleted_at?: string | null
}

function normalizeMessages(payload: any): MessageLike[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.messages)) return payload.messages
  return []
}

function normalizeThread(payload: any): ThreadLike | null {
  if (!payload) return null
  if (payload.thread) return payload.thread
  return payload
}

export default function GroupChatPanel({ groupId }: Props) {
  const [thread, setThread] = useState<ThreadLike | null>(null)
  const [messages, setMessages] = useState<MessageLike[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function loadThreadAndMessages() {
    setLoading(true)
    setError('')

    try {
      const threadPayload = await api.groupChatThread(groupId)
      const loadedThread = normalizeThread(threadPayload)

      if (!loadedThread?.id) {
        throw new Error('Group chat thread was not created')
      }

      setThread(loadedThread)

      const messagePayload = await api.chatMessages(loadedThread.id)
      setMessages(normalizeMessages(messagePayload))

      await messageReadApi.safeMarkThreadRead(loadedThread.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load group chat')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadThreadAndMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  async function sendMessage(event: FormEvent) {
    event.preventDefault()

    const text = body.trim()

    if (!thread?.id || !text) return

    setSending(true)
    setError('')

    try {
      await api.sendChatMessage(thread.id, text)
      setBody('')
      await loadThreadAndMessages()
      messageReadApi.broadcastMessagesChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send group message')
    } finally {
      setSending(false)
    }
  }

  async function reportMessage(messageId: string) {
    const reason = window.prompt('Why are you reporting this message?')

    if (!reason) return

    try {
      await api.reportChatMessage(messageId, reason)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report message')
    }
  }

  return (
    <Card
      wide
      className="groupChatPanel"
      eyebrow="Group chat"
      title="Circle messages"
      description="Use this chat for group coordination. Payment proof and confirmations should still be recorded in the ledger."
      actions={<Badge tone="info">Members only</Badge>}
    >
      {error && (
        <ActionBanner
          tone="danger"
          title="Group chat unavailable"
          description={error}
          icon="!"
        />
      )}

      {loading ? (
        <Skeleton variant="card" />
      ) : (
        <>
          <div className="groupChatMessages">
            {messages.length === 0 ? (
              <EmptyState
                icon="✉"
                title="No group messages yet"
                description="Send the first update to your circle."
              />
            ) : (
              messages.map(message => (
                <article key={message.id} className="groupChatMessage">
                  <div>
                    <strong>{message.sender_name || message.sender_email || 'Member'}</strong>
                    <small>{new Date(message.created_at).toLocaleString()}</small>
                  </div>

                  <p>{message.deleted_at ? 'This message was deleted.' : message.body}</p>

                  {!message.deleted_at && (
                    <button type="button" onClick={() => reportMessage(message.id)}>
                      Report
                    </button>
                  )}
                </article>
              ))
            )}
          </div>

          <form className="groupChatComposer" onSubmit={sendMessage}>
            <input
              value={body}
              onChange={event => setBody(event.target.value)}
              placeholder="Write a group message..."
            />

            <Button type="submit" loading={sending} disabled={!body.trim()}>
              Send
            </Button>
          </form>
        </>
      )}
    </Card>
  )
}