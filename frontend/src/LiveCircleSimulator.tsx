import { useMemo, useState } from 'react'

type Frequency = 'weekly' | 'monthly'

const DEFAULT_NAMES = [
  'Ali',
  'Sara',
  'David',
  'Mina',
  'Omar',
  'Lina',
  'Reza',
  'Nora',
  'Sam',
  'Leila',
  'Amir',
  'Ava',
  'Yasmin',
  'Daniel',
  'Nika',
  'Sofia',
  'Arman',
  'Maya',
  'Noah',
  'Tara',
]

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

function periodTitle(frequency: Frequency) {
  return frequency === 'weekly' ? 'Week' : 'Month'
}

function periodPlural(frequency: Frequency) {
  return frequency === 'weekly' ? 'weeks' : 'months'
}

function defaultName(index: number) {
  return DEFAULT_NAMES[index] || `Member ${index + 1}`
}

export default function LiveCircleSimulator() {
  const [people, setPeople] = useState(10)
  const [contribution, setContribution] = useState(100)
  const [currency, setCurrency] = useState('EUR')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [selectedCycle, setSelectedCycle] = useState(1)

  const [names, setNames] = useState<string[]>(
    Array.from({ length: 10 }).map((_, index) => defaultName(index)),
  )

  const [order, setOrder] = useState<number[]>(
    Array.from({ length: 10 }).map((_, index) => index),
  )

  function updatePeople(nextPeople: number) {
    const safePeople = clamp(nextPeople, 2, 30)

    setPeople(safePeople)
    setSelectedCycle(current => clamp(current, 1, safePeople))

    setNames(current =>
      Array.from({ length: safePeople }).map((_, index) => current[index] || defaultName(index)),
    )

    setOrder(current => {
      const validExisting = current.filter(index => index < safePeople)
      const missing = Array.from({ length: safePeople })
        .map((_, index) => index)
        .filter(index => !validExisting.includes(index))

      return [...validExisting, ...missing].slice(0, safePeople)
    })
  }

  function updateName(index: number, value: string) {
    setNames(current => current.map((name, i) => (i === index ? value : name)))
  }

  function updateReceiverForCycle(cycleIndex: number, receiverIndex: number) {
    setOrder(current => {
      const next = [...current]
      const existingCycle = next.findIndex(value => value === receiverIndex)

      if (existingCycle >= 0) {
        const oldReceiver = next[cycleIndex]
        next[existingCycle] = oldReceiver
      }

      next[cycleIndex] = receiverIndex
      return next
    })
  }

  function resetOrder() {
    setOrder(Array.from({ length: people }).map((_, index) => index))
    setSelectedCycle(1)
  }

  function reverseOrder() {
    setOrder(current => [...current].reverse())
    setSelectedCycle(1)
  }

  const result = useMemo(() => {
    const safePeople = clamp(people, 2, 30)
    const safeContribution = Math.max(1, contribution || 1)
    const safeSelectedCycle = clamp(selectedCycle, 1, safePeople)

    const potPerCycle = safePeople * safeContribution
    const fullRotationContribution = safePeople * safeContribution
    const totalCircleVolume = potPerCycle * safePeople
    const selectedReceiverIndex = order[safeSelectedCycle - 1] ?? 0
    const selectedReceiverName = names[selectedReceiverIndex] || defaultName(selectedReceiverIndex)

    const timeline = Array.from({ length: safePeople }).map((_, index) => {
      const cycle = index + 1
      const receiverIndex = order[index] ?? index
      const receiverName = names[receiverIndex] || defaultName(receiverIndex)
      const isSelected = cycle === safeSelectedCycle

      return {
        cycle,
        receiverIndex,
        receiverName,
        isSelected,
        pot: potPerCycle,
      }
    })

    return {
      safePeople,
      safeContribution,
      safeSelectedCycle,
      potPerCycle,
      fullRotationContribution,
      totalCircleVolume,
      selectedReceiverIndex,
      selectedReceiverName,
      timeline,
    }
  }, [people, contribution, selectedCycle, order, names])

  const payoutPercent = (result.safeSelectedCycle / result.safePeople) * 100
  const ringCircumference = 2 * Math.PI * 74
  const ringOffset = ringCircumference - (payoutPercent / 100) * ringCircumference

  return (
    <section className="simulatorPageV2">
      <section className="simulatorHeroV2">
        <div>
          <p className="eyebrow">Live circle simulator</p>
          <h1>
            {result.safePeople} people pay {money(result.safeContribution, currency)} each per{' '}
            {periodLabel(frequency)}. One person receives{' '}
            {money(result.potPerCycle, currency)} each cycle.
          </h1>
          <p>
            Choose the payout order, select who receives in each {periodLabel(frequency)}, and show
            the group how a 0% interest circle works before they create it.
          </p>
        </div>

        <div className="simulatorHeroBadges">
          <div>
            <strong>{money(result.potPerCycle, currency)}</strong>
            <span>pot each {periodLabel(frequency)}</span>
          </div>
          <div>
            <strong>0%</strong>
            <span>group interest</span>
          </div>
        </div>
      </section>

      <div className="simulatorGridV2">
        <aside className="simulatorControlPanelV2">
          <p className="eyebrow">Build your circle</p>
          <h2>Inputs</h2>

          <label>
            People in the circle
            <div className="rangeRow">
              <input
                type="range"
                min="2"
                max="30"
                value={result.safePeople}
                onChange={event => updatePeople(Number(event.target.value))}
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
            Preview cycle
            <div className="rangeRow">
              <input
                type="range"
                min="1"
                max={result.safePeople}
                value={result.safeSelectedCycle}
                onChange={event => setSelectedCycle(Number(event.target.value))}
              />
              <strong>{result.safeSelectedCycle}</strong>
            </div>
          </label>

          <div className="formulaCardV2">
            <span>Formula</span>
            <strong>
              {result.safePeople} × {money(result.safeContribution, currency)}
            </strong>
            <em>= {money(result.potPerCycle, currency)} pot each {periodLabel(frequency)}</em>
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
                <span>{periodTitle(frequency)}</span>
                <strong>{result.safeSelectedCycle}</strong>
                <small>of {result.safePeople}</small>
              </div>
            </div>

            <div className="circleVisualText">
              <p className="eyebrow">Selected payout</p>
              <h2>
                {result.selectedReceiverName} receives {money(result.potPerCycle, currency)} in{' '}
                {periodLabel(frequency)} {result.safeSelectedCycle}.
              </h2>
              <p>
                Every member contributes{' '}
                <strong>{money(result.safeContribution, currency)}</strong>. The selected receiver
                gets the full pot of <strong>{money(result.potPerCycle, currency)}</strong>. Rota
                charges <strong>{money(0, currency)}</strong> interest and does not hold the money.
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
              <span>Total circle volume</span>
              <strong>{money(result.totalCircleVolume, currency)}</strong>
              <small>across full rotation</small>
            </div>
          </div>

          <div className="moneyFlowStory">
            <div>
              <span className="storyDot pay" />
              <strong>Small repeated payment</strong>
              <p>
                Each person pays {money(result.safeContribution, currency)} every{' '}
                {periodLabel(frequency)}.
              </p>
            </div>

            <div>
              <span className="storyDot pot" />
              <strong>One person gets the pot</strong>
              <p>
                The selected receiver gets {money(result.potPerCycle, currency)} in their cycle.
              </p>
            </div>

            <div>
              <span className="storyDot zero" />
              <strong>0% interest</strong>
              <p>No bank loan, no platform wallet, no group interest. Members pay directly.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="timelineCardV2">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Payout order</p>
            <h2>Select who receives the pot in each {periodLabel(frequency)}</h2>
          </div>

          <div className="actions noMargin">
            <button className="button secondary" type="button" onClick={resetOrder}>
              Reset order
            </button>
            <button className="button secondary" type="button" onClick={reverseOrder}>
              Reverse order
            </button>
          </div>
        </div>

        <div className="payoutOrderGrid">
          {result.timeline.map(item => (
            <div
              key={item.cycle}
              className={item.isSelected ? 'payoutOrderCard selected' : 'payoutOrderCard'}
              onClick={() => setSelectedCycle(item.cycle)}
            >
              <div className="payoutOrderCycle">
                <span>{periodTitle(frequency)}</span>
                <strong>{item.cycle}</strong>
              </div>

              <label>
                Receiver
                <select
                  value={item.receiverIndex}
                  onChange={event => updateReceiverForCycle(item.cycle - 1, Number(event.target.value))}
                  onClick={event => event.stopPropagation()}
                >
                  {names.slice(0, result.safePeople).map((name, index) => (
                    <option key={index} value={index}>
                      {name || defaultName(index)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="payoutAmountPill">
                {money(result.potPerCycle, currency)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="timelineCardV2">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Member names</p>
            <h2>Name the people in the circle</h2>
          </div>
          <span className="status confirmed">
            {result.safePeople} people · {money(result.potPerCycle, currency)} pot
          </span>
        </div>

        <div className="memberNameGrid">
          {names.slice(0, result.safePeople).map((name, index) => (
            <label key={index}>
              Member {index + 1}
              <input
                value={name}
                onChange={event => updateName(index, event.target.value)}
                placeholder={`Member ${index + 1}`}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="timelineCardV2">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Visual timeline</p>
            <h2>Each cycle creates the same pot</h2>
          </div>

          <span className="status confirmed">
            {result.safePeople} cycles · {money(result.potPerCycle, currency)} each
          </span>
        </div>

        <div className="cashFlowChartV2">
          {result.timeline.map(item => (
            <div
              key={item.cycle}
              className={item.isSelected ? 'cashFlowColumn yourCycle' : 'cashFlowColumn'}
              onClick={() => setSelectedCycle(item.cycle)}
            >
              <div className="cashFlowAmount">
                {money(item.pot, currency)}
              </div>

              <div className="cashFlowBarArea">
                <span className="positive" style={{ height: '160px' }} />
              </div>

              <strong>{item.cycle}</strong>
              <small>{item.receiverName}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}