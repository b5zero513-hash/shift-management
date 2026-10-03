import { useEffect, useState } from 'react'
import { createDemoWeek, createSampleAssignments, formatDate, formatWeekRange, getDateKey, getSlotCoverageKey, sampleAvailability, samplePreferredRoles, sampleSubmittedStaffIds, staffMembers } from './data/demo'
import { loadDemoState, saveDemoState, type PersistedDemoState } from './data/persistence'
import type { Assignment, AvailabilityChoice, DaySample, ProductPageId, Role, RoleId, ScheduleStatus, ScreenId, ShiftPreference, SlotId, StaffAvailabilityState, StaffMember } from './types'

const week = createDemoWeek()

function AppHeader({
  role,
  staffId,
  onRoleChange,
  onStaffChange,
  onReset,
  showDemoControls,
}: {
  role: Role
  staffId: string
  onRoleChange: (role: Role) => void
  onStaffChange: (staffId: string) => void
  onReset: () => void
  showDemoControls: boolean
}) {
  return (
    <header className="app-header" id="top">
      <a className="brand" href="#top" aria-label="シフトノート ホーム">
        <span className="brand-mark" aria-hidden="true">S</span>
        <span className="brand-copy"><strong>シフトノート</strong><small>サンプルサロン</small></span>
      </a>
      <div className="product-price"><span>料金</span><strong>未定</strong></div>
      {showDemoControls && <div className="header-controls">
        <span className="demo-badge"><i aria-hidden="true" />デモ体験</span>
        <div className="role-switch" aria-label="体験する立場">
          <button type="button" className={role === 'admin' ? 'is-active' : ''} aria-pressed={role === 'admin'} onClick={() => onRoleChange('admin')}>管理者</button>
          <button type="button" className={role === 'staff' ? 'is-active' : ''} aria-pressed={role === 'staff'} onClick={() => onRoleChange('staff')}>スタッフ</button>
        </div>
        {role === 'staff' && (
          <label className="staff-select-label">
            <span className="visually-hidden">スタッフを選択</span>
            <select value={staffId} onChange={(event) => onStaffChange(event.target.value)}>
              {staffMembers.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
            </select>
          </label>
        )}
        <button type="button" className="reset-button" onClick={onReset}>
          <span aria-hidden="true">↺</span><span>最初から試す</span>
        </button>
      </div>}
    </header>
  )
}

function ScreenNavigation({ role, screen, scheduleStatus, onNavigate }: {
  role: Role
  screen: ScreenId
  scheduleStatus: ScheduleStatus
  onNavigate: (screen: ScreenId) => void
}) {
  const steps = [
    { number: '1', label: '希望を出す', active: screen === 'staff-availability' },
    { number: '2', label: '不足を埋める', active: role === 'admin' && screen !== 'admin-published' },
    { number: '3', label: '公開シフトを見る', active: screen === 'admin-published' || screen === 'staff-confirmed' },
  ]
  const pages: { id: ScreenId; label: string }[] = role === 'admin'
    ? [
      { id: 'admin-week', label: '週のシフト' },
      { id: 'admin-slot', label: '枠の詳細' },
      ...(scheduleStatus === 'published' ? [{ id: 'admin-published' as const, label: '公開シフト' }] : []),
    ]
    : [{ id: 'staff-availability', label: '希望を提出' }, { id: 'staff-confirmed', label: '確定シフト' }]

  return (
    <div className="navigation-area">
      <div className="step-track" aria-label="希望提出、不足確認、確定シフト確認">
        {steps.map((step, index) => (
          <span className="step-wrap" key={step.number}>
            {index > 0 && <span className="step-connector" aria-hidden="true" />}
            <span className={step.active ? 'step is-current' : 'step'}>
              <b>{step.number}</b><span>{step.label}</span>
            </span>
          </span>
        ))}
      </div>
      <nav className="screen-tabs" aria-label={role === 'admin' ? '管理者画面' : 'スタッフ画面'}>
        {pages.map((page) => (
          <button key={page.id} type="button" aria-current={screen === page.id ? 'page' : undefined}
            className={screen === page.id ? 'screen-tab is-active' : 'screen-tab'} onClick={() => onNavigate(page.id)}>
            {page.label}<span aria-hidden="true">{screen === page.id ? '●' : ''}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function SummaryCard({ label, value, suffix, note, variant = '' }: {
  label: string
  value: string
  suffix?: string
  note: string
  variant?: string
}) {
  const displayNote = variant === 'summary-shortage'
    ? Number(value) > 0 ? `\u3042\u3068${value}\u67a0\u306e\u4eba\u54e1\u4e0d\u8db3` : '\u5168\u3066\u306e\u67a0\u304c\u5145\u8db3\u3057\u3066\u3044\u307e\u3059'
    : note
  return (
    <article className={`summary-card ${variant}`}>
      <span className="summary-label">{label}</span>
      <strong>{value}{suffix && <span>{suffix}</span>}</strong>
      <span className="summary-note">{displayNote}</span>
    </article>
  )
}

function getAssignedStaffIds(assignments: Assignment[], day: DaySample, slotId: string, roleId: RoleId): string[] {
  const date = getDateKey(day.date)
  return assignments.filter((assignment) => assignment.date === date && assignment.slotId === slotId && assignment.roleId === roleId).map((assignment) => assignment.staffId)
}

function ProductNavigation({ page, onNavigate }: { page: ProductPageId; onNavigate: (page: ProductPageId) => void }) {
  const pages: Array<{ id: ProductPageId; label: string }> = [
    { id: 'demo', label: '動くデモ' }, { id: 'dashboard', label: 'ダッシュボード' },
    { id: 'specs', label: '仕様書' }, { id: 'diagram', label: '図解' },
  ]
  return <nav className="product-navigation" aria-label="商品ページ">
    {pages.map((item) => <button key={item.id} type="button" aria-current={page === item.id ? 'page' : undefined}
      className={page === item.id ? 'product-tab is-active' : 'product-tab'} onClick={() => onNavigate(item.id)}>{item.label}</button>)}
  </nav>
}

function getAssignedStaffNames(assignments: Assignment[], day: DaySample, slotId: string, roleId: RoleId): string[] {
  return getAssignedStaffIds(assignments, day, slotId, roleId)
    .map((id) => staffMembers.find((member) => member.id === id)?.name)
    .filter((name): name is string => name !== undefined)
}

function getCoverageNumbers(day: DaySample, slot: DaySample['slots'][number], coverage: DaySample['slots'][number]['coverage'][number], assignments: Assignment[], requiredByCoverage: Record<string, number>) {
  const roleId = coverage.roleId
  const key = getSlotCoverageKey(day, slot.id, roleId)
  const assigned = getAssignedStaffIds(assignments, day, slot.id, roleId).length
  const required = requiredByCoverage[key] ?? coverage.required
  const shortage = Math.max(required - assigned, 0)
  return { assigned, required, shortage }
}

function getSlotShortageCount(day: DaySample, slot: DaySample['slots'][number], assignments: Assignment[], requiredByCoverage: Record<string, number>) {
  return slot.coverage.reduce((count, coverage) => count + Number(getCoverageNumbers(day, slot, coverage, assignments, requiredByCoverage).shortage > 0), 0)
}

function getWeekShortageCount(days: DaySample[], assignments: Assignment[], requiredByCoverage: Record<string, number>) {
  return days.reduce((count, day) => count + day.slots.reduce((slotCount, slot) => slotCount + getSlotShortageCount(day, slot, assignments, requiredByCoverage), 0), 0)
}

function AdminWeekScreen({ days, submittedCount, assignments, requiredByCoverage, scheduleStatus, onOpenShortage, onPublish, onResumeEditing, onOpenPublishedSchedule, onGenerateAssignments }: {
  days: DaySample[]
  submittedCount: number
  assignments: Assignment[]
  requiredByCoverage: Record<string, number>
  scheduleStatus: ScheduleStatus
  onOpenShortage: (day: DaySample, slotId: SlotId, roleId: RoleId) => void
  onPublish: () => void
  onResumeEditing: () => void
  onOpenPublishedSchedule: () => void
  onGenerateAssignments: () => void
}) {
  const [mobileDayIndex, setMobileDayIndex] = useState(5)
  const mobileDay = days[mobileDayIndex] ?? days[0]
  const shortageCount = getWeekShortageCount(days, assignments, requiredByCoverage)

  return (
    <section className="screen-content" aria-labelledby="week-heading">
      <div className="page-heading-row">
        <div><p className="eyebrow">管理者 / 週のシフト</p><h1 id="week-heading">シフトを確認する</h1>
          <p className="page-description">必要な人数と配置状況を、1週間まとめて確認できます。</p></div>
      </div>
      <div className="week-toolbar">
        <div className="week-range"><span className="calendar-icon" aria-hidden="true">▦</span>
          <strong>{formatWeekRange(days)}</strong><span className="week-caption">サンプルの1週間</span></div>
        {scheduleStatus === 'published'
          ? <>
            <button type="button" className="button button-outline" onClick={onResumeEditing}>編集を再開</button>
            <button type="button" className="button button-outline" onClick={onOpenPublishedSchedule}>公開シフトを見る</button>
          </>
          : <div className="week-actions"><button type="button" className="button button-outline" onClick={onGenerateAssignments}>初期配置を生成</button><button type="button" className="button button-primary" disabled={shortageCount > 0} onClick={onPublish}>週シフトを公開 <span aria-hidden="true">→</span></button></div>}
      </div>
      <div className="summary-grid" aria-label="週の状況">
        <SummaryCard label="人員不足" value={String(shortageCount)} suffix="枠" note="あと1人の枠があります" variant="summary-shortage" />
        <SummaryCard label="希望の回答" value={String(submittedCount)} suffix=" / 8人" note="希望提出済み" />
        <SummaryCard label="シフトの状態" value={scheduleStatus === 'published' ? '公開中' : '下書き'} note={scheduleStatus === 'published' ? 'スタッフに公開されています' : '公開前のシフトです'} variant="summary-status" />
      </div>
      <section className="schedule-panel" aria-label="週の配置状況">
        <div className="panel-heading"><div><h2>週間シフト</h2><p>職種ごとの配置人数 / 必要人数</p></div>
          <span className="legend"><i className="legend-dot legend-ok" />充足 <i className="legend-dot legend-low" />あと1人</span></div>
        <div className="week-grid-scroll"><div className="week-grid">
          {days.map((day) => <WeekDayColumn key={day.date.toISOString()} day={day} assignments={assignments} requiredByCoverage={requiredByCoverage} canEdit={scheduleStatus === 'draft'} onOpenShortage={onOpenShortage} />)}
        </div></div>
        {mobileDay && <div className="mobile-week-view">
          <div className="mobile-date-picker" aria-label="日付を選択">
            {days.map((day, index) => <button key={day.date.toISOString()} type="button"
              className={index === mobileDayIndex ? 'date-choice is-active' : 'date-choice'}
              aria-pressed={index === mobileDayIndex} onClick={() => setMobileDayIndex(index)}>
              <span>{day.weekday}</span><strong>{formatDate(day.date)}</strong>
            </button>)}
          </div>
          <WeekDayColumn day={mobileDay} assignments={assignments} requiredByCoverage={requiredByCoverage} canEdit={scheduleStatus === 'draft'} onOpenShortage={onOpenShortage} />
        </div>}
        <p className="panel-footnote">人数と配置は画面確認用のサンプルです。</p>
      </section>
    </section>
  )
}

function AdminPublishedScreen({ days, assignments, onResumeEditing }: {
  days: DaySample[]
  assignments: Assignment[]
  onResumeEditing: () => void
}) {
  return <section className="screen-content" aria-labelledby="published-heading">
    <div className="page-heading-row">
      <div><p className="eyebrow">管理者 / 公開シフト</p><h1 id="published-heading">公開シフト</h1>
        <p className="page-description">公開中の1週間の配置を、スタッフ全員分確認できます。</p></div>
      <span className="schedule-state"><i />公開中</span>
    </div>
    <div className="week-toolbar">
      <div className="week-range"><span className="calendar-icon" aria-hidden="true">▦</span>
        <strong>{formatWeekRange(days)}</strong><span className="week-caption">スタッフに公開されています</span></div>
      <button type="button" className="button button-outline" onClick={onResumeEditing}>編集を再開</button>
    </div>
    <div className="published-week-grid">
      {days.map((day) => <article className="detail-card published-day-card" key={day.date.toISOString()}>
        <div className="detail-card-heading published-day-heading"><div><p className="eyebrow">{day.weekday}</p><h2>{formatDate(day.date)}</h2></div></div>
        {day.slots.map((slot) => <section className="published-slot-group" key={slot.id} aria-label={slot.label}>
          <h3>{slot.label}</h3>
          {slot.coverage.map((coverage) => {
            const assignedNames = getAssignedStaffIds(assignments, day, slot.id, coverage.roleId)
              .map((id) => staffMembers.find((member) => member.id === id)?.name)
              .filter((name): name is string => name !== undefined)
            return <div className="published-shift-row" key={coverage.roleId}>
              <strong>{coverage.roleName}</strong>
              <span>{assignedNames.length > 0 ? assignedNames.join('、') : '配置なし'}</span>
            </div>
          })}
        </section>)}
      </article>)}
    </div>
  </section>
}

function WeekDayColumn({ day, assignments, requiredByCoverage, canEdit, onOpenShortage }: { day: DaySample; assignments: Assignment[]; requiredByCoverage: Record<string, number>; canEdit: boolean; onOpenShortage: (day: DaySample, slotId: SlotId, roleId: RoleId) => void }) {
  return <article className="day-column">
    <div className="day-heading"><span>{day.weekday}</span><strong>{formatDate(day.date)}</strong></div>
    {day.slots.map((slot) => {
      const slotShortageCount = getSlotShortageCount(day, slot, assignments, requiredByCoverage)
      return <div className="slot-cell" key={slot.id}>
      <span className="slot-label">{slot.label}</span>
      {slot.coverage.map((coverage) => {
        const { assigned, required, shortage } = getCoverageNumbers(day, slot, coverage, assignments, requiredByCoverage)
        const short = shortage > 0
        const content = <>
          <span className="coverage-line-main">
            <span>{coverage.roleName}</span>
            <strong className={short ? 'coverage-count is-short' : 'coverage-count'}>{assigned}/{required}</strong>
            {short && <small>{`\u3042\u3068${shortage}\u4eba`}</small>}
          </span>
          <span className="coverage-staff-names">{getAssignedStaffNames(assignments, day, slot.id, coverage.roleId).join('・') || '未配置'}</span>
        </>
        return canEdit
          ? <button className="coverage-line coverage-line-button" type="button" key={coverage.roleId} onClick={() => onOpenShortage(day, slot.id, coverage.roleId)}>{content}</button>
          : <div className="coverage-line" key={coverage.roleId}>{content}</div>
      })}
      {slotShortageCount > 0 && day.weekday === '土' && slot.id === 'afternoon' && (() => {
        const shortCoverage = slot.coverage.find((coverage) => getCoverageNumbers(day, slot, coverage, assignments, requiredByCoverage).shortage > 0)
        return shortCoverage && <button className="shortage-link" type="button" onClick={() => onOpenShortage(day, slot.id, shortCoverage.roleId)}>不足枠の詳細 <span aria-hidden="true">→</span></button>
      })()}
    </div>
    })}
  </article>
}

function addStaffAssignment(assignments: Assignment[], day: DaySample, slotId: SlotId, roleId: RoleId, staffId: string): Assignment[] {
  const staff = staffMembers.find((member) => member.id === staffId)
  if (!staff || !staff.roleIds.includes(roleId)) return assignments
  if (assignments.some((assignment) => assignment.date === getDateKey(day.date)
    && assignment.slotId === slotId && assignment.staffId === staffId)) return assignments
  return [...assignments, { date: getDateKey(day.date), slotId, roleId, staffId }]
}

function removeStaffAssignment(assignments: Assignment[], day: DaySample, slotId: SlotId, roleId: RoleId, staffId: string): Assignment[] {
  return assignments.filter((assignment) => !(assignment.date === getDateKey(day.date)
    && assignment.slotId === slotId && assignment.roleId === roleId && assignment.staffId === staffId))
}

function getStaffAssignedShifts(staffId: string, days: DaySample[], assignments: Assignment[]) {
  return assignments.flatMap((assignment) => {
    if (assignment.staffId !== staffId) return []
    const day = days.find((candidate) => getDateKey(candidate.date) === assignment.date)
    const slot = day?.slots.find((candidate) => candidate.id === assignment.slotId)
    const coverage = slot?.coverage.find((candidate) => candidate.roleId === assignment.roleId)
    return day && slot && coverage ? [{ day, slot, roleName: coverage.roleName }] : []
  })
}

function createInitialRequiredByCoverage(days: DaySample[]): Record<string, number> {
  const requiredByCoverage: Record<string, number> = {}
  days.forEach((day) => day.slots.forEach((slot) => slot.coverage.forEach((coverage) => {
    requiredByCoverage[getSlotCoverageKey(day, slot.id, coverage.roleId)] = coverage.required
  })))
  return requiredByCoverage
}

function AdminSlotScreen({ day, dayIndex, slotId, roleId, availabilityByStaff, assignedStaffIds, occupiedStaffIds, requiredCount, scheduleStatus, onAssign, onUnassign, onBack }: {
  day: DaySample
  dayIndex: number
  slotId: SlotId
  roleId: RoleId
  availabilityByStaff: Record<string, StaffAvailabilityState>
  assignedStaffIds: string[]
  occupiedStaffIds: string[]
  requiredCount: number
  scheduleStatus: ScheduleStatus
  onAssign: (staffId: string) => void
  onUnassign: (staffId: string) => void
  onBack: () => void
}) {
  const slot = day.slots.find((candidate) => candidate.id === slotId)
  const coverage = slot?.coverage.find((candidate) => candidate.roleId === roleId)
  const slotIndex = slotId === 'morning' ? 0 : 1
  const choiceIndex = dayIndex * 2 + slotIndex
  const assignedStaff = assignedStaffIds
    .map((staffId) => staffMembers.find((member) => member.id === staffId))
    .filter((member): member is StaffMember => member !== undefined)
  const candidates = staffMembers.filter((candidate) => candidate.roleIds.includes(roleId)
    && !assignedStaffIds.includes(candidate.id)
    && !occupiedStaffIds.includes(candidate.id))

  function requestAssignment(candidate: StaffMember) {
    if (scheduleStatus === 'published') return
    if (!candidate.roleIds.includes(roleId)) return
    if (occupiedStaffIds.includes(candidate.id)) return
    const choice = availabilityByStaff[candidate.id]?.values[choiceIndex] ?? null
    if (choice !== 'available') {
      const label = choice === 'unavailable' ? '休み希望' : '未回答'
      if (!window.confirm(`${candidate.name}さんは「${label}」です。配置しますか？`)) return
    }
    onAssign(candidate.id)
  }
  return (
    <section className="screen-content" aria-labelledby="slot-heading">
      <button type="button" className="back-link" onClick={onBack}><span aria-hidden="true">←</span> 週のシフトへ戻る</button>
      <div className="page-heading-row slot-page-heading"><div><p className="eyebrow">管理者 / 枠の詳細</p>
        <h1 id="slot-heading">{coverage ? `${formatDate(day.date)} ${slot?.label}・${coverage.roleName}` : '枠の詳細'}</h1>
        <p className="page-description">必要な人数と、配置候補の希望状況を確認できます。</p></div><span className="sample-pill">サンプル枠</span></div>
      <div className="detail-layout">
        <section className="detail-card requirement-card"><div className="detail-card-heading"><div><p className="eyebrow">この枠の必要人数</p><h2>{coverage ? `${formatDate(day.date)} ${slot?.label}・${coverage.roleName}` : '選択した枠'}</h2></div><span className="sample-pill">サンプル</span></div>
          <div className="requirement-count-row"><div className="count-block"><span>必要人数</span><strong>{requiredCount}<span>人</span></strong></div><span className="count-divider">−</span>
            <div className="count-block"><span>配置済み</span><strong>{assignedStaffIds.length}<span>人</span></strong></div></div>
          <p className="disabled-note">必要人数はサンプル表示です。</p></section>
        <section className="detail-card"><div className="detail-card-heading"><div><p className="eyebrow">{assignedStaff.length}人配置済み</p><h2>配置済みスタッフ</h2></div></div>
          {assignedStaff.map((member) => {
            const staffAvailability = availabilityByStaff[member.id]
            const choice = getAvailabilityDisplay(staffAvailability?.values[choiceIndex] ?? null)
            const details = [
              `対応可能職種：${member.roleIds.map(getRoleLabel).join('・')}`,
              `今回の希望職種：${getPreferenceLabel(staffAvailability?.preferredRoles[choiceIndex] ?? null)}`,
            ]
            return <StaffRow key={member.id} name={member.name} choice={choice.label} tone={choice.tone} details={details} action="解除" disabled={scheduleStatus === 'published'} onAction={() => onUnassign(member.id)} />
          })}</section>
        <section className="detail-card candidates-card"><div className="detail-card-heading"><div><p className="eyebrow">職種：{coverage?.roleName ?? roleId}</p><h2>配置候補</h2></div><span className="candidate-count">{candidates.length}人</span></div>
          <div className="candidate-list">{candidates.map((candidate) => {
            const staffAvailability = availabilityByStaff[candidate.id]
            const choice = getAvailabilityDisplay(staffAvailability?.values[choiceIndex] ?? null)
            const details = [
              `対応可能職種：${candidate.roleIds.map(getRoleLabel).join('・')}`,
              `今回の希望職種：${getPreferenceLabel(staffAvailability?.preferredRoles[choiceIndex] ?? null)}`,
            ]
            return <StaffRow key={candidate.id} name={candidate.name} choice={choice.label} tone={choice.tone} details={details} action="この人を配置" disabled={scheduleStatus === 'published'} onAction={() => requestAssignment(candidate)} />
          })}</div>
          {candidates.length === 0 && <p className="disabled-note">配置候補はいません。</p>}</section>
      </div>
    </section>
  )
}

function StaffRow({ name, choice, tone, details = [], action, onAction, disabled = false }: { name: string; choice: string; tone: string; details?: string[]; action: string; onAction: () => void; disabled?: boolean }) {
  return <div className="staff-row"><span className={`avatar avatar-${tone}`} aria-hidden="true">{name[0]}</span>
    <div className="staff-row-copy"><strong>{name}</strong><span className={`availability-label availability-${tone}`}>{choice}</span>
      {details.map((detail) => <span className="staff-row-detail" key={detail}>{detail}</span>)}</div>
    <button type="button" className={`button button-small ${action === '解除' ? 'button-muted' : 'button-outline'}`} onClick={onAction} disabled={disabled}>{action}</button></div>
}

function getRoleLabel(roleId: RoleId): string {
  return roleId === 'reception' ? '受付' : '施術'
}

function getPreferenceLabel(preference: ShiftPreference): string {
  if (preference === 'either') return 'どちらでも可'
  if (preference === null) return '希望なし'
  return `${getRoleLabel(preference)}希望`
}

function getAvailabilityDisplay(choice: AvailabilityChoice): { label: string; tone: string } {
  if (choice === 'available') return { label: '勤務可能', tone: 'available' }
  if (choice === 'unavailable') return { label: '休み希望', tone: 'unavailable' }
  return { label: '未回答', tone: 'unanswered' }
}

function createInitialAvailabilityByStaff(): Record<string, StaffAvailabilityState> {
  const submittedIds = new Set(sampleSubmittedStaffIds)
  return Object.fromEntries(staffMembers.map((member) => {
    const values = [...(sampleAvailability[member.id] ?? Array.from({ length: week.length * 2 }, () => null))]
    const preferredRoles = [...(samplePreferredRoles[member.id] ?? Array.from({ length: week.length * 2 }, () => null))]
    const submitted = submittedIds.has(member.id)
    return [member.id, {
      values,
      preferredRoles,
      submittedValues: submitted ? [...values] : null,
      submittedPreferredRoles: submitted ? [...preferredRoles] : null,
      submitted,
      submittedAt: submitted ? '2026-10-01T00:00:00.000Z' : null,
    }]
  })) as Record<string, StaffAvailabilityState>
}

function createInitialPersistentState(days: DaySample[]): PersistedDemoState {
  const availabilityByStaff = createInitialAvailabilityByStaff()
  const requiredByCoverage = createInitialRequiredByCoverage(days)
  return {
    availabilityByStaff,
    assignments: createSampleAssignments(days),
    scheduleStatus: 'draft',
    requiredByCoverage,
    staffId: 'staff-1',
  }
}

function ChoicePreview({ choice, onSelect }: {
  choice: AvailabilityChoice
  onSelect: (choice: Exclude<AvailabilityChoice, null>) => void
}) {
  return <div className="choice-preview" role="group" aria-label="希望">
    <button type="button" className={choice === 'available' ? 'choice-button is-selected' : 'choice-button'}
      aria-pressed={choice === 'available'} onClick={() => onSelect('available')}>勤務可能</button>
    <button type="button" className={choice === 'unavailable' ? 'choice-button is-selected' : 'choice-button'}
      aria-pressed={choice === 'unavailable'} onClick={() => onSelect('unavailable')}>休み希望</button>
  </div>
}

function PreferenceChoicePreview({ staff, preference, onSelect }: {
  staff: StaffMember
  preference: ShiftPreference
  onSelect: (preference: Exclude<ShiftPreference, null>) => void
}) {
  const options: Array<{ value: Exclude<ShiftPreference, null>; label: string }> = staff.roleIds.map((roleId) => ({
    value: roleId,
    label: `${getRoleLabel(roleId)}希望`,
  }))
  if (staff.roleIds.length > 1) options.push({ value: 'either', label: 'どちらでも可' })

  return <div className="preference-choice" role="group" aria-label="希望職種">
    <span>希望職種</span>
    <div className="choice-preview">
      {options.map((option) => <button key={option.value} type="button"
        className={preference === option.value ? 'choice-button is-selected' : 'choice-button'}
        aria-pressed={preference === option.value} onClick={() => onSelect(option.value)}>{option.label}</button>)}
    </div>
  </div>
}

function formatSubmittedAt(value: string): string {
  return new Date(value).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StaffAvailabilityScreen({
  staff,
  availability,
  onSelect,
  onSelectPreference,
  onSubmit,
}: {
  staff: StaffMember
  availability: StaffAvailabilityState
  onSelect: (staffId: string, index: number, choice: Exclude<AvailabilityChoice, null>) => void
  onSelectPreference: (staffId: string, index: number, preference: Exclude<ShiftPreference, null>) => void
  onSubmit: (staffId: string) => void
}) {
  const days = week
  const hasChanges = availability.submittedValues !== null
    && (availability.values.some((choice, index) => choice !== availability.submittedValues?.[index])
      || availability.preferredRoles.some((preference, index) => preference !== availability.submittedPreferredRoles?.[index]))
  const submissionLabel = !availability.submitted || availability.submittedAt === null
    ? '未提出'
    : hasChanges
      ? '変更あり・未再提出'
      : `提出済み ${formatSubmittedAt(availability.submittedAt)}`

  return <section className="screen-content" aria-labelledby="availability-heading">
    <div className="page-heading-row"><div><p className="eyebrow">スタッフ / 希望シフト</p><h1 id="availability-heading">希望シフトを提出</h1>
      <p className="page-description">勤務可能を選んだ枠では、対応できる職種から希望を選べます。</p></div><span className="sample-pill">入力サンプル</span></div>
    <section className="availability-panel"><div className="availability-toolbar"><div><span className="field-label">対象週</span><strong>{formatWeekRange(days)}</strong></div>
      <div className="submission-state" aria-live="polite"><span className="state-dot state-dot-gray" />{submissionLabel}</div></div>
      <div className="availability-intro">{staff.name}さんの希望です。選択中の項目をもう一度押すと未回答に戻ります。</div>
      <div className="availability-list">{days.map((day, dayIndex) => <article className="availability-day" key={day.date.toISOString()}>
        <div className="availability-date"><strong>{day.weekday}</strong><span>{formatDate(day.date)}</span></div>
        {day.slots.map((slot, slotIndex) => {
          const index = dayIndex * 2 + slotIndex
          const choice = availability.values[index] ?? null
          return <div className="availability-slot" key={slot.id}><span>{slot.label}</span>
            <div className="availability-control-stack">
              <ChoicePreview choice={choice} onSelect={(nextChoice) => onSelect(staff.id, index, nextChoice)} />
              {choice === 'available' && <PreferenceChoicePreview staff={staff} preference={availability.preferredRoles[index] ?? null}
                onSelect={(preference) => onSelectPreference(staff.id, index, preference)} />}
            </div>
          </div>
        })}
      </article>)}</div>
      <div className="availability-footer"><span>どちらも選択されていない枠は未回答として扱います。</span>
        <button type="button" className="button button-primary" onClick={() => onSubmit(staff.id)}>
          {!availability.submitted ? '希望を提出' : '希望を再提出'}
        </button></div>
    </section>
  </section>
}

function StaffConfirmedScreen({ staff, days, assignments, scheduleStatus }: {
  staff: StaffMember
  days: DaySample[]
  assignments: Assignment[]
  scheduleStatus: ScheduleStatus
}) {
  const shifts = getStaffAssignedShifts(staff.id, days, assignments)

  return <section className="screen-content" aria-labelledby="confirmed-heading">
    <div className="page-heading-row"><div><p className="eyebrow">スタッフ / 確定シフト</p><h1 id="confirmed-heading">確定シフト</h1>
      <p className="page-description">{staff.name}さんの公開された勤務を確認できます。</p></div><span className="schedule-state schedule-state-muted"><i />{scheduleStatus === 'published' ? '公開中' : '未公開'}</span></div>
    <section className="confirmed-panel"><div className="confirmed-week"><span className="calendar-icon" aria-hidden="true">▦</span><strong>{formatWeekRange(days)}</strong></div>
      {scheduleStatus !== 'published'
        ? <div className="unpublished-state"><span className="unpublished-icon" aria-hidden="true">◷</span><h2>この週のシフトはまだ公開されていません</h2>
          <p>管理者がシフトを公開すると、ここに勤務日と時間帯が表示されます。</p></div>
        : <div className="availability-list">
          {days.map((day) => {
            const dayShifts = shifts.filter((shift) => shift.day.date.getTime() === day.date.getTime())
            if (dayShifts.length === 0) return null
            return <article className="availability-day" key={day.date.toISOString()}>
              <div className="availability-date"><strong>{day.weekday}</strong><span>{formatDate(day.date)}</span></div>
              {dayShifts.map((shift) => <div className="availability-slot" key={`${shift.slot.id}-${shift.roleName}`}>
                <span>{shift.slot.label}</span><strong>{shift.roleName}</strong>
              </div>)}
            </article>
          })}
          {shifts.length === 0 && <div className="unpublished-state"><p>この週に配置された勤務はありません。</p></div>}
        </div>}
    </section>
  </section>
}

function DashboardScreen({ days, availabilityByStaff, assignments, requiredByCoverage, scheduleStatus }: {
  days: DaySample[]
  availabilityByStaff: Record<string, StaffAvailabilityState>
  assignments: Assignment[]
  requiredByCoverage: Record<string, number>
  scheduleStatus: ScheduleStatus
}) {
  const shortageCount = getWeekShortageCount(days, assignments, requiredByCoverage)
  const submittedCount = Object.values(availabilityByStaff).filter((item) => item.submitted).length
  return <section className="screen-content" aria-labelledby="dashboard-heading">
    <div className="page-heading-row"><div><p className="eyebrow">現在のデモ状態</p><h1 id="dashboard-heading">シフト状況</h1>
      <p className="page-description">以下はこのブラウザーのデモ状態から計算した内容です。操作すると表示も更新されます。</p></div></div>
    <div className="summary-grid" aria-label="現在の週の状況">
      <SummaryCard label="人員不足" value={String(shortageCount)} suffix="枠" note={shortageCount ? `あと${shortageCount}枠の人員不足` : '全ての枠が充足しています'} variant="summary-shortage" />
      <SummaryCard label="希望の回答" value={String(submittedCount)} suffix={` / ${staffMembers.length}人`} note="希望提出済みの人数" />
      <SummaryCard label="シフトの状態" value={scheduleStatus === 'published' ? '公開中' : '下書き'} note={scheduleStatus === 'published' ? 'スタッフに公開されています' : '公開前のシフトです'} variant="summary-status" />
    </div>
    <section className="schedule-panel dashboard-schedule" aria-label="各枠の必要人数と配置人数">
      <div className="panel-heading"><div><h2>週間の必要人数と配置人数</h2><p>{formatWeekRange(days)}・職種別</p></div></div>
      <div className="week-grid-scroll"><div className="week-grid">{days.map((day) => <WeekDayColumn key={day.date.toISOString()} day={day} assignments={assignments} requiredByCoverage={requiredByCoverage} canEdit={false} onOpenShortage={() => undefined} />)}</div></div>
      <div className="mobile-dashboard-list">{days.map((day) => <article className="detail-card" key={day.date.toISOString()}><h2>{day.weekday} {formatDate(day.date)}</h2>
        {day.slots.map((slot) => <div className="dashboard-slot" key={slot.id}><strong>{slot.label}</strong>{slot.coverage.map((coverage) => {
          const numbers = getCoverageNumbers(day, slot, coverage, assignments, requiredByCoverage)
          return <span key={coverage.roleId}>{coverage.roleName}　{numbers.assigned}/{numbers.required}人</span>
        })}</div>)}</article>)}</div>
      <p className="panel-footnote">配置人数 / 必要人数。画面確認用のデモデータです。</p>
    </section>
    {scheduleStatus === 'published' && <section className="dashboard-published"><h2>公開済みシフト</h2><AdminPublishedScreen days={days} assignments={assignments} onResumeEditing={() => undefined} /></section>}
  </section>
}

function SpecsScreen() {
  return <section className="screen-content info-page" aria-labelledby="specs-heading">
    <div className="page-heading-row"><div><p className="eyebrow">機能と利用範囲</p><h1 id="specs-heading">仕様書</h1><p className="page-description">現在のデモ実装で確認できる内容と、未実装の範囲をまとめています。</p></div></div>
    <div className="spec-grid">
      <article className="detail-card"><h2>役割と操作</h2><ul><li>管理者：希望と必要人数を見てスタッフを配置し、週シフトを公開します。</li><li>スタッフ：本人を選んで希望を提出し、公開後に自分の確定シフトを確認します。</li><li>立場の切替はデモ用です。ログインや権限管理ではありません。</li></ul></article>
      <article className="detail-card"><h2>希望とシフト枠</h2><ul><li>対象週は7日間、各日に午前・午後の枠があります。</li><li>希望は「勤務可能」「休み希望」から選び、勤務可能な枠は希望職種も選択できます。未選択は未回答です。</li><li>枠ごとに受付・施術の職種別必要人数と配置人数を扱います。</li></ul></article>
      <article className="detail-card"><h2>配置・公開</h2><ul><li>初期配置を生成すると、サンプル配置に戻せます。不足枠は1枠残ります。</li><li>同じスタッフを同一日時の複数職種へ重複配置できません。対応職種以外にも配置できません。</li><li>全ての必要人数を満たすと公開できます。公開中は編集できず、管理者が編集を再開すると下書きに戻ります。</li><li>希望に反する配置や未回答者の配置時は確認が表示されます。</li></ul></article>
      <article className="detail-card"><h2>保存と未実装範囲</h2><ul><li>希望、配置、必要人数、公開状態は同じブラウザーの localStorage に保存されます。デモ初期化でサンプル状態へ戻せます。</li><li>サーバー同期、アカウント認証、本番の権限管理、複数店舗、通知、外部カレンダー連携、自動シフト作成は実装していません。</li><li>給与計算、打刻、有給管理、勤務時間集計、CSV出力も対象外です。</li></ul></article>
    </div>
  </section>
}

function DiagramScreen() {
  const steps = [
    ['スタッフ', '勤務できる時間帯と希望職種を提出'], ['管理者', '必要人数と希望状況を見て不足を確認'],
    ['配置', '職種に合うスタッフを枠へ割り当て'], ['公開', '全枠が充足したら週シフトを公開'], ['スタッフ', '公開された自分の勤務を確認'],
  ]
  return <section className="screen-content info-page" aria-labelledby="diagram-heading">
    <div className="page-heading-row"><div><p className="eyebrow">希望から確定まで</p><h1 id="diagram-heading">シフトが決まる流れ</h1><p className="page-description">希望と必要人数をもとに配置を整え、公開内容をスタッフが確認します。</p></div></div>
    <ol className="flow-diagram">{steps.map(([title, text], index) => <li className="flow-step" key={`${title}-${index}`}>
      <span className="flow-number">{String(index + 1).padStart(2, '0')}</span><div><span className="flow-owner">{title}</span><strong>{text}</strong></div>{index < steps.length - 1 && <span className="flow-arrow" aria-hidden="true">↓</span>}
    </li>)}</ol>
    <p className="panel-footnote">希望提出・配置・公開はデモ上の操作です。データはこのブラウザー内に保存されます。</p>
  </section>
}

export default function App() {
  const [productPage, setProductPage] = useState<ProductPageId>('demo')
  const [role, setRole] = useState<Role>('admin')
  const [screen, setScreen] = useState<ScreenId>('admin-week')
  const [demoState, setDemoState] = useState<PersistedDemoState>(() => loadDemoState(week, () => createInitialPersistentState(week)))
  const [selectedCoverage, setSelectedCoverage] = useState<{ date: string; slotId: SlotId; roleId: RoleId }>(() => ({
    date: getDateKey(week[5].date), slotId: 'afternoon', roleId: 'treatment',
  }))
  const { availabilityByStaff, assignments, scheduleStatus, requiredByCoverage, staffId } = demoState
  const selectedDayIndex = Math.max(week.findIndex((day) => getDateKey(day.date) === selectedCoverage.date), 0)
  const selectedDay = week[selectedDayIndex]
  const selectedSlot = selectedDay.slots.find((slot) => slot.id === selectedCoverage.slotId) ?? selectedDay.slots[0]
  const selectedSlotCoverage = selectedSlot.coverage.find((coverage) => coverage.roleId === selectedCoverage.roleId)
  const selectedCoverageKey = getSlotCoverageKey(selectedDay, selectedSlot.id, selectedCoverage.roleId)
  const selectedSlotAssignments = assignments.filter((assignment) => assignment.date === selectedCoverage.date && assignment.slotId === selectedCoverage.slotId)
  const staff = staffMembers.find((member) => member.id === staffId) ?? staffMembers[0]
  const submittedCount = Object.values(availabilityByStaff)
    .filter((availability) => availability.submitted).length
  useEffect(() => {
    saveDemoState(demoState)
  }, [demoState])

  function selectAvailability(targetStaffId: string, index: number, choice: Exclude<AvailabilityChoice, null>) {
    setDemoState((current) => {
      const selectedStaff = current.availabilityByStaff[targetStaffId]
      const values = [...selectedStaff.values]
      const nextChoice = values[index] === choice ? null : choice
      values[index] = nextChoice
      const preferredRoles = [...selectedStaff.preferredRoles]
      if (nextChoice !== 'available') preferredRoles[index] = null
      return {
        ...current,
        availabilityByStaff: { ...current.availabilityByStaff, [targetStaffId]: { ...selectedStaff, values, preferredRoles } },
      }
    })
  }

  function selectPreferredRole(targetStaffId: string, index: number, preference: Exclude<ShiftPreference, null>) {
    setDemoState((current) => {
      const selectedStaff = current.availabilityByStaff[targetStaffId]
      const member = staffMembers.find((candidate) => candidate.id === targetStaffId)
      if (!selectedStaff || !member || selectedStaff.values[index] !== 'available') return current
      if (preference === 'either' ? member.roleIds.length < 2 : !member.roleIds.includes(preference)) return current
      const preferredRoles = [...selectedStaff.preferredRoles]
      preferredRoles[index] = preference
      return {
        ...current,
        availabilityByStaff: { ...current.availabilityByStaff, [targetStaffId]: { ...selectedStaff, preferredRoles } },
      }
    })
  }

  function submitAvailability(targetStaffId: string) {
    setDemoState((current) => {
      const selectedStaff = current.availabilityByStaff[targetStaffId]
      return {
        ...current,
        availabilityByStaff: {
          ...current.availabilityByStaff,
          [targetStaffId]: {
            ...selectedStaff,
            submittedValues: [...selectedStaff.values],
            submittedPreferredRoles: [...selectedStaff.preferredRoles],
            submitted: true,
            submittedAt: new Date().toISOString(),
          },
        },
      }
    })
  }

  function assignStaff(id: string) {
    if (scheduleStatus === 'published') return
    setDemoState((current) => ({ ...current, assignments: addStaffAssignment(current.assignments, selectedDay, selectedCoverage.slotId, selectedCoverage.roleId, id) }))
  }

  function unassignStaff(id: string) {
    if (scheduleStatus === 'published') return
    setDemoState((current) => ({ ...current, assignments: removeStaffAssignment(current.assignments, selectedDay, selectedCoverage.slotId, selectedCoverage.roleId, id) }))
  }

  function resetDemo() {
    setDemoState(createInitialPersistentState(week))
    setRole('admin')
    setScreen('admin-week')
    setProductPage('demo')
  }

  function generateInitialAssignments() {
    if (scheduleStatus === 'published') return
    setDemoState((current) => ({ ...current, assignments: createSampleAssignments(week) }))
  }

  function publishWeek() {
    setDemoState((current) => {
      const currentShortageCount = getWeekShortageCount(week, current.assignments, current.requiredByCoverage)
      if (currentShortageCount !== 0 || current.scheduleStatus === 'published') return current
      return { ...current, scheduleStatus: 'published' }
    })
  }

  function resumeEditing() {
    setDemoState((current) => ({ ...current, scheduleStatus: 'draft' }))
    setRole('admin')
    setScreen('admin-week')
  }

  function changeRole(nextRole: Role) {
    setRole(nextRole)
    setScreen(nextRole === 'admin' ? 'admin-week' : 'staff-availability')
  }

  function openPublishedSchedule() {
    if (scheduleStatus !== 'published') return
    setRole('admin')
    setScreen('admin-published')
  }

  function openCoverageDetails(day: DaySample, slotId: SlotId, roleId: RoleId) {
    setSelectedCoverage({ date: getDateKey(day.date), slotId, roleId })
    setScreen('admin-slot')
  }

  let activeScreen
  if (screen === 'admin-week') activeScreen = <AdminWeekScreen
    days={week}
    submittedCount={submittedCount}
    assignments={assignments}
    requiredByCoverage={requiredByCoverage}
    scheduleStatus={scheduleStatus}
    onOpenShortage={openCoverageDetails}
    onPublish={publishWeek}
    onResumeEditing={resumeEditing}
    onOpenPublishedSchedule={openPublishedSchedule}
    onGenerateAssignments={generateInitialAssignments}
  />
  else if (screen === 'admin-published' && role === 'admin' && scheduleStatus === 'published') activeScreen = <AdminPublishedScreen
    days={week}
    assignments={assignments}
    onResumeEditing={resumeEditing}
  />
  else if (screen === 'admin-slot') activeScreen = <AdminSlotScreen
    day={selectedDay}
    dayIndex={selectedDayIndex}
    slotId={selectedCoverage.slotId}
    roleId={selectedCoverage.roleId}
    availabilityByStaff={availabilityByStaff}
    assignedStaffIds={getAssignedStaffIds(assignments, selectedDay, selectedSlot.id, selectedCoverage.roleId)}
    occupiedStaffIds={selectedSlotAssignments.map((assignment) => assignment.staffId)}
    requiredCount={requiredByCoverage[selectedCoverageKey] ?? selectedSlotCoverage?.required ?? 0}
    scheduleStatus={scheduleStatus}
    onAssign={assignStaff}
    onUnassign={unassignStaff}
    onBack={() => setScreen('admin-week')}
  />
  else if (screen === 'staff-availability') activeScreen = <StaffAvailabilityScreen
    staff={staff}
    availability={availabilityByStaff[staff.id]}
    onSelect={selectAvailability}
    onSelectPreference={selectPreferredRole}
    onSubmit={submitAvailability}
  />
  else activeScreen = <StaffConfirmedScreen staff={staff} days={week} assignments={assignments} scheduleStatus={scheduleStatus} />

  const productContent = productPage === 'demo' ? <><ScreenNavigation role={role} screen={screen} scheduleStatus={scheduleStatus} onNavigate={setScreen} /><div className="active-screen">{activeScreen}</div></>
    : productPage === 'dashboard' ? <DashboardScreen days={week} availabilityByStaff={availabilityByStaff} assignments={assignments} requiredByCoverage={requiredByCoverage} scheduleStatus={scheduleStatus} />
      : productPage === 'specs' ? <SpecsScreen /> : <DiagramScreen />

  return <div className="app-frame"><AppHeader role={role} staffId={staffId} onRoleChange={changeRole} onStaffChange={(nextStaffId) => setDemoState((current) => ({ ...current, staffId: nextStaffId }))} onReset={resetDemo} showDemoControls={productPage === 'demo'} />
    <main className="main-container"><ProductNavigation page={productPage} onNavigate={setProductPage} />
      {productContent}
      <footer className="app-footer"><span>シフトノート</span><span>画面確認用のデモサンプル</span></footer>
    </main></div>
}
