import { getSlotCoverageKey, staffMembers } from './demo'
import type { Assignment, DaySample, ScheduleStatus, ShiftPreference, StaffAvailabilityState } from '../types'

const storageKey = 'shift-management-demo-state'
const currentVersion = 3

export interface PersistedDemoState {
  availabilityByStaff: Record<string, StaffAvailabilityState>
  assignments: Assignment[]
  scheduleStatus: ScheduleStatus
  requiredByCoverage: Record<string, number>
  staffId: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isChoiceArray(value: unknown, expectedLength: number): value is StaffAvailabilityState['values'] {
  return Array.isArray(value)
    && value.length === expectedLength
    && value.every((choice) => choice === 'available' || choice === 'unavailable' || choice === null)
}

function isPreferenceArray(value: unknown, expectedLength: number): value is StaffAvailabilityState['preferredRoles'] {
  return Array.isArray(value)
    && value.length === expectedLength
    && value.every((preference) => preference === 'reception' || preference === 'treatment' || preference === 'either' || preference === null)
}

function preferencesMatchCapabilities(values: StaffAvailabilityState['values'], preferences: StaffAvailabilityState['preferredRoles'], roleIds: string[]): boolean {
  return values.every((choice, index) => {
    const preference = preferences[index]
    if (choice !== 'available') return preference === null
    if (preference === null) return true
    if (preference === 'either') return roleIds.length > 1
    return roleIds.includes(preference)
  })
}

function isValidState(value: unknown, days: DaySample[]): value is PersistedDemoState {
  if (!isRecord(value)) return false
  if (value.scheduleStatus !== 'draft' && value.scheduleStatus !== 'published') return false
  if (typeof value.staffId !== 'string' || !staffMembers.some((staff) => staff.id === value.staffId)) return false
  if (!isRecord(value.availabilityByStaff) || !Array.isArray(value.assignments) || !isRecord(value.requiredByCoverage)) return false
  if (Object.keys(value.availabilityByStaff).length !== staffMembers.length) return false

  const expectedValueCount = days.length * 2
  for (const staff of staffMembers) {
    const availability = (value.availabilityByStaff as Record<string, unknown>)[staff.id]
    if (!isRecord(availability)) return false
    if (!isChoiceArray(availability.values, expectedValueCount)) return false
    if (!isPreferenceArray(availability.preferredRoles, expectedValueCount)) return false
    if (!preferencesMatchCapabilities(availability.values, availability.preferredRoles, staff.roleIds)) return false
    if (availability.submitted !== true && availability.submitted !== false) return false
    if (availability.submittedValues !== null && !isChoiceArray(availability.submittedValues, expectedValueCount)) return false
    if (availability.submittedPreferredRoles !== null && !isPreferenceArray(availability.submittedPreferredRoles, expectedValueCount)) return false
    if (availability.submitted) {
      if (availability.submittedValues === null || availability.submittedPreferredRoles === null || typeof availability.submittedAt !== 'string') return false
      if (!preferencesMatchCapabilities(availability.submittedValues, availability.submittedPreferredRoles, staff.roleIds)) return false
    } else if (availability.submittedValues !== null || availability.submittedPreferredRoles !== null || availability.submittedAt !== null) return false
  }

  const expectedKeys = new Set<string>()
  days.forEach((day) => day.slots.forEach((slot) => slot.coverage.forEach((coverage) => {
    expectedKeys.add(getSlotCoverageKey(day, slot.id, coverage.roleId))
  })))
  for (const key of expectedKeys) {
    const required = value.requiredByCoverage[key]
    if (typeof required !== 'number' || !Number.isInteger(required) || required < 0) return false
  }
  if (Object.keys(value.requiredByCoverage).some((key) => !expectedKeys.has(key))) return false

  const assignmentKeys = new Set<string>()
  const occupiedPeople = new Set<string>()
  const assignedCountByCoverage: Record<string, number> = {}
  for (const rawAssignment of value.assignments) {
    if (!isRecord(rawAssignment)) return false
    const { date, slotId, roleId, staffId } = rawAssignment
    if (typeof date !== 'string' || typeof staffId !== 'string') return false
    if (slotId !== 'morning' && slotId !== 'afternoon') return false
    if (roleId !== 'reception' && roleId !== 'treatment') return false
    const staff = staffMembers.find((member) => member.id === staffId)
    if (!staff || !staff.roleIds.includes(roleId)) return false
    const coverageKey = `${date}:${slotId}:${roleId}`
    if (!expectedKeys.has(coverageKey)) return false
    const assignmentKey = `${coverageKey}:${staffId}`
    if (assignmentKeys.has(assignmentKey)) return false
    const occupancyKey = `${date}:${slotId}:${staffId}`
    if (occupiedPeople.has(occupancyKey)) return false
    assignmentKeys.add(assignmentKey)
    occupiedPeople.add(occupancyKey)
    assignedCountByCoverage[coverageKey] = (assignedCountByCoverage[coverageKey] ?? 0) + 1
  }

  if (value.scheduleStatus === 'published' && [...expectedKeys].some((key) => (assignedCountByCoverage[key] ?? 0) < ((value.requiredByCoverage as Record<string, number>)[key]))) return false
  return true
}

function getLegacyDefaultPreferences(values: StaffAvailabilityState['values'], roleIds: string[]): ShiftPreference[] {
  const defaultPreference: ShiftPreference = roleIds.length === 1 ? roleIds[0] as ShiftPreference : 'either'
  return values.map((choice) => choice === 'available' ? defaultPreference : null)
}

function migrateVersion2State(value: unknown, days: DaySample[]): PersistedDemoState | null {
  if (!isRecord(value) || value.scheduleStatus !== 'draft' && value.scheduleStatus !== 'published') return null
  if (typeof value.staffId !== 'string' || !staffMembers.some((staff) => staff.id === value.staffId)) return null
  if (!isRecord(value.availabilityByStaff) || !Array.isArray(value.assignments) || !isRecord(value.requiredByCoverage)) return null

  const expectedValueCount = days.length * 2
  const migratedAvailability: Record<string, StaffAvailabilityState> = {}
  for (const staff of staffMembers) {
    const legacy = value.availabilityByStaff[staff.id]
    if (!isRecord(legacy) || !isChoiceArray(legacy.values, expectedValueCount)) return null
    if (legacy.submitted !== true && legacy.submitted !== false) return null
    if (legacy.submittedValues !== null && !isChoiceArray(legacy.submittedValues, expectedValueCount)) return null
    if (legacy.submitted) {
      if (legacy.submittedValues === null || typeof legacy.submittedAt !== 'string') return null
    } else if (legacy.submittedValues !== null || legacy.submittedAt !== null) return null

    const preferredRoles = getLegacyDefaultPreferences(legacy.values, staff.roleIds)
    const submittedValues = legacy.submittedValues as StaffAvailabilityState['submittedValues']
    migratedAvailability[staff.id] = {
      values: legacy.values,
      preferredRoles,
      submittedValues,
      submittedPreferredRoles: legacy.submitted
        ? getLegacyDefaultPreferences(submittedValues ?? [], staff.roleIds)
        : null,
      submitted: legacy.submitted,
      submittedAt: legacy.submittedAt as string | null,
    }
  }

  const migrated: PersistedDemoState = {
    availabilityByStaff: migratedAvailability,
    assignments: value.assignments as Assignment[],
    scheduleStatus: value.scheduleStatus,
    requiredByCoverage: value.requiredByCoverage as Record<string, number>,
    staffId: value.staffId,
  }
  return isValidState(migrated, days) ? migrated : null
}

export function loadDemoState(days: DaySample[], createInitialState: () => PersistedDemoState): PersistedDemoState {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (raw === null) return createInitialState()

    const saved: unknown = JSON.parse(raw)
    if (!isRecord(saved)) return createInitialState()
    if (saved.version === currentVersion && isValidState(saved.data, days)) return saved.data
    if (saved.version === 2) return migrateVersion2State(saved.data, days) ?? createInitialState()
    return createInitialState()
  } catch {
    return createInitialState()
  }
}

export function saveDemoState(state: PersistedDemoState): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ version: currentVersion, data: state }))
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}
