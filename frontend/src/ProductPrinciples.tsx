import { Link } from 'react-router-dom'

type Props = {
  compact?: boolean
}

export default function ProductPrinciples({ compact = false }: Props) {
  return (
    <section className={compact ? 'principlesGrid compactPrinciples' : 'principlesGrid'}>
      <article className="principleCard interestFree">
        <span className="principleIcon">0%</span>
        <div>
          <p className="eyebrow">Interest-free</p>
          <h3>Your group charges no interest.</h3>
          <p>
            Rota helps your group coordinate contributions directly. No bank loan,
            no group interest, no platform wallet.
          </p>
        </div>
      </article>

      <article className="principleCard decentralised">
        <span className="principleIcon">◎</span>
        <div>
          <p className="eyebrow">Decentralized circles</p>
          <h3>You are not dependent on one bank or one organizer.</h3>
          <p>
            Build many small trusted circles with family, friends, colleagues, and
            community members.
          </p>
        </div>
      </article>

      <article className="principleCard networkGrowth">
        <span className="principleIcon">↗</span>
        <div>
          <p className="eyebrow">Network growth</p>
          <h3>The stronger your trusted network, the more useful Rota becomes.</h3>
          <p>
            More trusted circles mean more visibility, stronger social proof, and
            better group opportunities.
          </p>
          {!compact && (
            <Link className="inlineLink" to="/network">
              Explore your Trust Network →
            </Link>
          )}
        </div>
      </article>
    </section>
  )
}