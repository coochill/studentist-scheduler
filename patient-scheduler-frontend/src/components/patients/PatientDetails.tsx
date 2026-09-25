import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { api, type Appointment, type CaseType, type Patient, type PatientCase, type PatientCaseTask } from '../../services/api'

interface PatientDetailsProps {
  patient: Patient
  appointments: Appointment[]
  caseTypes: CaseType[]
  onBack: () => void
  onDeleted: () => void
}

export function PatientDetails({ patient, appointments, caseTypes, onBack, onDeleted }: PatientDetailsProps) {
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

  return (
    <section className="page-content">
      <button className="back-button" onClick={onBack}><ChevronRight size={16} />Back to patients</button>
      {error && <div className="api-alert" role="alert">{error}</div>}
      <div className="patient-detail-header">
        <div className="patient-detail-avatar">{patientRecord.first_name[0]}{patientRecord.last_name[0]}</div>
        <div><p className="section-kicker">Patient record</p><h2>{patientRecord.first_name} {patientRecord.last_name}</h2><span>{patientRecord.contact_number || 'No contact number'} · {patientRecord.address || 'No address recorded'}</span></div>
        <div className="patient-detail-actions"><button className="text-button" onClick={() => setIsEditing((open) => !open)}>{isEditing ? 'Close edit' : 'Edit patient'}</button><button className="danger-button" onClick={deletePatient}>Delete patient</button></div>
      </div>
      {isEditing && <PatientEditForm patient={patientRecord} onSaved={(updated) => { setPatientRecord(updated); setIsEditing(false) }} />}
      <div className="patient-detail-grid">
        <section className="content-panel">
          <div className="panel-heading"><div><p className="section-kicker">Patient cases</p><h3>{patientRecord.patient_cases.length} case{patientRecord.patient_cases.length === 1 ? '' : 's'}</h3></div><button className="primary-button" onClick={() => setIsFormOpen((open) => !open)}>{isFormOpen ? 'Close form' : 'Add case'}</button></div>
          {isFormOpen && <PatientCaseForm patientId={patientRecord.id} caseTypes={caseTypes} onCreated={(patientCase) => { setPatientRecord((current) => ({ ...current, patient_cases: [...current.patient_cases, patientCase] })); setIsFormOpen(false) }} />}
          {patientRecord.patient_cases.length === 0 ? <p className="empty-state">No cases have been added for this patient.</p> : patientRecord.patient_cases.map((patientCase) => <PatientCaseRow key={patientCase.id} patientCase={patientCase} patientId={patientRecord.id} caseTypes={caseTypes} onUpdated={(updated) => setPatientRecord((current) => ({ ...current, patient_cases: current.patient_cases.map((item) => item.id === updated.id ? updated : item) }))} onDeleted={(id) => setPatientRecord((current) => ({ ...current, patient_cases: current.patient_cases.filter((item) => item.id !== id) }))} />)}
        </section>
        <section className="content-panel patient-info-panel"><p className="section-kicker">Patient information</p><h3>Notes</h3><p className="detail-notes">{patientRecord.notes || 'No notes recorded.'}</p><p className="section-kicker">Date of birth</p><p className="detail-notes">{patientRecord.date_of_birth || 'Not provided'}</p></section>
      </div>
      <section className="content-panel patient-appointments-panel"><div className="panel-heading"><div><p className="section-kicker">Patient appointments</p><h3>{appointmentRows.length} appointment{appointmentRows.length === 1 ? '' : 's'}</h3></div></div>{appointmentRows.length === 0 ? <p className="empty-state">No appointments for this patient.</p> : appointmentRows.map((appointment) => <PatientAppointmentRow key={appointment.id} appointment={appointment} onUpdated={(updated) => setAppointmentRows((current) => current.map((item) => item.id === updated.id ? updated : item))} onDeleted={(id) => setAppointmentRows((current) => current.filter((item) => item.id !== id))} />)}</section>
    </section>
  )
}

function PatientEditForm({ patient, onSaved }: { patient: Patient; onSaved: (patient: Patient) => void }) {
  const [form, setForm] = useState({ first_name: patient.first_name, last_name: patient.last_name, contact_number: patient.contact_number || '', date_of_birth: patient.date_of_birth || '', address: patient.address || '', notes: patient.notes || '' })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setError(null); setIsSaving(true); try { onSaved(await api.updatePatient(patient.id, { ...form, contact_number: form.contact_number || null, date_of_birth: form.date_of_birth || null, address: form.address || null, notes: form.notes || null })) } catch { setError('Unable to update this patient.') } finally { setIsSaving(false) } }
  return <form className="patient-form" onSubmit={submit}>{error && <div className="api-alert" role="alert">{error}</div>}<div className="form-grid"><label>First name<input required value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label><label>Last name<input required value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label><label>Contact number<input value={form.contact_number} onChange={(event) => setForm({ ...form, contact_number: event.target.value })} /></label><label>Date of birth<input type="date" value={form.date_of_birth} onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })} /></label><label className="form-notes">Address<textarea rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label className="form-notes">Notes<textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div><div className="form-actions"><button className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save patient changes'}</button></div></form>
}

function PatientCaseForm({ patientId, caseTypes, onCreated }: { patientId: number; caseTypes: CaseType[]; onCreated: (patientCase: PatientCase) => void }) {
  const [caseTypeId, setCaseTypeId] = useState(''); const [details, setDetails] = useState(''); const [error, setError] = useState<string | null>(null); const [isSaving, setIsSaving] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setError(null); setIsSaving(true); try { onCreated(await api.createPatientCase({ patient_id: patientId, case_type_id: Number(caseTypeId), details: details || null })) } catch { setError('Unable to add this case. Select a valid case type and try again.') } finally { setIsSaving(false) } }
  return <form className="patient-case-form" onSubmit={submit}>{error && <div className="api-alert" role="alert">{error}</div>}<label>Case type<select required value={caseTypeId} onChange={(event) => setCaseTypeId(event.target.value)}><option value="">Select configured case type</option>{caseTypes.map((caseType) => <option key={caseType.id} value={caseType.id}>{caseType.name}</option>)}</select></label><label>Case details<textarea rows={3} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Add patient-specific case details" /></label><button className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save case'}</button></form>
}

