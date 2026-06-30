import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import type { ChatMessage, ChatThread } from './api'

function acceptedConnectionsFromRequests(requests: { incoming: any[]; outgoing: any[] }) {
  const acceptedIncoming = requests.incoming
    .filter(request => request.status === 'accepted')
    .map(request => ({
      user_id: request.requester_user_id,
      name: request.requester_name,
      trust_score: request.requester_trust_score,
    }))

  const acceptedOutgoing = requests.outgoing
    .filter(request => request.status === 'accepted')
    .map(request => ({
      user_id: request.receiver_user_id,
      name: request.receiver_name,
      trust_score: request.receiver_trust_score,
    }))

  const byId = new Map<string, any>()

  for (const connection of [...acceptedIncoming, ...acceptedOutgoing]) {
    if (connection.user_id) byId.set(connection.user_id, connection)
  }

  return Array.from(byId.values())
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [requests, setRequests] = useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] })
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const acceptedConnections = useMemo(() => acceptedConnectionsFromRequests(requests), [requests])

  async function loadThreads() {
    const [threadData, requestData] = await Promise.all([
      api.chatThreads(),
      api.discoveryRequests(),
    ])

    setThreads(threadData)
    setRequests(requestData)

    if (!selectedThread && threadData.length > 0) {
      setSelectedThread(threadData[0])
      setMessages(await api.chatMessages(threadData[0].id))
    }
  }

  useEffect(() => {
    loadThreads().catch(err => setError(err instanceof Error ? err.message : 'Could not load messages'))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function selectThread(thread: ChatThread) {
    setSelectedThread(thread)
    setError('')

    try {
      setMessages(await api.chatMessages(thread.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load chat')
    }
  }

  async function openDirect(userId: string) {
    setBusy(userId)
    setError('')

    try {
      const thread = await api.directChatThread(userId)
      setSelectedThread(thread)
      setMessages(await api.chatMessages(thread.id))
      await loadThreads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open private chat')
    } finally {
      setBusy('')
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!selectedThread || !body.trim()) return

    setBusy('send')
    setError('')

    try {
      const saved = await api.sendChatMessage(selectedThread.id, body)
      setMessages(current => [...current, saved])
      setBody('')
      await loadThreads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message')
    } finally {
      setBusy('')
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
    <div className="messagesPage">
      <section className="messagesHero">
        <div>
          <p className="eyebrow">Trusted messages</p>
          <h1>Chat with group members and accepted connections.</h1>
          <p>
            Private chat is only available after a connection request is accepted.
            Group chat is only available to group members.
          </p>
        </div>
      </section>

      {error && (
        <p className={error.includes('reported') ? 'safeNote' : 'error'}>
          {error}
        </p>
      )}

      <div className="messagesLayout">
        <aside className="messageSidebar">
          <div className="sidebarSection">
            <p className="eyebrow">Chats</p>

            {threads.length === 0 ? (
              <p className="mutedText">No chats yet.</p>
            ) : threads.map(thread => (
              <button
                key={thread.id}
                className={selectedThread?.id === thread.id ? 'threadButton selected' : 'threadButton'}
                type="button"
                onClick={() => selectThread(thread)}
              >
                <strong>{thread.label || (thread.type === 'group' ? 'Group chat' : 'Private chat')}</strong>
                <span>{thread.type === 'group' ? 'Circle chat' : 'Private chat'}</span>
                {thread.last_message && <small>{thread.last_message}</small>}
              </button>
            ))}
          </div>

          <div className="sidebarSection">
            <p className="eyebrow">Accepted connections</p>

            {acceptedConnections.length === 0 ? (
              <p className="mutedText">Accept a connection request to start private chat.</p>
            ) : acceptedConnections.map(connection => (
              <button
                key={connection.user_id}
                className="connectionChatButton"
                type="button"
                disabled={busy === connection.user_id}
                onClick={() => openDirect(connection.user_id)}
              >
                <strong>{connection.name}</strong>
                <span>Trust {connection.trust_score ?? '-'}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="messageWindow">
          {selectedThread ? (
            <>
              <div className="messageWindowHeader">
                <div>
                  <p className="eyebrow">{selectedThread.type === 'group' ? 'Circle chat' : 'Private chat'}</p>
                  <h2>{selectedThread.label || 'Conversation'}</h2>
                </div>
              </div>

              <div className="chatSafetyNote">
                Rota does not hold or transfer money. Never send money outside an agreed group cycle.
              </div>

              <div className="chatMessages large">
                {messages.length === 0 ? (
                  <p className="mutedText">No messages yet.</p>
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
                  placeholder="Write a message..."
                  maxLength={2000}
                />
                <button className="button" type="submit" disabled={busy === 'send' || !body.trim()}>
                  {busy === 'send' ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className="emptyState">
              <h3>Select a chat</h3>
              <p>Open a group chat or start a private chat with an accepted connection.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}