export type Role = 'admin' | 'staff'

export type ScreenId =
  | 'admin-week'
  | 'admin-slot'
  | 'admin-published'
  | 'staff-availability'
  | 'staff-confirmed'

export type AvailabilityChoice = 'available' | 'unavailable' | null
export type ShiftPreference = RoleId | 'either' | null
export type ScheduleStatus = 'draft' | 'published'
export type RoleId = 'reception' | 'treatment'
export type SlotId = 'morning' | 'afternoon'

export interface Assignment {
  date: string
  slotId: SlotId
  roleId: RoleId
  staffId: string
}

export interface StaffAvailabilityState {
  values: AvailabilityChoice[]
  preferredRoles: ShiftPreference[]
  submittedValues: AvailabilityChoice[] | null
  submittedPreferredRoles: ShiftPreference[] | null
  submitted: boolean
  submittedAt: string | null
}

export interface StaffMember {
  id: string
  name: string
  roleIds: RoleId[]
}

export interface CoverageSample {
  roleId: RoleId
  roleName: string
  required: number
}

export interface ShiftSlotSample {
  id: 'morning' | 'afternoon'
  label: string
  coverage: CoverageSample[]
}

export interface DaySample {
  date: Date
  weekday: string
  slots: ShiftSlotSample[]
}
