import { Badge, Card } from '../ui'
import type { SimulationResult } from './simulatorMath'
import { money } from './simulatorMath'

type Props = {
  simulation: SimulationResult
}

export default function PayoutTimeline({ simulation }: Props) {
  return (
    <Card
      wide
      eyebrow="Payout timeline"
      title="Who receives each cycle"
      description="Each cycle creates one pot. One selected receiver gets the pot, and everyone receives once before the rotation completes."
    >
      <div className="payoutTimeline">
        {simulation.cycles.map(cycle => (
          <article key={cycle.cycleNumber} className="payoutCycleCard">
            <div className="payoutCycleTop">
              <Badge tone={cycle.cycleNumber === 1 ? 'success' : 'info'}>
                Cycle {cycle.cycleNumber}
              </Badge>
              <span>{cycle.dateLabel}</span>
            </div>

            <div className="payoutReceiver">
              <span>Receiver</span>
              <strong>{cycle.receiverName}</strong>
            </div>

            <div className="payoutPot">
              <span>Pot</span>
              <strong>{money(cycle.potAmount, simulation.input.currency)}</strong>
              <small>
                {cycle.memberCount} × {money(cycle.contributionAmount, simulation.input.currency)}
              </small>
            </div>
          </article>
        ))}
      </div>
    </Card>
  )
}