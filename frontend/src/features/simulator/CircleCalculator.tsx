import { Link } from 'react-router-dom'
import type { GroupDetail } from '../../api/api'

type Props = {
  detail: GroupDetail
  currentUserId: string
}

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })} ${currency}`
}

function periodLabel(frequency: string) {
  return frequency === 'weekly' ? 'week' : 'month'
}

function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}

export default function CircleCalculator({ detail, currentUserId }: Props) {
  const group = detail.group
  const members = [...detail.members].sort((a, b) => a.position - b.position)

  const activeMemberCount = Math.max(1, members.length)
  const targetMemberCount = Math.max(activeMemberCount, group.member_limit || activeMemberCount)
  const contribution = Number(group.contribution_amount || 0)
  const currency = group.currency
  const period = periodLabel(group.frequency)

  const standardPot = contribution * targetMemberCount
  const activePot = contribution * activeMemberCount
  const directTransfersThisCycle = contribution * Math.max(0, activeMemberCount - 1)
  const fullRotationContribution = contribution * targetMemberCount
  const interestPaid = 0

  const currentMember = members.find(member => member.user_id === currentUserId)
  const currentUserPosition = currentMember?.position || 1

  const amountPaidBeforeTurn = contribution * Math.max(0, currentUserPosition - 1)
  const remainingAfterTurn = contribution * Math.max(0, targetMemberCount - currentUserPosition)
  const cyclesUntilTurn = Math.max(0, currentUserPosition - 1)

  const timeline = Array.from({ length: targetMemberCount }).map((_, index) => {
    const position = index + 1
    const member = members.find(m => m.position === position)
    const isCurrentUser = member?.user_id === currentUserId
    const name = member?.name || `Open seat ${position}`
    const netCashFlow = isCurrentUser ? standardPot - contribution : -contribution

    return {
      position,
      name,
      isCurrentUser,
      isOpenSeat: !member,
      netCashFlow,
    }
  })

  const maxAbsCashFlow = Math.max(
    contribution,
    ...timeline.map(item => Math.abs(item.netCashFlow)),
  )

  return (
    <section className="circleCalculator card wide">
      <div className="calculatorHeader">
        <div>
          <p className="eyebrow">Circle calculator</p>
          <h2>Understand exactly what this group does for you</h2>
          <p className="mutedText">
            See what you pay each {period}, what the circle can generate, when your turn arrives,
            and why the group remains interest-free.
          </p>
        </div>

        <div className="calculatorBadge">
          <strong>{formatMoney(interestPaid, currency)}</strong>
          <span>interest charged by group</span>
        </div>
      </div>

      <div className="calculatorMessageGrid">
        <article className="calculatorMessage interest">
          <span>0%</span>
          <h3>Interest-free</h3>
          <p>Your group charges no interest. Members support each other directly.</p>
        </article>

        <article className="calculatorMessage decentral">
          <span>◎</span>
          <h3>Decentralized</h3>
          <p>You are not dependent on one bank. You can build several trusted circles.</p>
        </article>

        <article className="calculatorMessage growth">
          <span>↗</span>
          <h3>Grow your network</h3>
          <p>The stronger your trusted network, the more useful Rota becomes.</p>
        </article>
      </div>

      <div className="calcStatsGrid">
        <div className="calcStat">
          <span>Your contribution</span>
          <strong>{formatMoney(contribution, currency)}</strong>
          <small>Every {period}</small>
        </div>

        <div className="calcStat">
          <span>Target circle pot</span>
          <strong>{formatMoney(standardPot, currency)}</strong>
          <small>{targetMemberCount} members × {formatMoney(contribution, currency)}</small>
        </div>

        <div className="calcStat">
          <span>Full rotation length</span>
          <strong>{targetMemberCount}</strong>
          <small>{titleCase(group.frequency)} cycles</small>
        </div>

        <div className="calcStat">
          <span>Total you pay</span>
          <strong>{formatMoney(fullRotationContribution, currency)}</strong>
          <small>Across the full rotation</small>
        </div>
      </div>

      <div className="calculatorExplainer">
        <div>
          <p className="eyebrow">Your position</p>
          <h3>
            {currentMember
              ? `You are position ${currentUserPosition} in this circle`
              : 'You are not positioned in this circle yet'}
          </h3>
          <p>
            Before your turn, you pay approximately{' '}
            <strong>{formatMoney(amountPaidBeforeTurn, currency)}</strong>. On your turn,
            the target pot is <strong>{formatMoney(standardPot, currency)}</strong>.
            After your turn, you continue contributing approximately{' '}
            <strong>{formatMoney(remainingAfterTurn, currency)}</strong> until everyone receives.
          </p>
        </div>

        <div className="miniCalcPanel">
          <span>Cycles until your turn</span>
          <strong>{cyclesUntilTurn}</strong>
          <small>
            Based on fixed rotation position. Open seats are included in the target circle size.
          </small>
        </div>
      </div>

      <div className="payoutTimelineBlock">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Payout timeline</p>
            <h2>Who receives the pot in each cycle</h2>
          </div>
          <span className="status confirmed">
            {activeMemberCount}/{targetMemberCount} seats filled
          </span>
        </div>

        <div className="payoutTimeline">
          {timeline.map(item => (
            <div
              key={item.position}
              className={[
                'payoutTimelineItem',
                item.isCurrentUser ? 'isYou' : '',
                item.isOpenSeat ? 'isOpenSeat' : '',
              ].join(' ')}
            >
              <div className="timelineCycle">
                <span>Cycle</span>
                <strong>{item.position}</strong>
              </div>

              <div className="timelineReceiver">
                <strong>{item.isCurrentUser ? `${item.name} — You` : item.name}</strong>
                <span>
                  {item.isOpenSeat
                    ? 'Waiting for a trusted member'
                    : `Receives target pot: ${formatMoney(standardPot, currency)}`}
                </span>
              </div>

              <div className="cashFlowVisual">
                <div className="cashFlowLabel">
                  {item.isCurrentUser ? 'Your payout cycle' : `Your ${period}ly contribution`}
                </div>
                <div className="cashFlowBar">
                  <span
                    className={item.netCashFlow >= 0 ? 'positive' : 'negative'}
                    style={{
                      width: `${Math.max(10, (Math.abs(item.netCashFlow) / maxAbsCashFlow) * 100)}%`,
                    }}
                  />
                </div>
                <strong className={item.netCashFlow >= 0 ? 'positiveText' : 'negativeText'}>
                  {item.netCashFlow >= 0 ? '+' : '-'}
                  {formatMoney(Math.abs(item.netCashFlow), currency)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="calculatorFootnote">
        <div>
          <strong>Current active circle value:</strong>{' '}
          {formatMoney(activePot, currency)} with {activeMemberCount} active member
          {activeMemberCount === 1 ? '' : 's'}.
        </div>
        <div>
          <strong>Direct transfers tracked this cycle:</strong>{' '}
          {formatMoney(directTransfersThisCycle, currency)} if one member is receiving.
        </div>
      </div>

      <div className="networkGrowthCta">
        <div>
          <p className="eyebrow">Grow carefully</p>
          <h3>Create more small trusted circles</h3>
          <p>
            Start with people you already know. Over time, your Trust Network becomes your
            strongest proof of reliability.
          </p>
        </div>
        <div className="actions noMargin">
          <Link className="button secondary" to="/network">View Trust Network</Link>
          <Link className="button" to="/groups/new">Create another circle</Link>
        </div>
      </div>
    </section>
  )
}