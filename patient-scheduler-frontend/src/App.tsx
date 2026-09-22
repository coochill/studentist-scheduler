import { useEffect, useState, type ReactNode } from 'react'
import { Bell, CalendarDays, ChevronRight, LayoutDashboard, Menu, Search, Settings, Users, X } from 'lucide-react'
import { api, type Appointment as AppointmentRecord, type CaseType, type Patient, type PatientCase, type PatientCaseTask } from './services/api'
import './App.css'

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Patients', icon: Users },
  { label: 'Appointments', icon: CalendarDays },
  { label: 'Settings', icon: Settings },
]

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState('Dashboard')
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getPatients(), api.getAppointments(), api.getCaseTypes()])
      .then(([patientData, appointmentData, caseTypeData]) => {
        setPatients(patientData)
        setAppointments(appointmentData)
        setCaseTypes(caseTypeData)
      })
      .catch(() => setLoadError('Unable to load live clinic data. Start the Laravel API and try again.'))
      .finally(() => setIsLoading(false))
  }, [])

  const caseCount = patients.reduce((total, patient) => total + patient.patient_cases.length, 0)
  const today = new Date().toISOString().slice(0, 10)
  const todayAppointments = appointments.filter((appointment) => appointment.appointment_date === today)
  const visibleAppointments = appointments.slice(0, 3)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row"><div className="brand-mark">S</div><div><strong>Studentist</strong><span>Patient Scheduler</span></div><button className="icon-button close-menu-button" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
        <nav className="navigation" aria-label="Main navigation"><p className="nav-label">Workspace</p>{navigation.map(({ label, icon: Icon }) => <button className={`nav-item ${activePage === label ? 'active' : ''}`} key={label} onClick={() => { setActivePage(label); setIsSidebarOpen(false) }}><Icon size={19} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-footer"><div className="help-card"><p>Need a hand?</p><span>Visit the help center</span><ChevronRight size={16} /></div><p className="version-label">Patient Scheduler · v0.1</p></div>
      </aside>
      {isSidebarOpen && <button className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation" />}
      <main className="main-content">
        <header className="topbar"><div className="topbar-title"><button className="icon-button mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div><p className="eyebrow">Tuesday, September 22, 2026</p><h1>Good morning, Studentist</h1></div></div><div className="topbar-actions"><button className="icon-button" aria-label="Search"><Search size={19} /></button><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span /></button><div className="profile-chip"><span className="avatar">DR</span><span className="profile-name">Dr. Reyes</span></div></div></header>
        {activePage === 'Patients' ? <PatientsPage patients={patients} appointments={appointments} caseTypes={caseTypes} isLoading={isLoading} loadError={loadError} onCreated={(patient) => setPatients((current) => [...current, patient].sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)))} onDeleted={(id) => setPatients((current) => current.filter((patient) => patient.id !== id))} /> : activePage === 'Appointments' ? (
  <AppointmentsPage
    appointments={appointments}
    patients={patients}
    isLoading={isLoading}
    loadError={loadError}
    onCreated={(appointment) =>
      setAppointments((current) =>
        [...current, appointment].sort((a, b) =>
          `${a.appointment_date}${a.start_time}`.localeCompare(
            `${b.appointment_date}${b.start_time}`
          )
        )
      )
    }
    onUpdated={(updated) =>
      setAppointments((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      )
    }
    onDeleted={(id) =>
      setAppointments((current) =>
        current.filter((item) => item.id !== id)
      )
    }
  />
) : activePage === 'Settings' ? <SettingsPage caseTypes={caseTypes} isLoading={isLoading} loadError={loadError} onChanged={setCaseTypes} /> : <section className="page-content">
          <div className="welcome-row"><div><p className="section-kicker">Overview</p><h2>Your clinic at a glance</h2></div><button className="primary-button" onClick={() => setActivePage('Appointments')}><CalendarDays size={17} />Schedule appointment</button></div>
          {loadError && <div className="api-alert" role="alert">{loadError}</div>}
          <div className="summary-grid"><SummaryCard label="Total patients" value={isLoading ? '—' : String(patients.length)} detail="Live from Laravel API" tone="mint" icon={<Users size={20} />} /><SummaryCard label="Today's appointments" value={isLoading ? '—' : String(todayAppointments.length).padStart(2, '0')} detail="Live from Laravel API" tone="peach" icon={<CalendarDays size={20} />} /><SummaryCard label="Open patient cases" value={isLoading ? '—' : String(caseCount)} detail="Across all patients" tone="lilac" icon={<LayoutDashboard size={20} />} /></div>
          <div className="dashboard-grid"><section className="content-panel"><div className="panel-heading"><div><p className="section-kicker">Live schedule</p><h3>Upcoming appointments</h3></div><button className="text-button">View calendar <ChevronRight size={16} /></button></div>{isLoading ? <p className="empty-state">Loading appointments...</p> : visibleAppointments.length === 0 ? <p className="empty-state">No appointments scheduled yet.</p> : visibleAppointments.map((appointment) => <Appointment key={appointment.id} appointment={appointment} />)}</section><section className="content-panel"><div className="panel-heading"><div><p className="section-kicker">Connected data</p><h3>Patient updates</h3></div></div><Activity initials="API" name={`${patients.length} patients loaded`} text="Retrieved from Laravel" time="Now" /><Activity initials="API" name={`${caseCount} cases loaded`} text="Linked to patient records" time="Now" /><Activity initials="API" name={`${appointments.length} appointments loaded`} text="Linked to patient cases" time="Now" /></section></div>
        </section>}
      </main>
    </div>
  )
}

function SummaryCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: string; icon: ReactNode }) { return <article className="summary-card"><div className={`summary-icon ${tone}`}>{icon}</div><p>{label}</p><strong>{value}</strong><span>{detail}</span></article> }
function Appointment({
  appointment,
  onUpdated,
  onDeleted,
}: {
  appointment: AppointmentRecord
  onUpdated?: (appointment: AppointmentRecord) => void
  onDeleted?: (id: number) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [date, setDate] = useState(appointment.appointment_date)
  const [status, setStatus] = useState(appointment.status)
  const [notes, setNotes] = useState(appointment.notes || '')
  const [error, setError] = useState<string | null>(null)

  const [hours, minutes] = appointment.start_time.split(':')
  const hour = Number(hours)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  const patient = appointment.patient_case.patient
  const statusLabel =
    appointment.status.charAt(0).toUpperCase() +
    appointment.status.slice(1)

  async function save() {
    try {
      const updated = await api.updateAppointment(appointment.id, {
        patient_case_id: appointment.patient_case_id,
        appointment_date: date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status,
        notes: notes || null,
      })

      onUpdated?.(updated)
      setIsEditing(false)
    } catch {
      setError('Unable to update this appointment.')
    }
  }

  async function remove() {
    if (!window.confirm('Delete this appointment?')) return

    try {
      await api.deleteAppointment(appointment.id)
      onDeleted?.(appointment.id)
    } catch {
      setError('Unable to delete this appointment.')
    }
  }

  return (
    <div className="appointment-row">
      <div className="appointment-time">
        <strong>{`${displayHour}:${minutes}`}</strong>
        <span>{period}</span>
      </div>

      <div className="appointment-info">
        <strong>
          {patient.first_name} {patient.last_name}
        </strong>
        <span>{appointment.patient_case.case_type.name}</span>
      </div>

      {isEditing ? (
        <div className="appointment-edit-fields">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
          />

          <button
            className="text-button"
            onClick={() => void save()}
          >
            Save
          </button>

          <button
            className="text-button"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <span className={`status ${appointment.status}`}>
            {statusLabel}
          </span>

          <div className="case-actions">
            <button
              className="text-button"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>

            <button
              className="danger-button"
              onClick={() => void remove()}
            >
              Delete
            </button>
          </div>
        </>
      )}

      {error && <small className="error-text">{error}</small>}
    </div>
  )
}
function Activity({ initials, name, text, time }: { initials: string; name: string; text: string; time: string }) { return <div className="activity-row"><span className="activity-avatar">{initials}</span><div><strong>{name}</strong><span>{text}</span></div><time>{time}</time></div> }

function PatientsPage({ patients, appointments, caseTypes, isLoading, loadError, onCreated, onDeleted }: { patients: Patient[]; appointments: AppointmentRecord[]; caseTypes: CaseType[]; isLoading: boolean; loadError: string | null; onCreated: (patient: Patient) => void; onDeleted: (id: number) => void }) {
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const filteredPatients = patients.filter((patient) => `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(search.toLowerCase()))

  if (selectedPatient) return <PatientDetails patient={selectedPatient} appointments={appointments.filter((appointment) => appointment.patient_case.patient.id === selectedPatient.id)} caseTypes={caseTypes} onBack={() => setSelectedPatient(null)} onDeleted={() => { onDeleted(selectedPatient.id); setSelectedPatient(null) }} onCaseCreated={(patientCase) => setSelectedPatient({ ...selectedPatient, patient_cases: [...selectedPatient.patient_cases, patientCase] })} />

  return <section className="page-content"><div className="welcome-row"><div><p className="section-kicker">Patient records</p><h2>Patients</h2></div><button className="primary-button" onClick={() => setIsFormOpen((open) => !open)}><Users size={17} />{isFormOpen ? 'Close form' : 'Add patient'}</button></div>{loadError && <div className="api-alert" role="alert">{loadError}</div>}{isFormOpen && <PatientForm onCreated={(patient) => { onCreated(patient); setIsFormOpen(false); setSelectedPatient(patient) }} />}<div className="patients-toolbar"><div className="patient-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients" aria-label="Search patients" /></div><span>{isLoading ? 'Loading...' : `${filteredPatients.length} patient${filteredPatients.length === 1 ? '' : 's'}`}</span></div><div className="patient-list">{isLoading ? <p className="empty-state">Loading patient records...</p> : filteredPatients.length === 0 ? <p className="empty-state">No patients found.</p> : filteredPatients.map((patient) => <PatientRow key={patient.id} patient={patient} onView={async () => setSelectedPatient(await api.getPatient(patient.id))} />)}</div></section>
}

function PatientRow({ patient, onView }: { patient: Patient; onView: () => void }) {
  const allTasks = patient.patient_cases.flatMap(
    (patientCase) => patientCase.tasks ?? []
  )

  const hasTasks = allTasks.length > 0

  const isCompleted =
    hasTasks && allTasks.every((task) => task.status === 'completed')

  return (
    <article className="patient-row">
      <div className="patient-avatar">
        {patient.first_name[0]}
        {patient.last_name[0]}
      </div>

      <div className="patient-main">
        <strong>
          {patient.first_name} {patient.last_name}
        </strong>
        <span>
          {patient.contact_number || 'No contact number'}
        </span>
      </div>

      <div className="patient-address">
        {patient.address || 'No address recorded'}
      </div>

      <div className="patient-cases">
        {patient.patient_cases.length === 0 ? (
          <span className="case-muted">No cases</span>
        ) : (
          patient.patient_cases
            .slice(0, 3)
            .map((patientCase) => (
              <span key={patientCase.id}>
                {patientCase.case_type?.name || 'Unnamed case'}
              </span>
            ))
        )}
      </div>

      <div className="patient-status">
        {isCompleted && (
          <span className="patient-completed">
            Completed
          </span>
        )}
      </div>

      <button
        className="text-button patient-view-button"
        onClick={onView}
      >
        View <ChevronRight size={15} />
      </button>
    </article>
  )
}

function PatientForm({ onCreated }: { onCreated: (patient: Patient) => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', contact_number: '', date_of_birth: '', address: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      const patient = await api.createPatient({ ...form, contact_number: form.contact_number || null, date_of_birth: form.date_of_birth || null, address: form.address || null, notes: form.notes || null })
      onCreated(patient)
    } catch {
      setError('Unable to add patient. Check the required fields and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return <form className="patient-form" onSubmit={submit}><div className="form-heading"><p className="section-kicker">New record</p><h3>Add patient</h3></div>{error && <div className="api-alert" role="alert">{error}</div>}<div className="form-grid"><label>First name<input required value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label><label>Last name<input required value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label><label>Contact number<input value={form.contact_number} onChange={(event) => setForm({ ...form, contact_number: event.target.value })} /></label><label>Date of birth<input type="date" value={form.date_of_birth} onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })} /></label><label className="form-notes">Address<textarea rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label className="form-notes">Notes<textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div><div className="form-actions"><button className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save patient'}</button></div></form>
}

function PatientEditForm({ patient, onSaved }: { patient: Patient; onSaved: (patient: Patient) => void }) {
  const [form, setForm] = useState({ first_name: patient.first_name, last_name: patient.last_name, contact_number: patient.contact_number || '', date_of_birth: patient.date_of_birth || '', address: patient.address || '', notes: patient.notes || '' })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      onSaved(await api.updatePatient(patient.id, { ...form, contact_number: form.contact_number || null, date_of_birth: form.date_of_birth || null, address: form.address || null, notes: form.notes || null }))
    } catch {
      setError('Unable to update this patient.')
    } finally {
      setIsSaving(false)
    }
  }

  return <form className="patient-form" onSubmit={submit}>{error && <div className="api-alert" role="alert">{error}</div>}<div className="form-grid"><label>First name<input required value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label><label>Last name<input required value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label><label>Contact number<input value={form.contact_number} onChange={(event) => setForm({ ...form, contact_number: event.target.value })} /></label><label>Date of birth<input type="date" value={form.date_of_birth} onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })} /></label><label className="form-notes">Address<textarea rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label className="form-notes">Notes<textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div><div className="form-actions"><button className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save patient changes'}</button></div></form>
}

function PatientDetails({ patient, appointments, caseTypes, onBack, onDeleted, onCaseCreated }: { patient: Patient; appointments: AppointmentRecord[]; caseTypes: CaseType[]; onBack: () => void; onDeleted: () => void; onCaseCreated: (patientCase: PatientCase) => void }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patientRecord, setPatientRecord] = useState(patient)
  const [appointmentRows, setAppointmentRows] = useState(appointments)

  async function deletePatient() {
    if (!window.confirm(`Delete ${patientRecord.first_name} ${patientRecord.last_name}? This will also delete their cases and appointments.`)) return
    try {
      await api.deletePatient(patientRecord.id)
      onDeleted()
    } catch {
      setError('Unable to delete this patient.')
    }
  }

  return <section className="page-content"><button className="back-button" onClick={onBack}><ChevronRight size={16} />Back to patients</button>{error && <div className="api-alert" role="alert">{error}</div>}<div className="patient-detail-header"><div className="patient-detail-avatar">{patientRecord.first_name[0]}{patientRecord.last_name[0]}</div><div><p className="section-kicker">Patient record</p><h2>{patientRecord.first_name} {patientRecord.last_name}</h2><span>{patientRecord.contact_number || 'No contact number'} · {patientRecord.address || 'No address recorded'}</span></div><div className="patient-detail-actions"><button className="text-button" onClick={() => setIsEditing((open) => !open)}>{isEditing ? 'Close edit' : 'Edit patient'}</button><button className="danger-button" onClick={deletePatient}>Delete patient</button></div></div>{isEditing && <PatientEditForm patient={patientRecord} onSaved={(updated) => { setPatientRecord(updated); setIsEditing(false) }} /> }<div className="patient-detail-grid"><section className="content-panel"><div className="panel-heading"><div><p className="section-kicker">Patient cases</p><h3>{patientRecord.patient_cases.length} case{patientRecord.patient_cases.length === 1 ? '' : 's'}</h3></div><button className="primary-button" onClick={() => setIsFormOpen((open) => !open)}>{isFormOpen ? 'Close form' : 'Add case'}</button></div>{isFormOpen && <PatientCaseForm patientId={patientRecord.id} caseTypes={caseTypes} onCreated={(patientCase) => { setPatientRecord((current) => ({ ...current, patient_cases: [...current.patient_cases, patientCase] })); onCaseCreated(patientCase); setIsFormOpen(false) }} />}{patientRecord.patient_cases.length === 0 ? <p className="empty-state">No cases have been added for this patient.</p> : patientRecord.patient_cases.map((patientCase) => <PatientCaseRow key={patientCase.id} patientCase={patientCase} patientId={patientRecord.id} caseTypes={caseTypes} onUpdated={(updated) => setPatientRecord((current) => ({ ...current, patient_cases: current.patient_cases.map((item) => item.id === updated.id ? updated : item) }))} onDeleted={(id) => setPatientRecord((current) => ({ ...current, patient_cases: current.patient_cases.filter((item) => item.id !== id) }))} />)}</section><section className="content-panel patient-info-panel"><p className="section-kicker">Patient information</p><h3>Notes</h3><p className="detail-notes">{patientRecord.notes || 'No notes recorded.'}</p><p className="section-kicker">Date of birth</p><p className="detail-notes">{patientRecord.date_of_birth || 'Not provided'}</p></section></div><section className="content-panel patient-appointments-panel"><div className="panel-heading"><div><p className="section-kicker">Patient appointments</p><h3>{appointmentRows.length} appointment{appointmentRows.length === 1 ? '' : 's'}</h3></div></div>{appointmentRows.length === 0 ? <p className="empty-state">No appointments for this patient.</p> : appointmentRows.map((appointment) => <PatientAppointmentRow key={appointment.id} appointment={appointment} onUpdated={(updated) => setAppointmentRows((current) => current.map((item) => item.id === updated.id ? updated : item))} onDeleted={(id) => setAppointmentRows((current) => current.filter((item) => item.id !== id))} />)}</section></section>
}

function PatientCaseForm({ patientId, caseTypes, onCreated }: { patientId: number; caseTypes: CaseType[]; onCreated: (patientCase: PatientCase) => void }) {
  const [caseTypeId, setCaseTypeId] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      const patientCase = await api.createPatientCase({ patient_id: patientId, case_type_id: Number(caseTypeId), details: details || null })
      onCreated(patientCase)
    } catch {
      setError('Unable to add this case. Select a valid case type and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return <form className="patient-case-form" onSubmit={submit}>{error && <div className="api-alert" role="alert">{error}</div>}<label>Case type<select required value={caseTypeId} onChange={(event) => setCaseTypeId(event.target.value)}><option value="">Select configured case type</option>{caseTypes.map((caseType) => <option key={caseType.id} value={caseType.id}>{caseType.name}</option>)}</select></label><label>Case details<textarea rows={3} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Add patient-specific case details" /></label><button className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save case'}</button></form>
}

function PatientCaseRow({ patientCase, patientId, caseTypes, onUpdated, onDeleted }: { patientCase: PatientCase; patientId: number; caseTypes: CaseType[]; onUpdated: (patientCase: PatientCase) => void; onDeleted: (id: number) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [details, setDetails] = useState(patientCase.details || '')
  const [caseTypeId, setCaseTypeId] = useState(String(patientCase.case_type_id))
  const [error, setError] = useState<string | null>(null)

  async function save() {
    try {
      const updated = await api.updatePatientCase(patientCase.id, { patient_id: patientId, case_type_id: Number(caseTypeId), details: details || null })
      onUpdated(updated)
      setIsEditing(false)
    } catch {
      setError('Unable to update this case.')
    }
  }

  async function remove() {
    if (!window.confirm('Delete this patient case? Its appointments will also be deleted.')) return
    try {
      await api.deletePatientCase(patientCase.id)
      onDeleted(patientCase.id)
    } catch {
      setError('Unable to delete this case.')
    }
  }

  if (isEditing) return <div className="detail-case-edit">{error && <div className="api-alert" role="alert">{error}</div>}<label>Case type<select value={caseTypeId} onChange={(event) => setCaseTypeId(event.target.value)}>{caseTypes.map((caseType) => <option key={caseType.id} value={caseType.id}>{caseType.name}</option>)}</select></label><label>Details<textarea rows={2} value={details} onChange={(event) => setDetails(event.target.value)} /></label><div className="case-actions"><button className="primary-button" onClick={() => void save()}>Save case</button><button className="text-button" onClick={() => setIsEditing(false)}>Cancel</button></div></div>

  return <><article className="detail-case"><div className="case-type-icon">CT</div><div><strong>{patientCase.case_type?.name || 'Unnamed case'}</strong><span>{patientCase.details || 'No case details recorded'}</span>{patientCase.images && patientCase.images.length > 0 && <small>{patientCase.images.length} image{patientCase.images.length === 1 ? '' : 's'}</small>}</div><div className="case-actions"><button className="text-button" onClick={() => setIsEditing(true)}>Edit</button><button className="danger-button" onClick={() => void remove()}>Delete</button></div></article><TaskList tasks={patientCase.tasks || []} /></>
}

function TaskList({ tasks }: { tasks: PatientCaseTask[] }) {
  const [taskRows, setTaskRows] = useState(tasks)
  const [savingId, setSavingId] = useState<number | null>(null)

  async function saveTask(
    task: PatientCaseTask,
    patch: Partial<PatientCaseTask>
  ) {
    setSavingId(task.id)

    try {
      const updated = await api.updatePatientCaseTask(task.id, {
        start_date: patch.start_date ?? task.start_date,
        expected_end_date:
          patch.expected_end_date ?? task.expected_end_date,
        completed_date:
          patch.completed_date ?? task.completed_date,
        status: patch.status ?? task.status,
      })

      setTaskRows((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      )
    } finally {
      setSavingId(null)
    }
  }

  async function toggleTask(task: PatientCaseTask) {
    const isCompleted = task.status === 'completed'

    await saveTask(task, {
      status: isCompleted ? 'in_progress' : 'completed',
      completed_date: isCompleted
        ? null
        : new Date().toISOString().slice(0, 10),
    })
  }

  if (taskRows.length === 0) return null

  return (
    <div className="task-list">
      <p className="task-list-title">Checklist</p>

      {taskRows.map((task) => {
        const isCompleted = task.status === 'completed'

        return (
          <div
            className={`task-row ${isCompleted ? 'completed' : ''}`}
            key={task.id}
          >
            <button
              type="button"
              className={`task-check ${isCompleted ? 'done' : ''}`}
              onClick={() => void toggleTask(task)}
              disabled={savingId === task.id}
              aria-label={
                isCompleted
                  ? `Mark ${task.title} as incomplete`
                  : `Mark ${task.title} as completed`
              }
            >
              {isCompleted ? '✓' : ''}
            </button>

            <div className="task-main">
              <strong>{task.title}</strong>

              <div className="task-fields">
                <label>
                  Start date
                  <input
                    type="date"
                    value={task.start_date || ''}
                    onChange={(event) =>
                      setTaskRows((current) =>
                        current.map((item) =>
                          item.id === task.id
                            ? {
                                ...item,
                                start_date: event.target.value || null,
                              }
                            : item
                        )
                      )
                    }
                    onBlur={(event) =>
                      void saveTask(task, {
                        start_date: event.target.value || null,
                      })
                    }
                  />
                </label>

                <label>
                  Expected end date
                  <input
                    type="date"
                    value={task.expected_end_date || ''}
                    onChange={(event) =>
                      void saveTask(task, {
                        expected_end_date:
                          event.target.value || null,
                      })
                    }
                  />
                </label>

                <label>
                  Completed date
                  <input
                    type="date"
                    value={task.completed_date || ''}
                    onChange={(event) =>
                      void saveTask(task, {
                        completed_date:
                          event.target.value || null,
                        status: event.target.value
                          ? 'completed'
                          : 'in_progress',
                      })
                    }
                  />
                </label>

                <label>
                  Status
                  <select
                    value={task.status}
                    disabled={savingId === task.id}
                    onChange={(event) =>
                      void saveTask(task, {
                        status:
                          event.target
                            .value as PatientCaseTask['status'],
                      })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">
                      In progress
                    </option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PatientAppointmentRow({ appointment, onUpdated, onDeleted }: { appointment: AppointmentRecord; onUpdated: (appointment: AppointmentRecord) => void; onDeleted: (id: number) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [date, setDate] = useState(appointment.appointment_date)
  const [status, setStatus] = useState(appointment.status)
  const [notes, setNotes] = useState(appointment.notes || '')
  const [error, setError] = useState<string | null>(null)

  async function save() {
    try {
      const updated = await api.updateAppointment(appointment.id, { patient_case_id: appointment.patient_case_id, appointment_date: date, start_time: appointment.start_time, end_time: appointment.end_time, status, notes: notes || null })
      onUpdated(updated)
      setIsEditing(false)
    } catch {
      setError('Unable to update this appointment.')
    }
  }

  async function remove() {
    if (!window.confirm('Delete this appointment?')) return
    try {
      await api.deleteAppointment(appointment.id)
      onDeleted(appointment.id)
    } catch {
      setError('Unable to delete this appointment.')
    }
  }

  return <div className="patient-appointment-row"><div><strong>{appointment.appointment_date}</strong><span>{appointment.start_time} - {appointment.end_time}</span><small>{appointment.patient_case.case_type.name}</small></div>{isEditing ? <div className="appointment-edit-fields"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" /><button className="text-button" onClick={() => void save()}>Save</button></div> : <div className="case-actions"><span className={`status ${appointment.status}`}>{appointment.status}</span><button className="text-button" onClick={() => setIsEditing(true)}>Edit</button><button className="danger-button" onClick={() => void remove()}>Delete</button></div>}{error && <small className="error-text">{error}</small>}</div>
}

function AppointmentsPage({
  appointments,
  patients,
  isLoading,
  loadError,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  appointments: AppointmentRecord[]
  patients: Patient[]
  isLoading: boolean
  loadError: string | null
  onCreated: (appointment: AppointmentRecord) => void
  onUpdated: (appointment: AppointmentRecord) => void
  onDeleted: (id: number) => void
}) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const filteredAppointments = statusFilter ? appointments.filter((appointment) => appointment.status === statusFilter) : appointments

  return <section className="page-content"><div className="welcome-row"><div><p className="section-kicker">Clinic schedule</p><h2>Appointments</h2></div><button className="primary-button" onClick={() => setIsFormOpen((open) => !open)}><CalendarDays size={17} />{isFormOpen ? 'Close form' : 'Schedule appointment'}</button></div>{loadError && <div className="api-alert" role="alert">{loadError}</div>}{isFormOpen && <AppointmentForm patients={patients} onCreated={(appointment) => { onCreated(appointment); setIsFormOpen(false) }} />}<div className="appointments-toolbar"><div><p className="section-kicker">All appointments</p><h3>{filteredAppointments.length} scheduled</h3></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter appointments by status"><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><div className="appointment-list">{isLoading ? <p className="empty-state">Loading appointments...</p> : filteredAppointments.length === 0 ? <p className="empty-state">No appointments found.</p> : filteredAppointments.map((appointment) => (
  <Appointment
    key={appointment.id}
    appointment={appointment}
    onUpdated={onUpdated}
    onDeleted={onDeleted}
  />
))}</div></section>
}

function AppointmentForm({ patients, onCreated }: { patients: Patient[]; onCreated: (appointment: AppointmentRecord) => void }) {
  const [patientId, setPatientId] = useState('')
  const [caseId, setCaseId] = useState<number | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isLoadingCases, setIsLoadingCases] = useState(false)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function selectPatient(value: string) {
    setPatientId(value)
    setCaseId(null)
    setSelectedPatient(null)
    if (!value) return

    setIsLoadingCases(true)
    try {
      const patient = await api.getPatient(Number(value))
      setSelectedPatient(patient)
      setCaseId(patient.patient_cases[0]?.id ?? null)
    } catch {
      setError('Unable to load this patient\'s cases. Please try again.')
    } finally {
      setIsLoadingCases(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      if (!caseId) {
        setError('This patient has no case yet. Add a case in the patient record first.')
        return
      }
      const appointment = await api.createAppointment({ patient_case_id: caseId, appointment_date: date, start_time: startTime, end_time: endTime, status: 'scheduled', notes: notes || null })
      onCreated(appointment)
    } catch {
      setError('Unable to schedule this appointment. Check the time and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return <form className="appointment-form" onSubmit={handleSubmit}><div className="form-heading"><div><p className="section-kicker">New booking</p><h3>Schedule appointment</h3></div></div>{error && <div className="api-alert" role="alert">{error}</div>}<div className="form-grid"><label>Patient<select required value={patientId} onChange={(event) => void selectPatient(event.target.value)}><option value="">Select existing patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>)}</select></label><div className="selected-case-field"><span>Patient case</span><strong>{isLoadingCases ? 'Loading patient details...' : selectedPatient?.patient_cases[0]?.case_type?.name || 'No case available'}</strong><small>{selectedPatient && caseId ? 'Automatically selected from this patient record.' : 'Select a patient with an existing case.'}</small></div><label>Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Start time<input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label>End time<input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label><label className="form-notes">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional appointment notes" rows={2} /></label></div><div className="form-actions"><button className="primary-button" disabled={isSaving || isLoadingCases || !caseId}>{isSaving ? 'Scheduling...' : 'Schedule appointment'}</button></div></form>
}

function SettingsPage({ caseTypes, isLoading, loadError, onChanged }: { caseTypes: CaseType[]; isLoading: boolean; loadError: string | null; onChanged: (caseTypes: CaseType[]) => void }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function openForm(caseType?: CaseType) {
    setEditingId(caseType?.id ?? null)
    setName(caseType?.name ?? '')
    setDescription(caseType?.description ?? '')
    setChecklistItems(caseType?.checklist_items?.map((item) => item.title) ?? [])
    setError(null)
    setIsFormOpen(true)
  }

  async function saveCaseType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const payload = { name: name.trim(), description: description.trim() || null, checklist_items: checklistItems.filter((item) => item.trim() !== '') }
      const saved = editingId ? await api.updateCaseType(editingId, payload) : await api.createCaseType(payload)
      onChanged(editingId ? caseTypes.map((caseType) => caseType.id === saved.id ? saved : caseType) : [...caseTypes, saved].sort((a, b) => a.name.localeCompare(b.name)))
      setIsFormOpen(false)
    } catch {
      setError('Unable to save this case type. The name may already exist.')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteCaseType(caseType: CaseType) {
    if (!window.confirm(`Delete ${caseType.name}?`)) return
    setError(null)
    try {
      await api.deleteCaseType(caseType.id)
      onChanged(caseTypes.filter((item) => item.id !== caseType.id))
    } catch {
      setError('This case type cannot be deleted because a patient case is using it.')
    }
  }

  return <section className="page-content"><div className="welcome-row"><div><p className="section-kicker">System settings</p><h2>Case types</h2></div><button className="primary-button" onClick={() => openForm()}><Settings size={17} />Add case type</button></div>{(loadError || error) && <div className="api-alert" role="alert">{error || loadError}</div>}{isFormOpen && <form className="case-type-form" onSubmit={saveCaseType}><div className="form-grid"><label>Name<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Root Canal Treatment" /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" rows={2} /></label></div><div className="checklist-editor"><div className="checklist-editor-heading"><strong>Checklist tasks</strong><button type="button" className="text-button" onClick={() => setChecklistItems([...checklistItems, ''])}>+ Add task</button></div>{checklistItems.map((item, index) => <div className="checklist-input" key={index}><input value={item} onChange={(event) => setChecklistItems(checklistItems.map((current, itemIndex) => itemIndex === index ? event.target.value : current))} placeholder="Task name" /><button type="button" className="danger-button" onClick={() => setChecklistItems(checklistItems.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>)}</div><div className="form-actions"><button type="button" className="text-button" onClick={() => setIsFormOpen(false)}>Cancel</button><button className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add case type'}</button></div></form>}<div className="settings-list">{isLoading ? <p className="empty-state">Loading case types...</p> : caseTypes.length === 0 ? <p className="empty-state">No case types configured.</p> : caseTypes.map((caseType) => <article className="case-type-row" key={caseType.id}><div className="case-type-icon">CT</div><div className="case-type-copy"><strong>{caseType.name}</strong><span>{caseType.description || 'No description added'} · {caseType.checklist_items?.length || 0} checklist tasks</span></div><button className="text-button" onClick={() => openForm(caseType)}>Edit</button><button className="danger-button" onClick={() => deleteCaseType(caseType)}>Delete</button></article>)}</div></section>
}

export default App