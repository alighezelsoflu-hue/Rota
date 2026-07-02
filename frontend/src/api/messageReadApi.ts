import { api, getToken } from './api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers || {})

  if (token) headers.set('Authorization', `Bearer ${token}`)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${api.apiBase}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = 'Request failed'

    try {
      const data = await response.json()
      message = typeof data.detail === 'string' ? data.detail : message
    } catch {
      message = `Request failed with status ${response.status}`
    }

    throw new Error(message)
  }

  return response.json()
}

function normalizeThreads(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.threads)) return payload.threads
  return []
}

export const messageReadApi = {
  async markThreadRead(threadId: string) {
    return request<{ read: boolean }>(`/chat/threads/${threadId}/read`, {
      method: 'POST',
    })
  },

  async safeMarkThreadRead(threadId: string) {
    try {
      await messageReadApi.markThreadRead(threadId)
      messageReadApi.broadcastMessagesRead()
    } catch {
      // Do not block the chat UI if the read endpoint is unavailable.
    }
  },

  async unreadMessageCount() {
    const payload = await api.chatThreads()
    const threads = normalizeThreads(payload)

    return threads.reduce((total, thread) => {
      return total + Number(
        thread.unread_count ??
        thread.unread_messages ??
        thread.unread ??
        0,
      )
    }, 0)
  },

  broadcastMessagesRead() {
    window.dispatchEvent(new Event('rota:messages-read'))
  },

  broadcastMessagesChanged() {
    window.dispatchEvent(new Event('rota:messages-changed'))
  },
}