import { useEffect, useMemo, useState } from 'react'
import {
  ActionBanner,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Tabs,
} from '../../components/ui/ui'
import CashflowTable from './components/CashflowTable'
import NetPositionChart from './components/NetPositionChart'
import PayoutTimeline from './components/PayoutTimeline'
import SimulatorSummary from './components/SimulatorSummary'
import {
  defaultMemberNames,
  normalizeNames,
  normalizeOrder,
  simulateCircle,
} from './simulatorMath'
import type { SimulatorFrequency } from './simulatorMath'

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function moveItem(order: number[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= order.length) return order

  const copy = [...order]
  const temp = copy[index]
  copy[index] = copy[nextIndex]
  copy[nextIndex] = temp

  return copy
}

export default function LiveCircleSimulator() {
  const [memberCount, setMemberCount] = useState(10)
  const [contributionAmount, setContributionAmount] = useState(100)
  const [currency, setCurrency] = useState('EUR')
  const [frequency, setFrequency] = useState<SimulatorFrequency>('monthly')
  const [startDateISO, setStartDateISO] = useState(todayInputValue)
  const [memberNames, setMemberNames] = useState<string[]>(defaultMemberNames(10))
  const [payoutOrder, setPayoutOrder] = useState<number[]>(defaultMemberNames(10).map((_, index) => index))

  useEffect(() => {
    setMemberNames(current => normalizeNames(current, memberCount))
    setPayoutOrder(current => normalizeOrder(current, memberCount))
  }, [memberCount])

  const simulation = useMemo(() => {
    return simulateCircle({
      memberCount,
      contributionAmount,
      currency,
      frequency,
      memberNames,
      payoutOrder,
      startDateISO,
    })
  }, [memberCount, contributionAmount, currency, frequency, memberNames, payoutOrder, startDateISO])

  const canSimulate = simulation.input.memberCount >= 2 && simulation.input.contributionAmount > 0

  function updateMemberName(index: number, value: string) {
    setMemberNames(current => {
      const copy = [...current]
      copy[index] = value
      return normalizeNames(copy, memberCount)
    })
  }

  function resetNames() {
    setMemberNames(defaultMemberNames(memberCount))
    setPayoutOrder(defaultMemberNames(memberCount).map((_, index) => index))
  }

  return (
    <div className="professionalSimulator">
      <PageHeader
        eyebrow="Circle simulator"
        title="Model a 0% interest savings circle"
        description="Plan who receives each cycle, how large the pot becomes, and how every member’s net position changes over time."
        meta={
          <>
            <Badge tone="success">Interest 0%</Badge>
            <Badge tone="info">Rota holds €0</Badge>
            <Badge tone="purple">Planning tool</Badge>
          </>
        }
      />

      <ActionBanner
        tone="info"
        title="Simulation only"
        description="Rota simulations are coordination examples only. Rota does not hold money, transfer funds, lend money, or charge interest."
        icon="◎"
      />

      <section className="simulatorLayoutPro">
        <Card
          eyebrow="Inputs"
          title="Circle setup"
          description="Adjust the contribution amount, frequency, members, and payout order."
        >
          <div className="simulatorControlsPro">
            <label>
              Members
              <input
                type="number"
                min="2"
                max="50"
                value={memberCount}
                onChange={event => setMemberCount(Number(event.target.value))}
              />
            </label>

            <label>
              Contribution per member
              <input
                type="number"
                min="1"
                value={contributionAmount}
                onChange={event => setContributionAmount(Number(event.target.value))}
              />
            </label>

            <label>
              Currency
              <input
                value={currency}
                maxLength={8}
                onChange={event => setCurrency(event.target.value.toUpperCase())}
              />
            </label>

            <label>
              Frequency
              <select
                value={frequency}
                onChange={event => setFrequency(event.target.value as SimulatorFrequency)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>

            <label>
              First payout date
              <input
                type="date"
                value={startDateISO}
                onChange={event => setStartDateISO(event.target.value)}
              />
            </label>
          </div>

          <div className="simulatorControlFooter">
            <Button type="button" variant="secondary" onClick={resetNames}>
              Reset names and order
            </Button>
          </div>
        </Card>

        <SimulatorSummary simulation={simulation} />
      </section>

      <Card
        wide
        eyebrow="Members"
        title="Names and payout order"
        description="Rename members and reorder who receives first. The order below becomes the payout timeline."
      >
        <div className="memberOrderGrid">
          {simulation.input.payoutOrder.map((memberId, orderIndex) => (
            <div key={memberId} className="memberOrderRow">
              <Badge tone={orderIndex === 0 ? 'success' : 'neutral'}>
                #{orderIndex + 1}
              </Badge>

              <input
                value={simulation.input.memberNames[memberId]}
                onChange={event => updateMemberName(memberId, event.target.value)}
                aria-label={`Member ${memberId + 1} name`}
              />

              <div className="memberOrderActions">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={orderIndex === 0}
                  onClick={() => setPayoutOrder(current => moveItem(current, orderIndex, -1))}
                >
                  ↑
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={orderIndex === simulation.input.payoutOrder.length - 1}
                  onClick={() => setPayoutOrder(current => moveItem(current, orderIndex, 1))}
                >
                  ↓
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {!canSimulate ? (
        <EmptyState
          title="Choose valid simulator inputs"
          description="A circle needs at least 2 members and a contribution amount greater than 0."
        />
      ) : (
        <Tabs
          items={[
            {
              id: 'timeline',
              label: 'Payout timeline',
              badge: simulation.cycleCount,
              content: <PayoutTimeline simulation={simulation} />,
            },
            {
              id: 'net',
              label: 'Net position',
              content: <NetPositionChart simulation={simulation} />,
            },
            {
              id: 'table',
              label: 'Cashflow table',
              content: <CashflowTable simulation={simulation} />,
            },
          ]}
        />
      )}
    </div>
  )
}