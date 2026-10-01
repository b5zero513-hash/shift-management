import type { Assignment, AvailabilityChoice, CoverageSample, DaySample, RoleId, ShiftPreference, ShiftSlotSample, StaffMember } from '../types'

export const staffMembers: StaffMember[] = [
  { id: 'staff-1', name: '佐藤 はるか', roleIds: ['reception', 'treatment'] },
  { id: 'staff-2', name: '鈴木 みな', roleIds: ['reception', 'treatment'] },
  { id: 'staff-3', name: '田中 りょう', roleIds: ['treatment'] },
  { id: 'staff-4', name: '高橋 あおい', roleIds: ['reception', 'treatment'] },
  { id: 'staff-5', name: '伊藤 さくら', roleIds: ['treatment'] },
  { id: 'staff-6', name: '渡辺 ゆう', roleIds: ['reception', 'treatment'] },
  { id: 'staff-7', name: '山本 りな', roleIds: ['treatment'] },
  { id: 'staff-8', name: '中村 けん', roleIds: ['reception'] },
]

const completeCoverage: CoverageSample[] = [
  { roleId: 'reception', roleName: '受付', required: 2 },
  { roleId: 'treatment', roleName: '施術', required: 2 },
]

const weekCoverage: CoverageSample[][][] = [
  [completeCoverage, completeCoverage],
  [completeCoverage, completeCoverage],
  [completeCoverage, completeCoverage],
  [completeCoverage, completeCoverage],
  [completeCoverage, completeCoverage],
  [completeCoverage, [completeCoverage[0], { roleId: 'treatment', roleName: '施術', required: 2 }]],
  [completeCoverage, completeCoverage],
]

function nextMonday(from: Date): Date {
  const date = new Date(from)
  date.setHours(0, 0, 0, 0)
  const offset = (8 - date.getDay()) % 7 || 7
  date.setDate(date.getDate() + offset)
  return date
}

export function createDemoWeek(from = new Date()): DaySample[] {
  const monday = nextMonday(from)
  const weekdays = ['月', '火', '水', '木', '金', '土', '日']

  return weekdays.map((weekday, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const [morningCoverage, afternoonCoverage] = weekCoverage[index]
    const slots: ShiftSlotSample[] = [
      { id: 'morning', label: '午前', coverage: morningCoverage },
      { id: 'afternoon', label: '午後', coverage: afternoonCoverage },
    ]
    return { date, weekday, slots }
  })
}

export function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function formatWeekRange(days: DaySample[]): string {
  const first = days[0]
  const last = days[days.length - 1]
  if (!first || !last) return ''
  return `${formatDate(first.date)}(${first.weekday})〜${formatDate(last.date)}(${last.weekday})`
}

export function getSlotCoverageKey(day: DaySample, slotId: string, roleId: string): string {
  return `${getDateKey(day.date)}:${slotId}:${roleId}`
}

export function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const allAvailable = (): AvailabilityChoice[] => Array.from({ length: 14 }, () => 'available')

export const sampleAvailability: Record<string, AvailabilityChoice[]> = {
  'staff-1': allAvailable(),
  'staff-2': allAvailable(),
  'staff-3': allAvailable(),
  'staff-4': Array.from({ length: 14 }, (_, index) => [2, 7, 12].includes(index) ? 'unavailable' : 'available'),
  'staff-5': allAvailable(),
  'staff-6': Array.from({ length: 14 }, (_, index) => [4, 9].includes(index) ? 'unavailable' : 'available'),
}

const preferenceForAvailableSlots = (availability: AvailabilityChoice[], preference: Exclude<ShiftPreference, null>): ShiftPreference[] =>
  availability.map((choice) => choice === 'available' ? preference : null)

export const samplePreferredRoles: Record<string, ShiftPreference[]> = {
  'staff-1': preferenceForAvailableSlots(sampleAvailability['staff-1'], 'reception'),
  'staff-2': preferenceForAvailableSlots(sampleAvailability['staff-2'], 'reception'),
  'staff-3': preferenceForAvailableSlots(sampleAvailability['staff-3'], 'treatment'),
  'staff-4': preferenceForAvailableSlots(sampleAvailability['staff-4'], 'treatment'),
  'staff-5': preferenceForAvailableSlots(sampleAvailability['staff-5'], 'treatment'),
  'staff-6': preferenceForAvailableSlots(sampleAvailability['staff-6'], 'either'),
}

export const sampleSubmittedStaffIds = ['staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5', 'staff-6']

const sampleAssignmentGroups: Array<{ dayOffset: number; slotId: 'morning' | 'afternoon'; roleId: RoleId; staffIds: string[] }> = [
  { dayOffset: 0, slotId: 'morning', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 0, slotId: 'morning', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
  { dayOffset: 0, slotId: 'afternoon', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 0, slotId: 'afternoon', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
  { dayOffset: 1, slotId: 'morning', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 1, slotId: 'morning', roleId: 'treatment', staffIds: ['staff-3', 'staff-5'] },
  { dayOffset: 1, slotId: 'afternoon', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 1, slotId: 'afternoon', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
  { dayOffset: 2, slotId: 'morning', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 2, slotId: 'morning', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
  { dayOffset: 2, slotId: 'afternoon', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 2, slotId: 'afternoon', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
  { dayOffset: 3, slotId: 'morning', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 3, slotId: 'morning', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
  { dayOffset: 3, slotId: 'afternoon', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 3, slotId: 'afternoon', roleId: 'treatment', staffIds: ['staff-3', 'staff-5'] },
  { dayOffset: 4, slotId: 'morning', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 4, slotId: 'morning', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
  { dayOffset: 4, slotId: 'afternoon', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 4, slotId: 'afternoon', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
  { dayOffset: 5, slotId: 'morning', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 5, slotId: 'morning', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
  { dayOffset: 5, slotId: 'afternoon', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 5, slotId: 'afternoon', roleId: 'treatment', staffIds: ['staff-3'] },
  { dayOffset: 6, slotId: 'morning', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 6, slotId: 'morning', roleId: 'treatment', staffIds: ['staff-3', 'staff-5'] },
  { dayOffset: 6, slotId: 'afternoon', roleId: 'reception', staffIds: ['staff-1', 'staff-2'] },
  { dayOffset: 6, slotId: 'afternoon', roleId: 'treatment', staffIds: ['staff-3', 'staff-4'] },
]

export function createSampleAssignments(days: DaySample[]): Assignment[] {
  return sampleAssignmentGroups.flatMap(({ dayOffset, slotId, roleId, staffIds }) => {
    const date = days[dayOffset]?.date
    if (!date) return []
    return staffIds.map((staffId) => ({ date: getDateKey(date), slotId, roleId, staffId }))
  })
}
