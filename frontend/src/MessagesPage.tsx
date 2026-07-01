import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from './api'
import { messageReadApi } from './messageReadApi'
import { ActionBanner, Badge, Button, Card, EmptyState, PageHeader, Skeleton } from './ui'

type ThreadLike = {
  id: string
  type?: string
  group_id?: string | null
  group_name?: string | null
  other_user_id?: string | null
  other_user_name?: string | null
  other_user_email?: string | null
  last_message_body?: string | null
  last_message_at?: string | null
  updated_at?: string | null
  unread_count?: number
  unread_messages?: number
  unread?: number
  title?: string
  name?: string
}

type MessageLike = {
  id: string
  thread_id?: string
  sender_user_id?: string
  sender_name?: string | null
  sender_email?: string | null
  body: string
  created_at: string
  edited_at?: string | null
  deleted_at?: string | null
}

function normalizeThreads(payload: any): ThreadLike[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.threads)) return payload.threads
  return []
}

function normalizeMessages(payload: any): MessageLike[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.messages)) return payload.messages
  return []
}

function threadTitle(thread: ThreadLike) {
  if (thread.title) return thread.title
  if (thread.type === 'group') return thread.group_name || 'Group chat'
  return thread.other_user_name || thread.other_user_email || thread.name || 'Direct message'
}

function threadSubtitle(thread: ThreadLike) {
  if (thread.type === 'group') return 'Group conversation'
  if (thread.other_user_email) return thread.other_user_email
  return 'Trusted connection'
}

function threadUnreadCount(thread: ThreadLike) {
  return Number(
    thread.unread_count ??
    thread.unread_messages ??
    thread.unread ??
    0,
  )
}

function threadTime(thread: ThreadLike) {
  const value = thread.last_message_at || thread.updated_at

  if (!value) return ''

  try {
    return new Date(value).toLocaleString()
  } catch {
    return ''
  }
}

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [threads, setThreads] = useState<ThreadLike[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string>('')
  const [messages, setMessages] = useState<MessageLike[]>([])
  const [body, setBody] = useState('')
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [messageError, setMessageError] = useState('')

  const selectedThread = useMemo(
    () => threads.find(thread => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId],
  )

  async function loadThreads(preferredThreadId?: string) {
    setLoadingThreads(true)
    setError('')

    try {
      const payload = await api.chatThreads()
      const loadedThreads = normalizeThreads(payload)
      setThreads(loadedThreads)

      const urlThreadId = preferredThreadId || searchParams.get('thread') || ''
      const nextSelectedThreadId =
        loadedThreads.find(thread => thread.id === urlThreadId)?.id ||
        selectedThreadId ||
        loadedThreads[0]?.id ||
        ''

      setSelectedThreadId(nextSelectedThreadId)

      if (nextSelectedThreadId) {
        await loadMessages(nextSelectedThreadId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load messages')
    } finally {
      setLoadingThreads(false)
    }
  }

  async function loadMessages(threadId: string) {
    if (!threadId) return

    setLoadingMessages(true)
    setMessageError('')

    try {
      const payload = await api.chatMessages(threadId)
      setMessages(normalizeMessages(payload))

      await messageReadApi.safeMarkThreadRead(threadId)

      setThreads(current =>
        current.map(thread =>
          thread.id === threadId
            ? {
                ...thread,
                unread_count: 0,
                unread_messages: 0,
                unread: 0,
              }
            : thread,
        ),
      )
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'Could not load this conversation')
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    loadThreads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function selectThread(threadId: string) {
    setSelectedThreadId(threadId)
    setSearchParams({ thread: threadId })
    await loadMessages(threadId)
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault()

    const text = body.trim()

    if (!selectedThreadId || !text) return

    setSending(true)
    setMessageError('')

    try {
      await api.sendChatMessage(selectedThreadId, text)
      setBody('')
      await loadMessages(selectedThreadId)
      await loadThreads(selectedThreadId)
      messageReadApi.broadcastMessagesChanged()
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'Could not send message')
    } finally {
      setSending(false)
    }
  }

  async function reportMessage(messageId: string) {
    const reason = window.prompt('Why are you reporting this message?')

    if (!reason) return

    try {
      await api.reportChatMessage(messageId, reason)
      setMessageError('')
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'Could not report message')
    }
  }

  return (
    <div className="messagesPage">
      <PageHeader
        eyebrow="Messages"
        title="Trusted conversations"
        description="Use group chat for circle coordination and direct chat after a trusted connection is accepted."
      />

      {error && (
        <ActionBanner
          tone="danger"
          title="Messages unavailable"
          description={error}
          icon="!"
        />
      )}

      <section className="messagesLayout">
        <Card className="messagesThreadPanel" eyebrow="Inbox" title="Conversations">
          {loadingThreads ? (
            <Skeleton variant="card" />
          ) : threads.length === 0 ? (
            <EmptyState
              icon="✉"
              title="No conversations yet"
              description="Open a group chat or connect with trusted members to start messaging."
            />
          ) : (
            <div className="messageThreadList">
              {threads.map(thread => {
                const unread = threadUnreadCount(thread)
                const active = thread.id === selectedThreadId

                return (
                  <button
                    key={thread.id}
                    type="button"
                    className={active ? 'messageThreadItem active' : 'messageThreadItem'}
                    onClick={() => selectThread(thread.id)}
                  >
                    <span className="messageThreadAvatar">
                      {threadTitle(thread).slice(0, 1).toUpperCase()}
                    </span>

                    <span className="messageThreadText">
                      <strong>{threadTitle(thread)}</strong>
                      <small>{thread.last_message_body || threadSubtitle(thread)}</small>
                      {threadTime(thread) && <em>{threadTime(thread)}</em>}
                    </span>

                    {unread > 0 && (
                      <span className="messageThreadUnread">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="messagesConversationPanel" wide>
          {!selectedThread ? (
            <EmptyState
              icon="✉"
              title="Choose a conversation"
              description="Select a thread to read and send messages."
            />
          ) : (
            <>
              <div className="conversationHeader">
                <div>
                  <p className="uiEyebrow">{selectedThread.type === 'group' ? 'Group chat' : 'Direct chat'}</p>
                  <h2>{threadTitle(selectedThread)}</h2>
                  <p>{threadSubtitle(selectedThread)}</p>
                </div>

                <Badge tone={selectedThread.type === 'group' ? 'success' : 'info'}>
                  {selectedThread.type === 'group' ? 'Group' : 'Direct'}
                </Badge>
              </div>

              {messageError && (
                <ActionBanner
                  tone="danger"
                  title="Conversation problem"
                  description={messageError}
                  icon="!"
                />
              )}

              <div className="conversationMessages">
                {loadingMessages ? (
                  <Skeleton variant="card" />
                ) : messages.length === 0 ? (
                  <EmptyState
                    icon="◎"
                    title="No messages yet"
                    description="Send the first message in this conversation."
                  />
                ) : (
                  messages.map(message => (
                    <article key={message.id} className="conversationMessage">
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

              <form className="conversationComposer" onSubmit={sendMessage}>
                <input
                  value={body}
                  onChange={event => setBody(event.target.value)}
                  placeholder="Write a message..."
                />

                <Button type="submit" loading={sending} disabled={!body.trim()}>
                  Send
                </Button>
              </form>
            </>
          )}
        </Card>
      </section>
    </div>
  )
}