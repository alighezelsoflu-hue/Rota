import { Badge, Card } from '../../../components/ui/ui'
import type { SimulationResult } from '../simulatorMath'
import { money } from '../simulatorMath'

type Props = {
  simulation: SimulationResult
}

function buildPath(points: Array<{ cycleNumber: number; value: number }>, minValue: number, maxValue: number, maxCycle: number) {
  const width = 760
  const height = 320
  const padLeft = 48
  const padRight = 24
  const padTop = 24
  const padBottom = 42
  const innerWidth = width - padLeft - padRight
  const innerHeight = height - padTop - padBottom
  const range = maxValue - minValue || 1

  return points
    .map((point, index) => {
      const x = padLeft + (point.cycleNumber / maxCycle) * innerWidth
      const y = padTop + ((maxValue - point.value) / range) * innerHeight

      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function pointPosition(point: { cycleNumber: number; value: number }, minValue: number, maxValue: number, maxCycle: number) {
  const width = 760
  const height = 320
  const padLeft = 48
  const padRight = 24
  const padTop = 24
  const padBottom = 42
  const innerWidth = width - padLeft - padRight
  const innerHeight = height - padTop - padBottom
  const range = maxValue - minValue || 1

  return {
    x: padLeft + (point.cycleNumber / maxCycle) * innerWidth,
    y: padTop + ((maxValue - point.value) / range) * innerHeight,
  }
}

export default function NetPositionChart({ simulation }: Props) {
  const visibleSeries = simulation.netSeries.slice(0, 10)
  const allValues = visibleSeries.flatMap(series => series.points.map(point => point.value))
  const rawMin = Math.min(...allValues, 0)
  const rawMax = Math.max(...allValues, 0)
  const padding = Math.max(simulation.input.contributionAmount, (rawMax - rawMin) * 0.12)

  const minValue = rawMin - padding
  const maxValue = rawMax + padding
  const zero = pointPosition({ cycleNumber: 0, value: 0 }, minValue, maxValue, simulation.cycleCount).y

  return (
    <Card
      wide
      eyebrow="Net position"
      title="How each member’s position changes over time"
      description="Net position equals total received minus total paid. Everyone returns to zero by the end of a complete rotation."
      actions={<Badge tone="success">Final net: 0</Badge>}
    >
      <div className="netChartWrap">
        <svg className="netPositionChart" viewBox="0 0 760 320" role="img" aria-label="Net position chart">
          <line className="netAxis" x1="48" x2="736" y1={zero} y2={zero} />
          <line className="netAxis vertical" x1="48" x2="48" y1="24" y2="278" />

          <text className="netAxisLabel" x="50" y="18">
            {money(maxValue, simulation.input.currency)}
          </text>

          <text className="netAxisLabel" x="50" y="306">
            {money(minValue, simulation.input.currency)}
          </text>

          <text className="netZeroLabel" x="54" y={zero - 6}>
            0
          </text>

          {simulation.cycles.map(cycle => {
            const position = pointPosition(
              { cycleNumber: cycle.cycleNumber, value: minValue },
              minValue,
              maxValue,
              simulation.cycleCount,
            )

            return (
              <g key={cycle.cycleNumber}>
                <line className="netGridLine" x1={position.x} x2={position.x} y1="24" y2="278" />
                <text className="netCycleLabel" x={position.x} y="306">
                  {cycle.cycleNumber}
                </text>
              </g>
            )
          })}

          {visibleSeries.map((series, index) => (
            <g key={series.memberId} className={`netSeries netSeries-${index % 10}`}>
              <path d={buildPath(series.points, minValue, maxValue, simulation.cycleCount)} />

              {series.points.map(point => {
                const position = pointPosition(point, minValue, maxValue, simulation.cycleCount)
                return <circle key={point.cycleNumber} cx={position.x} cy={position.y} r="3.4" />
              })}
            </g>
          ))}
        </svg>
      </div>

      <div className="netLegend">
        {visibleSeries.map((series, index) => (
          <div key={series.memberId} className={`netLegendItem netLegend-${index % 10}`}>
            <i />
            <span>{series.memberName}</span>
            <small>Receives cycle {series.receivesCycle}</small>
          </div>
        ))}

        {simulation.netSeries.length > visibleSeries.length && (
          <p className="mutedText">
            Showing first {visibleSeries.length} members. The cashflow table includes everyone.
          </p>
        )}
      </div>
    </Card>
  )
}