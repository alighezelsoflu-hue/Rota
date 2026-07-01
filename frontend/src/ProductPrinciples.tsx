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
          <p className="eyebrow">0% interest circles</p>
          <h3>Build a trusted alternative to paying bank interest.</h3>
          <p>
            Members contribute directly, take turns receiving the lump sum, and keep the group interest-free.
            Rota coordinates records, not money.
          </p>
        </div>
      </article>

      <article className="principleCard decentralised">
        <span className="principleIcon">◎</span>
        <div>
          <p className="eyebrow">Trusted groups</p>
          <h3>Join one or more circles with people you trust.</h3>
          <p>
            Create circles with family, friends, colleagues, and community members.
            Clear agreements and payment records help everyone stay responsible.
          </p>
        </div>
      </article>

      <article className="principleCard networkGrowth">
        <span className="principleIcon">↗</span>
        <div>
          <p className="eyebrow">Community strength</p>
          <h3>Trust grows stronger when members stay accountable.</h3>
          <p>
            Reviews, confirmations, audit logs, and shared history help responsible members build a stronger network.
          </p>
          {!compact && <Link className="inlineLink" to="/network">Explore your Trust Network Map →</Link>}
        </div>
      </article>
    </section>
  )
}