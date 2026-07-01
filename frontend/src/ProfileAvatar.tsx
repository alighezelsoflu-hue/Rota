import { useEffect, useState } from 'react'
import type { User } from './api'
import { profilePictureApi, resolveProfilePictureUrl } from './profilePictureApi'

type Props = {
  user: User
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function initials(name: string) {
  return name
    .split(' ')
    .map(part => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'
}

export default function ProfileAvatar({ user, size = 'md', className = '' }: Props) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)

  async function load() {
    try {
      const data = await profilePictureApi.me()
      setUrl(resolveProfilePictureUrl(data.profile_picture_url))
      setFailed(false)
    } catch {
      setUrl('')
      setFailed(false)
    }
  }

  useEffect(() => {
    load()

    function onUpdated() {
      load()
    }

    window.addEventListener('rota-profile-picture-updated', onUpdated)

    return () => {
      window.removeEventListener('rota-profile-picture-updated', onUpdated)
    }
  }, [])

  const showImage = url && !failed

  return (
    <span className={`profilePictureAvatar ${size} ${className}`}>
      {showImage ? (
        <img
          src={url}
          alt={`${user.name} profile`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials(user.name)}</span>
      )}
    </span>
  )
}