function PatientCaseRow({ patientCase, patientId, caseTypes, onUpdated, onDeleted }: { patientCase: PatientCase; patientId: number; caseTypes: CaseType[]; onUpdated: (patientCase: PatientCase) => void; onDeleted: (id: number) => void }) {
  const [isEditing, setIsEditing] = useState(false); const [details, setDetails] = useState(patientCase.details || ''); const [caseTypeId, setCaseTypeId] = useState(String(patientCase.case_type_id)); const [error, setError] = useState<string | null>(null)
  async function save() { try { onUpdated(await api.updatePatientCase(patientCase.id, { patient_id: patientId, case_type_id: Number(caseTypeId), details: details || null })); setIsEditing(false) } catch { setError('Unable to update this case.') } }
  async function remove() { if (!window.confirm('Delete this patient case? Its appointments will also be deleted.')) return; try { await api.deletePatientCase(patientCase.id); onDeleted(patientCase.id) } catch { setError('Unable to delete this case.') } }
  if (isEditing) return <div className="detail-case-edit">{error && <div className="api-alert" role="alert">{error}</div>}<label>Case type<select value={caseTypeId} onChange={(event) => setCaseTypeId(event.target.value)}>{caseTypes.map((caseType) => <option key={caseType.id} value={caseType.id}>{caseType.name}</option>)}</select></label><label>Details<textarea rows={2} value={details} onChange={(event) => setDetails(event.target.value)} /></label><div className="case-actions"><button className="primary-button" onClick={() => void save()}>Save case</button><button className="text-button" onClick={() => setIsEditing(false)}>Cancel</button></div></div>
  return <><article className="detail-case"><div className="case-type-icon">CT</div><div><strong>{patientCase.case_type?.name || 'Unnamed case'}</strong><span>{patientCase.details || 'No case details recorded'}</span>{patientCase.images && patientCase.images.length > 0 && <small>{patientCase.images.length} image{patientCase.images.length === 1 ? '' : 's'}</small>}</div><div className="case-actions"><button className="text-button" onClick={() => setIsEditing(true)}>Edit</button><button className="danger-button" onClick={() => void remove()}>Delete</button></div></article><TaskList tasks={patientCase.tasks || []} /></>
}

function taskStatusLabel(status: PatientCaseTask['status']) { return status === 'in_progress' ? 'In progress' : status.charAt(0).toUpperCase() + status.slice(1) }
function formatAppointmentTime(startTime: string, endTime: string) { const format = (value: string) => { const [hours, minutes] = value.split(':'); const hour = Number(hours); return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}` }; return `${format(startTime)} - ${format(endTime)}` }
function TaskList({ tasks }: { tasks: PatientCaseTask[] }) { if (!tasks.length) return null; return <div className="task-list"><p className="task-list-title">Checklist</p>{tasks.map((task) => { const scheduled = (task.appointments ?? []).filter((appointment) => appointment.status !== 'cancelled'); return <div className={`task-row ${task.status === 'completed' ? 'completed' : ''}`} key={task.id}><span className={`task-check ${task.status === 'completed' ? 'done' : ''}`} aria-hidden="true">{task.status === 'completed' ? '✓' : ''}</span><div className="task-main"><strong>{task.title}</strong><span className={`status ${task.status}`}>{taskStatusLabel(task.status)}</span>{scheduled.length === 0 ? <small className="case-muted">Not yet scheduled.</small> : scheduled.map((appointment) => <small key={appointment.id}>{appointment.appointment_date} · {formatAppointmentTime(appointment.start_time, appointment.end_time)} ({appointment.status})</small>)}</div></div> })}</div> }

function PatientAppointmentRow({ appointment, onUpdated, onDeleted }: { appointment: Appointment; onUpdated: (appointment: Appointment) => void; onDeleted: (id: number) => void }) {
  const [isEditing, setIsEditing] = useState(false); const [date, setDate] = useState(appointment.appointment_date); const [status, setStatus] = useState(appointment.status); const [notes, setNotes] = useState(appointment.notes || ''); const [error, setError] = useState<string | null>(null)
  async function save() { try { onUpdated(await api.updateAppointment(appointment.id, { task_ids: appointment.tasks.map((task) => task.id), appointment_date: date, start_time: appointment.start_time, end_time: appointment.end_time, status, notes: notes || null })); setIsEditing(false) } catch { setError('Unable to update this appointment.') } }
  async function remove() { if (!window.confirm('Delete this appointment?')) return; try { await api.deleteAppointment(appointment.id); onDeleted(appointment.id) } catch { setError('Unable to delete this appointment.') } }
  return <div className="patient-appointment-row"><div><strong>{appointment.appointment_date}</strong><span>{appointment.start_time} - {appointment.end_time}</span><small>{appointment.tasks?.length ? appointment.tasks.map((task) => task.title).join(', ') : appointment.patient_case.case_type.name}</small></div>{isEditing ? <div className="appointment-edit-fields"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" /><button className="text-button" onClick={() => void save()}>Save</button></div> : <div className="case-actions"><span className={`status ${appointment.status}`}>{appointment.status}</span><button className="text-button" onClick={() => setIsEditing(true)}>Edit</button><button className="danger-button" onClick={() => void remove()}>Delete</button></div>}{error && <small className="error-text">{error}</small>}</div>
}
