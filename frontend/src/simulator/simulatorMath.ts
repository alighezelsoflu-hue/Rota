export type SimulatorFrequency = 'weekly' | 'monthly'

export type SimulatorInput = {
  memberCount: number
  contributionAmount: number
  currency: string
  frequency: SimulatorFrequency
  memberNames: string[]
  payoutOrder: number[]
  startDateISO: string
}

export type SimulatorMember = {
  id: number
  name: string
  receivesCycle: number
  receivesDateLabel: string
  totalPaid: number
  totalReceived: number
  finalNet: number
  peakNet: number
  lowestNetBeforePayout: number
  timingLabel: string
}

export type SimulatorCycle = {
  cycleNumber: number
  receiverId: number
  receiverName: string
  dateLabel: string
  potAmount: number
  contributionAmount: number
  memberCount: number
}

export type NetPoint = {
  cycleNumber: number
  value: number
}

export type NetSeries = {
  memberId: number
  memberName: string
  receivesCycle: number
  points: NetPoint[]
}

export type SimulationResult = {
  input: SimulatorInput
  potAmount: number
  totalRotationValue: number
  totalContributionPerMember: number
  cycleCount: number
  durationLabel: string
  cycles: SimulatorCycle[]
  members: SimulatorMember[]
  netSeries: NetSeries[]
  warnings: string[]
}

export function clampMemberCount(value: number) {
  return Math.min(50, Math.max(2, Math.floor(value || 2)))
}

export function cleanCurrency(value: string) {
  return (value || 'EUR').trim().toUpperCase().slice(0, 8) || 'EUR'
}

export function money(value: number, currency: string) {
  const rounded = Number.isFinite(value) ? value : 0

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cleanCurrency(currency),
      maximumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    }).format(rounded)
  } catch {
    return `${rounded.toLocaleString()} ${cleanCurrency(currency)}`
  }
}

export function defaultMemberNames(memberCount: number) {
  return Array.from({ length: memberCount }, (_, index) => `Member ${index + 1}`)
}

export function normalizeNames(names: string[], memberCount: number) {
  const defaults = defaultMemberNames(memberCount)

  return Array.from({ length: memberCount }, (_, index) => {
    const value = names[index]?.trim()
    return value || defaults[index]
  })
}

export function normalizeOrder(order: number[], memberCount: number) {
  const allowed = new Set(Array.from({ length: memberCount }, (_, index) => index))
  const clean: number[] = []

  for (const item of order) {
    if (allowed.has(item) && !clean.includes(item)) {
      clean.push(item)
    }
  }

  for (let index = 0; index < memberCount; index += 1) {
    if (!clean.includes(index)) clean.push(index)
  }

  return clean.slice(0, memberCount)
}

function addCycleDate(startDateISO: string, frequency: SimulatorFrequency, offset: number) {
  const date = startDateISO ? new Date(startDateISO) : new Date()

  if (Number.isNaN(date.getTime())) {
    return new Date()
  }

  if (frequency === 'weekly') {
    date.setDate(date.getDate() + offset * 7)
  } else {
    date.setMonth(date.getMonth() + offset)
  }

  return date
}

export function formatCycleDate(startDateISO: string, frequency: SimulatorFrequency, cycleIndex: number) {
  const date = addCycleDate(startDateISO, frequency, cycleIndex)

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function durationLabel(memberCount: number, frequency: SimulatorFrequency) {
  if (frequency === 'weekly') {
    if (memberCount === 1) return '1 week'
    if (memberCount < 8) return `${memberCount} weeks`
    const months = Math.round((memberCount / 4.345) * 10) / 10
    return `${memberCount} weeks · about ${months} months`
  }

  if (memberCount === 1) return '1 month'
  if (memberCount < 12) return `${memberCount} months`
  const years = Math.round((memberCount / 12) * 10) / 10
  return `${memberCount} months · about ${years} years`
}

export function timingLabel(receivesCycle: number, memberCount: number) {
  if (receivesCycle === 1) return 'Earliest liquidity'
  if (receivesCycle === memberCount) return 'Last receiver'
  if (receivesCycle <= Math.ceil(memberCount / 3)) return 'Early receiver'
  if (receivesCycle >= Math.ceil(memberCount * 0.7)) return 'Late receiver'
  return 'Middle receiver'
}

export function simulateCircle(input: SimulatorInput): SimulationResult {
  const memberCount = clampMemberCount(input.memberCount)
  const contributionAmount = Math.max(0, Number(input.contributionAmount) || 0)
  const currency = cleanCurrency(input.currency)
  const frequency = input.frequency || 'monthly'
  const memberNames = normalizeNames(input.memberNames, memberCount)
  const payoutOrder = normalizeOrder(input.payoutOrder, memberCount)

  const potAmount = contributionAmount * memberCount
  const totalRotationValue = potAmount * memberCount
  const totalContributionPerMember = contributionAmount * memberCount

  const cycles: SimulatorCycle[] = payoutOrder.map((receiverId, index) => ({
    cycleNumber: index + 1,
    receiverId,
    receiverName: memberNames[receiverId],
    dateLabel: formatCycleDate(input.startDateISO, frequency, index),
    potAmount,
    contributionAmount,
    memberCount,
  }))

  const netSeries: NetSeries[] = memberNames.map((memberName, memberId) => {
    const receivesCycle = payoutOrder.indexOf(memberId) + 1
    const points: NetPoint[] = [{ cycleNumber: 0, value: 0 }]

    for (let cycle = 1; cycle <= memberCount; cycle += 1) {
      const totalPaidSoFar = contributionAmount * cycle
      const totalReceivedSoFar = cycle >= receivesCycle ? potAmount : 0

      points.push({
        cycleNumber: cycle,
        value: totalReceivedSoFar - totalPaidSoFar,
      })
    }

    return {
      memberId,
      memberName,
      receivesCycle,
      points,
    }
  })

  const members: SimulatorMember[] = memberNames.map((name, memberId) => {
    const receivesCycle = payoutOrder.indexOf(memberId) + 1
    const series = netSeries.find(item => item.memberId === memberId)
    const values = series?.points.map(point => point.value) || [0]

    return {
      id: memberId,
      name,
      receivesCycle,
      receivesDateLabel: formatCycleDate(input.startDateISO, frequency, receivesCycle - 1),
      totalPaid: totalContributionPerMember,
      totalReceived: potAmount,
      finalNet: potAmount - totalContributionPerMember,
      peakNet: Math.max(...values),
      lowestNetBeforePayout: -(receivesCycle - 1) * contributionAmount,
      timingLabel: timingLabel(receivesCycle, memberCount),
    }
  })

  const warnings: string[] = []

  if (memberCount < 2) warnings.push('A circle needs at least 2 members.')
  if (contributionAmount <= 0) warnings.push('Contribution amount must be greater than 0.')
  if (memberCount > 20) warnings.push('Large circles take longer to complete. Consider smaller trusted circles first.')

  return {
    input: {
      memberCount,
      contributionAmount,
      currency,
      frequency,
      memberNames,
      payoutOrder,
      startDateISO: input.startDateISO,
    },
    potAmount,
    totalRotationValue,
    totalContributionPerMember,
    cycleCount: memberCount,
    durationLabel: durationLabel(memberCount, frequency),
    cycles,
    members,
    netSeries,
    warnings,
  }
}