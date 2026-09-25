import { useState } from 'react'
import { api, type Appointment } from '../../services/api'

function appointmentTaskSummary(appointment: Appointment) { return appointment.tasks?.length ? appointment.tasks.map((task) => task.title).join(', ') : appointment.patient_case.case_type.name }

export function AppointmentRow({ appointment, onUpdated, onDeleted }: { appointment: Appointment; onUpdated?: (appointment: Appointment) => void; onDeleted?: (id: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(appointment.appointment_date)
  const [status, setStatus] = useState(appointment.status)
  const [notes, setNotes] = useState(appointment.notes || '')
  const [error, setError] = useState<string | null>(null)
  const [hours, minutes] = appointment.start_time.split(':')
  const hour = Number(hours); const patient = appointment.patient_case.patient
  async function save() { try { const updated = await api.updateAppointment(appointment.id, { task_ids: appointment.tasks.map((task) => task.id), appointment_date: date, start_time: appointment.start_time, end_time: appointment.end_time, status, notes: notes || null }); onUpdated?.(updated); setEditing(false) } catch { setError('Unable to update this appointment.') } }
  async function remove() { if (!window.confirm('Delete this appointment?')) return; try { await api.deleteAppointment(appointment.id); onDeleted?.(appointment.id) } catch { setError('Unable to delete this appointment.') } }
  return <div className="appointment-row"><div className="appointment-time"><strong>{`${hour % 12 || 12}:${minutes}`}</strong><span>{hour >= 12 ? 'PM' : 'AM'}</span></div><div className="appointment-info"><strong>{patient.first_name} {patient.last_name}</strong><span>{appointmentTaskSummary(appointment)}</span></div>{editing ? <div className="appointment-edit-fields"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" /><button className="text-button" onClick={() => void save()}>Save</button><button className="text-button" onClick={() => setEditing(false)}>Cancel</button></div> : <><span className={`status ${appointment.status}`}>{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</span><div className="case-actions"><button className="text-button" onClick={() => setEditing(true)}>Edit</button><button className="danger-button" onClick={() => void remove()}>Delete</button></div></>}{error && <small className="error-text">{error}</small>}</div>
}
