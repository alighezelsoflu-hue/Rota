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
          <p className="eyebrow">Bank-interest alternative</p>
          <h3>Instead of paying bank interest, use trusted 0% interest circles.</h3>
          <p>
            Rota helps members coordinate direct contributions and take turns receiving a lump sum.
            Your group charges no interest, and Rota does not hold or lend money.
          </p>
        </div>
      </article>

      <article className="principleCard decentralised">
        <span className="principleIcon">◎</span>
        <div>
          <p className="eyebrow">Trusted groups</p>
          <h3>Join one or more groups with people you trust.</h3>
          <p>
            Build circles with family, friends, colleagues, and community members.
            Trust, responsibility, and clear records make every circle stronger.
          </p>
        </div>
      </article>

      <article className="principleCard networkGrowth">
        <span className="principleIcon">↗</span>
        <div>
          <p className="eyebrow">Community strength</p>
          <h3>The stronger your trusted network, the more useful Rota becomes.</h3>
          <p>
            More trusted circles mean better visibility, stronger social proof,
            member reviews, and more opportunities to join reliable groups.
          </p>
          {!compact && <Link className="inlineLink" to="/network">Explore your Trust Network Map →</Link>}
        </div>
      </article>
    </section>
  )
}