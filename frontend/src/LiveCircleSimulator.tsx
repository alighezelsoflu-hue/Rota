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

function periodPlural(frequency: Frequency) {
  return frequency === 'weekly' ? 'weeks' : 'months'
}

export default function LiveCircleSimulator() {
  const [people, setPeople] = useState(10)
  const [contribution, setContribution] = useState(100)
  const [currency, setCurrency] = useState('EUR')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [payoutPosition, setPayoutPosition] = useState(4)

  const result = useMemo(() => {
    const safePeople = clamp(people, 2, 40)
    const safeContribution = Math.max(1, contribution)
    const safePosition = clamp(payoutPosition, 1, safePeople)

    const potPerCycle = safePeople * safeContribution
    const fullRotationContribution = safePeople * safeContribution
    const paidBeforeTurn = (safePosition - 1) * safeContribution
    const remainingAfterTurn = (safePeople - safePosition) * safeContribution
    const netPayoutCycle = potPerCycle - safeContribution
    const interestCharged = 0

    const timeline = Array.from({ length: safePeople }).map((_, index) => {
      const cycle = index + 1
      const isMyTurn = cycle === safePosition
      return {
        cycle,
        label: isMyTurn ? 'You receive the pot' : `You contribute`,
        isMyTurn,
        cashFlow: isMyTurn ? netPayoutCycle : -safeContribution,
        totalPaidSoFar: Math.min(cycle, safePeople) * safeContribution,
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
      interestCharged,
      timeline,
    }
  }, [people, contribution, payoutPosition])

  const maxBar = Math.max(
    result.potPerCycle,
    ...result.timeline.map(item => Math.abs(item.cashFlow)),
  )

  const payoutPercent = (result.safePosition / result.safePeople) * 100
  const ringCircumference = 2 * Math.PI * 74
  const ringOffset = ringCircumference - (payoutPercent / 100) * ringCircumference

  return (
    <section className="simulatorPageV2">
      <section className="simulatorHeroV2">
        <div>
          <p className="eyebrow">Live circle simulator</p>
          <h1>See how a circle turns small contributions into one large pot.</h1>
          <p>
            Adjust people, contribution amount, frequency, and your payout position.
            Rota shows the pot size, your turn, and the full interest-free timeline.
          </p>
        </div>

        <div className="simulatorHeroBadges">
          <div>
            <strong>{money(result.potPerCycle, currency)}</strong>
            <span>pot every cycle</span>
          </div>
          <div>
            <strong>0%</strong>
            <span>group interest</span>
          </div>
        </div>
      </section>

      <div className="simulatorGridV2">
        <aside className="simulatorControlPanelV2">
          <p className="eyebrow">Build your scenario</p>
          <h2>Circle inputs</h2>

          <label>
            People in the circle
            <div className="rangeRow">
              <input
                type="range"
                min="2"
                max="40"
                value={result.safePeople}
                onChange={event => {
                  const next = Number(event.target.value)
                  setPeople(next)
                  setPayoutPosition(prev => clamp(prev, 1, next))
                }}
              />
              <strong>{result.safePeople}</strong>
            </div>
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
            <div className="rangeRow">
              <input
                type="range"
                min="1"
                max={result.safePeople}
                value={result.safePosition}
                onChange={event => setPayoutPosition(Number(event.target.value))}
              />
              <strong>{result.safePosition}</strong>
            </div>
          </label>

          <div className="formulaCardV2">
            <span>Formula</span>
            <strong>
              {result.safePeople} × {money(result.safeContribution, currency)}
            </strong>
            <em>= {money(result.potPerCycle, currency)} per cycle</em>
          </div>
        </aside>

        <section className="simulatorVisualPanelV2">
          <div className="circleVisualCard">
            <div className="circleRingWrap">
              <svg viewBox="0 0 180 180" className="circleRing">
                <circle cx="90" cy="90" r="74" className="ringTrack" />
                <circle
                  cx="90"
                  cy="90"
                  r="74"
                  className="ringProgress"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className="ringCenter">
                <span>Your turn</span>
                <strong>{result.safePosition}</strong>
                <small>of {result.safePeople}</small>
              </div>
            </div>

            <div className="circleVisualText">
              <p className="eyebrow">Your payout moment</p>
              <h2>You receive {money(result.potPerCycle, currency)} in cycle {result.safePosition}.</h2>
              <p>
                Before your turn you contribute{' '}
                <strong>{money(result.paidBeforeTurn, currency)}</strong>.
                After your turn you continue contributing{' '}
                <strong>{money(result.remainingAfterTurn, currency)}</strong> so everyone receives.
              </p>
            </div>
          </div>

          <div className="simulatorResultCardsV2">
            <div>
              <span>Each person pays</span>
              <strong>{money(result.safeContribution, currency)}</strong>
              <small>every {periodLabel(frequency)}</small>
            </div>
            <div>
              <span>Pot per cycle</span>
              <strong>{money(result.potPerCycle, currency)}</strong>
              <small>one person receives each cycle</small>
            </div>
            <div>
              <span>Full rotation</span>
              <strong>{result.safePeople}</strong>
              <small>{periodPlural(frequency)}</small>
            </div>
            <div>
              <span>Interest charged</span>
              <strong>{money(result.interestCharged, currency)}</strong>
              <small>your group charges no interest</small>
            </div>
          </div>

          <div className="moneyFlowStory">
            <div>
              <span className="storyDot pay" />
              <strong>Small repeated contribution</strong>
              <p>You pay {money(result.safeContribution, currency)} every {periodLabel(frequency)}.</p>
            </div>
            <div>
              <span className="storyDot pot" />
              <strong>One large pot</strong>
              <p>Each cycle creates {money(result.potPerCycle, currency)}.</p>
            </div>
            <div>
              <span className="storyDot zero" />
              <strong>No group interest</strong>
              <p>The circle coordinates support. It does not create a bank loan.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="timelineCardV2">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Cash-flow timeline</p>
            <h2>What happens across the full rotation</h2>
          </div>
          <span className="status confirmed">
            {result.safePeople} cycles · {money(result.potPerCycle, currency)} pot
          </span>
        </div>

        <div className="cashFlowChartV2">
          {result.timeline.map(item => (
            <div key={item.cycle} className={item.isMyTurn ? 'cashFlowColumn yourCycle' : 'cashFlowColumn'}>
              <div className="cashFlowAmount">
                {item.cashFlow >= 0 ? '+' : '-'}
                {money(Math.abs(item.cashFlow), currency)}
              </div>
              <div className="cashFlowBarArea">
                <span
                  className={item.cashFlow >= 0 ? 'positive' : 'negative'}
                  style={{
                    height: `${Math.max(12, (Math.abs(item.cashFlow) / maxBar) * 160)}px`,
                  }}
                />
              </div>
              <strong>{item.cycle}</strong>
              <small>{item.isMyTurn ? 'Your pot' : 'Pay'}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}