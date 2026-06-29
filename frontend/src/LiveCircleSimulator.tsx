import { useMemo, useState } from 'react'

type Frequency = 'weekly' | 'monthly'

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

function money(amount: number, currency: string) {
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })} ${currency}`
}

function periodLabel(frequency: Frequency) {
  return frequency === 'weekly' ? 'week' : 'month'
}

export default function LiveCircleSimulator() {
  const [people, setPeople] = useState(10)
  const [contribution, setContribution] = useState(100)
  const [currency, setCurrency] = useState('EUR')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [payoutPosition, setPayoutPosition] = useState(4)

  const result = useMemo(() => {
    const safePeople = clamp(people, 2, 100)
    const safeContribution = Math.max(1, contribution)
    const safePosition = clamp(payoutPosition, 1, safePeople)

    const potPerCycle = safePeople * safeContribution
    const fullRotationContribution = safePeople * safeContribution
    const paidBeforeTurn = (safePosition - 1) * safeContribution
    const remainingAfterTurn = (safePeople - safePosition) * safeContribution
    const netPayoutCycle = potPerCycle - safeContribution

    const timeline = Array.from({ length: safePeople }).map((_, index) => {
      const cycle = index + 1
      const isMyTurn = cycle === safePosition
      return {
        cycle,
        label: isMyTurn ? 'Your turn' : `Member ${cycle}`,
        isMyTurn,
        cashFlow: isMyTurn ? netPayoutCycle : -safeContribution,
      }
    })

    return {
      safePeople,
      safeContribution,
      safePosition,
      potPerCycle,
      fullRotationContribution,
      paidBeforeTurn,
      remainingAfterTurn,
      netPayoutCycle,
      timeline,
    }
  }, [people, contribution, payoutPosition])

  const maxBar = Math.max(
    result.potPerCycle,
    ...result.timeline.map(item => Math.abs(item.cashFlow)),
  )

  return (
    <section className="simulatorPage">
      <div className="simulatorHero card wide">
        <div>
          <p className="eyebrow">Live circle simulator</p>
          <h1>Simulate how much each person pays and how much each cycle creates.</h1>
          <p className="mutedText">
            Change the number of people, contribution amount, frequency, and payout position.
            Rota instantly shows the pot, timeline, and interest-free calculation.
          </p>
        </div>

        <div className="zeroInterestBadge">
          <strong>0%</strong>
          <span>interest charged by the group</span>
        </div>
      </div>

      <div className="simulatorLayout">
        <section className="card simulatorControls">
          <p className="eyebrow">Inputs</p>
          <h2>Build a circle</h2>

          <label>
            Number of people
            <input
              type="number"
              min="2"
              max="100"
              value={people}
              onChange={event => {
                const next = Number(event.target.value)
                setPeople(next)
                setPayoutPosition(prev => clamp(prev, 1, next || 2))
              }}
            />
          </label>

          <label>
            Contribution per person
            <input
              type="number"
              min="1"
              value={contribution}
              onChange={event => setContribution(Number(event.target.value))}
            />
          </label>

          <label>
            Currency
            <select value={currency} onChange={event => setCurrency(event.target.value)}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="TRY">TRY</option>
              <option value="IRR">IRR</option>
            </select>
          </label>

          <label>
            Frequency
            <select
              value={frequency}
              onChange={event => setFrequency(event.target.value as Frequency)}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          <label>
            Your payout position
            <input
              type="number"
              min="1"
              max={result.safePeople}
              value={payoutPosition}
              onChange={event => setPayoutPosition(Number(event.target.value))}
            />
          </label>

          <div className="simulatorFormula">
            <strong>Formula</strong>
            <span>
              {result.safePeople} people × {money(result.safeContribution, currency)} ={' '}
              {money(result.potPerCycle, currency)} pot each cycle
            </span>
          </div>
        </section>

        <section className="card simulatorResults">
          <p className="eyebrow">Results</p>
          <h2>What this circle creates</h2>

          <div className="simulatorStatsGrid">
            <div className="simulatorStat">
              <span>Each person pays</span>
              <strong>{money(result.safeContribution, currency)}</strong>
              <small>Every {periodLabel(frequency)}</small>
            </div>

            <div className="simulatorStat highlight">
              <span>Pot per cycle</span>
              <strong>{money(result.potPerCycle, currency)}</strong>
              <small>One member receives this each cycle</small>
            </div>

            <div className="simulatorStat">
              <span>Full rotation</span>
              <strong>{result.safePeople}</strong>
              <small>{frequency === 'weekly' ? 'weeks' : 'months'}</small>
            </div>

            <div className="simulatorStat">
              <span>Interest charged</span>
              <strong>{money(0, currency)}</strong>
              <small>Your group charges no interest</small>
            </div>
          </div>

          <div className="simulatorExplanation">
            <h3>Your position: cycle {result.safePosition}</h3>
            <p>
              Before your turn, you pay{' '}
              <strong>{money(result.paidBeforeTurn, currency)}</strong>. In your payout cycle,
              you receive the pot of <strong>{money(result.potPerCycle, currency)}</strong>.
              After your turn, you continue contributing{' '}
              <strong>{money(result.remainingAfterTurn, currency)}</strong> so every member also
              receives their turn.
            </p>
          </div>

          <div className="simulatorMessageGrid">
            <div>
              <strong>Interest-free</strong>
              <span>Your group charges no interest.</span>
            </div>
            <div>
              <strong>Decentralized</strong>
              <span>You are not dependent on one bank or one organizer.</span>
            </div>
            <div>
              <strong>Network growth</strong>
              <span>The stronger your trusted network, the more useful Rota becomes.</span>
            </div>
          </div>
        </section>
      </div>

      <section className="card wide simulatorTimeline">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Payout timeline</p>
            <h2>One person receives the pot each cycle</h2>
          </div>
          <span className="status confirmed">
            {result.safePeople} cycles · {money(result.potPerCycle, currency)} each
          </span>
        </div>

        <div className="timelineRows">
          {result.timeline.map(item => (
            <div key={item.cycle} className={item.isMyTurn ? 'timelineRow myTurn' : 'timelineRow'}>
              <div className="timelineNumber">
                <span>Cycle</span>
                <strong>{item.cycle}</strong>
              </div>

              <div className="timelineInfo">
                <strong>{item.label}</strong>
                <span>
                  {item.isMyTurn
                    ? `You receive ${money(result.potPerCycle, currency)}`
                    : `You contribute ${money(result.safeContribution, currency)}`}
                </span>
              </div>

              <div className="timelineBarWrap">
                <div className="timelineBar">
                  <i
                    className={item.cashFlow >= 0 ? 'positive' : 'negative'}
                    style={{
                      width: `${Math.max(8, (Math.abs(item.cashFlow) / maxBar) * 100)}%`,
                    }}
                  />
                </div>
                <strong className={item.cashFlow >= 0 ? 'positiveText' : 'negativeText'}>
                  {item.cashFlow >= 0 ? '+' : '-'}
                  {money(Math.abs(item.cashFlow), currency)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}