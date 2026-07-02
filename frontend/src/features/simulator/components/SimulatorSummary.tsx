import { ActionBanner, StatCard } from '../../../components/ui/ui'
import type { SimulationResult } from '../simulatorMath'
import { money } from '../simulatorMath'

type Props = {
  simulation: SimulationResult
}

export default function SimulatorSummary({ simulation }: Props) {
  return (
    <div className="simulatorSummary">
      <section className="simulatorStatsGrid">
        <StatCard
          label="Cycle pot"
          value={money(simulation.potAmount, simulation.input.currency)}
          description={`${simulation.input.memberCount} members × ${money(simulation.input.contributionAmount, simulation.input.currency)}`}
          icon="◎"
          tone="success"
        />

        <StatCard
          label="Total rotation value"
          value={money(simulation.totalRotationValue, simulation.input.currency)}
          description={`${simulation.cycleCount} payout cycles`}
          icon="↗"
          tone="info"
        />

        <StatCard
          label="Duration"
          value={simulation.durationLabel}
          description={simulation.input.frequency === 'weekly' ? 'Weekly circle' : 'Monthly circle'}
          icon="◷"
          tone="neutral"
        />

        <StatCard
          label="Interest charged"
          value="0%"
          description="Rota coordinates only"
          icon="0%"
          tone="success"
        />
      </section>

      {simulation.warnings.length > 0 ? (
        <ActionBanner
          tone="warning"
          title="Check your simulator inputs"
          description={simulation.warnings.join(' ')}
          icon="!"
        />
      ) : (
        <ActionBanner
          tone="success"
          title="Balanced 0% interest rotation"
          description="Every member contributes the same total and receives once. The benefit is timing and coordination, not interest."
          icon="✓"
        />
      )}
    </div>
  )
}