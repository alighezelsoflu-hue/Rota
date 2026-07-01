import { api, getToken } from './api'

export type ProfilePictureResponse = {
  profile_picture_url: string | null
}

function authHeaders() {
  const token = getToken()
  const headers = new Headers()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

async function parseError(response: Response) {
  try {
    const data = await response.json()
    return typeof data.detail === 'string' ? data.detail : 'Request failed'
  } catch {
    return `Request failed with status ${response.status}`
  }
}

export function resolveProfilePictureUrl(url: string | null | undefined) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${api.apiBase}${url}`
}

export const profilePictureApi = {
  async me(): Promise<ProfilePictureResponse> {
    const response = await fetch(`${api.apiBase}/profile-picture/me`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      throw new Error(await parseError(response))
    }

    return response.json()
  },

  async upload(file: File): Promise<ProfilePictureResponse> {
    const form = new FormData()
    form.append('file', file)

    const response = await fetch(`${api.apiBase}/profile-picture/me`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    })

    if (!response.ok) {
      throw new Error(await parseError(response))
    }

    return response.json()
  },

  async remove(): Promise<ProfilePictureResponse> {
    const response = await fetch(`${api.apiBase}/profile-picture/me`, {
      method: 'DELETE',
      headers: authHeaders(),
    })

    if (!response.ok) {
      throw new Error(await parseError(response))
    }

    return response.json()
  },
}

export function broadcastProfilePictureUpdated() {
  window.dispatchEvent(new Event('rota-profile-picture-updated'))
}