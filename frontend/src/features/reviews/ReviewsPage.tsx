import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/api'
import type { MemberReviewSummary } from '../../api/api'

export default function ReviewsPage() {
  const { userId } = useParams()
  const [summary, setSummary] = useState<MemberReviewSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    api.userReviews(userId)
      .then(setSummary)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load reviews'))
  }, [userId])

  if (error) return <p className="error">{error}</p>
  if (!summary) return <p className="mutedText">Loading reviews...</p>

  return (
    <div className="reviewsPage">
      <section className="reviewsHero">
        <div>
          <p className="eyebrow">Member reviews</p>
          <h1>{summary.name}</h1>
          <p>
            Community reviews are based on Rota group activity only.
            They are not a credit score, identity guarantee, or financial guarantee.
          </p>
        </div>

        <div className="reviewsHeroScore">
          <strong>{summary.average_rating || '-'}</strong>
          <span>{summary.review_count} review{summary.review_count === 1 ? '' : 's'}</span>
        </div>
      </section>

      <section className="reviewStatsGrid">
        <div><span>Trust score</span><strong>{summary.trust_score}</strong></div>
        <div><span>Verification</span><strong>{summary.verification_status}</strong></div>
        <div><span>Average rating</span><strong>{summary.average_rating || '-'}</strong></div>
        <div><span>Total reviews</span><strong>{summary.review_count}</strong></div>
      </section>

      <section className="card">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Common tags</p>
            <h2>What people mention</h2>
          </div>
        </div>

        <div className="reviewTagList large">
          {summary.top_tags.length === 0 ? (
            <p className="mutedText">No tags yet.</p>
          ) : summary.top_tags.map(item => (
            <span key={item.tag}>{item.tag} × {item.count}</span>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Recent reviews</p>
            <h2>Group activity feedback</h2>
          </div>

          <Link className="button secondary" to="/discover">Back to discovery</Link>
        </div>

        {summary.reviews.length === 0 ? (
          <p className="mutedText">No reviews yet.</p>
        ) : (
          <div className="fullReviewList">
            {summary.reviews.map(review => (
              <article key={review.id}>
                <div>
                  <strong>{review.rating}/5</strong>
                  <span>{review.group_name}</span>
                </div>
                <p>{review.note || 'No written note.'}</p>
                <small>Reviewed by {review.reviewer_name}</small>
                <div className="reviewTagList">
                  {review.tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}