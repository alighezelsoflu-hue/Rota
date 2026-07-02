import { Badge, Card } from '../../../components/ui/ui'
import type { SimulationResult } from '../simulatorMath'
import { money } from '../simulatorMath'

type Props = {
  simulation: SimulationResult
}

export default function CashflowTable({ simulation }: Props) {
  return (
    <Card
      wide
      eyebrow="Member cashflow"
      title="Contribution and payout table"
      description="This table shows when each member receives, how much they contribute, and their final net after one full rotation."
    >
      <div className="tableWrap simulatorTableWrap">
        <table className="simulatorCashflowTable">
          <thead>
            <tr>
              <th>Member</th>
              <th>Receives</th>
              <th>Date</th>
              <th>Total paid</th>
              <th>Total received</th>
              <th>Peak net</th>
              <th>Lowest before payout</th>
              <th>Final net</th>
            </tr>
          </thead>

          <tbody>
            {simulation.members.map(member => (
              <tr key={member.id}>
                <td>
                  <strong>{member.name}</strong>
                  <small>{member.timingLabel}</small>
                </td>
                <td>
                  <Badge tone={member.receivesCycle === 1 ? 'success' : 'info'}>
                    Cycle {member.receivesCycle}
                  </Badge>
                </td>
                <td>{member.receivesDateLabel}</td>
                <td>{money(member.totalPaid, simulation.input.currency)}</td>
                <td>{money(member.totalReceived, simulation.input.currency)}</td>
                <td>{money(member.peakNet, simulation.input.currency)}</td>
                <td>{money(member.lowestNetBeforePayout, simulation.input.currency)}</td>
                <td>
                  <Badge tone={member.finalNet === 0 ? 'success' : 'warning'}>
                    {money(member.finalNet, simulation.input.currency)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}