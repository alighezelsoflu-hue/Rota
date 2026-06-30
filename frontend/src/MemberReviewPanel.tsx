import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import type { GroupDetail, MemberReviewSummary } from './api'

type Props = {
  detail: GroupDetail
  currentUserId: string
}

const REVIEW_TAGS = [
  'Reliable payer',
  'Good communicator',
  'Clear receipt',
  'Confirms quickly',
  'Respectful',
  'On time',
  'Helpful organizer',
  'Good receiver',
]

export default function MemberReviewPanel({ detail, currentUserId }: Props) {
  const reviewableMembers = detail.members.filter(member => member.user_id !== currentUserId)
  const [reviewedUserId, setReviewedUserId] = useState(reviewableMembers[0]?.user_id || '')
  const [rating, setRating] = useState(5)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<'group_only' | 'network'>('network')
  const [summary, setSummary] = useState<MemberReviewSummary | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadSummary(userId: string) {
    if (!userId) return
    setSummary(await api.userReviews(userId))
  }

  useEffect(() => {
    loadSummary(reviewedUserId).catch(() => setSummary(null))
  }, [reviewedUserId])

  function toggleTag(tag: string) {
    setTags(current =>
      current.includes(tag)
        ? current.filter(item => item !== tag)
        : [...current, tag],
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!reviewedUserId) return

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await api.createMemberReview(reviewedUserId, {
        group_id: detail.group.id,
        rating,
        tags,
        note,
        visibility,
      })

      setMessage('Review saved.')
      setNote('')
      await loadSummary(reviewedUserId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review')
    } finally {
      setBusy(false)
    }
  }

  if (reviewableMembers.length === 0) {
    return null
  }

  return (
    <section className="card wide memberReviewPanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Member reviews</p>
          <h2>Review people you shared this circle with</h2>
          <p className="mutedText">
            Reviews are based on Rota group activity only. They are not a credit score or financial guarantee.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="safeNote">{message}</p>}

      <div className="reviewGrid">
        <form className="form reviewForm" onSubmit={submit}>
          <label>
            Member
            <select value={reviewedUserId} onChange={event => setReviewedUserId(event.target.value)}>
              {reviewableMembers.map(member => (
                <option key={member.user_id} value={member.user_id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Rating
            <select value={rating} onChange={event => setRating(Number(event.target.value))}>
              <option value={5}>5 — Excellent</option>
              <option value={4}>4 — Good</option>
              <option value={3}>3 — Okay</option>
              <option value={2}>2 — Needs improvement</option>
              <option value={1}>1 — Poor</option>
            </select>
          </label>

          <div>
            <span className="formLabel">Tags</span>
            <div className="reviewTags">
              {REVIEW_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={tags.includes(tag) ? 'selected' : ''}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <label>
            Note
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="Example: Paid on time and uploaded clear proof."
            />
          </label>

          <label>
            Visibility
            <select value={visibility} onChange={event => setVisibility(event.target.value as 'group_only' | 'network')}>
              <option value="network">Show in network profile</option>
              <option value="group_only">Group-only review</option>
            </select>
          </label>

          <button className="button full" type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Save review'}
          </button>
        </form>

        <aside className="reviewSummaryCard">
          {summary ? (
            <>
              <p className="eyebrow">Review profile</p>
              <h2>{summary.name}</h2>

              <div className="reviewScore">
                <strong>{summary.average_rating || '-'}</strong>
                <span>{summary.review_count} review{summary.review_count === 1 ? '' : 's'}</span>
              </div>

              <div className="reviewTagList">
                {summary.top_tags.length === 0 ? (
                  <p className="mutedText">No tags yet.</p>
                ) : summary.top_tags.map(item => (
                  <span key={item.tag}>{item.tag} × {item.count}</span>
                ))}
              </div>

              <div className="recentReviews">
                {summary.reviews.slice(0, 3).map(review => (
                  <div key={review.id}>
                    <strong>{review.reviewer_name}</strong>
                    <span>{review.rating}/5 · {review.group_name}</span>
                    {review.note && <p>{review.note}</p>}
                  </div>
                ))}
              </div>

              <Link className="button secondary full" to={`/reviews/${summary.user_id}`}>
                Open full reviews
              </Link>
            </>
          ) : (
            <p className="mutedText">Select a member to see review summary.</p>
          )}
        </aside>
      </div>
    </section>
  )
}