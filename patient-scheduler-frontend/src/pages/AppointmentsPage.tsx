import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { Appointment, Patient } from '../services/api'
import { AppointmentForm } from '../components/appointments/AppointmentForm'
import { AppointmentRow } from '../components/appointments/AppointmentRow'

export function AppointmentsPage({ appointments, patients, isLoading, loadError, autoOpenForm, onAutoOpenHandled, onCreated, onUpdated, onDeleted }: { appointments: Appointment[]; patients: Patient[]; isLoading: boolean; loadError: string | null; autoOpenForm: boolean; onAutoOpenHandled: () => void; onCreated: (appointment: Appointment) => void; onUpdated: (appointment: Appointment) => void; onDeleted: (id: number) => void }) {
  const [formOpen, setFormOpen] = useState(false); const [filter, setFilter] = useState('')
  useEffect(() => { if (autoOpenForm) onAutoOpenHandled() }, [autoOpenForm, onAutoOpenHandled])
  const isFormOpen = formOpen || autoOpenForm
  const visible = filter ? appointments.filter((item) => item.status === filter) : appointments
  return <section className="page-content"><div className="welcome-row"><div><p className="section-kicker">Clinic schedule</p><h2>Appointments</h2></div><button className="primary-button" onClick={() => setFormOpen((open) => !open)}><CalendarDays size={17} />{isFormOpen ? 'Close form' : 'Schedule appointment'}</button></div>{loadError && <div className="api-alert" role="alert">{loadError}</div>}{isFormOpen && <AppointmentForm patients={patients} onCreated={(item) => { onCreated(item); setFormOpen(false) }} />}<div className="appointments-toolbar"><div><p className="section-kicker">All appointments</p><h3>{visible.length} scheduled</h3></div><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter appointments by status"><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><div className="appointment-list">{isLoading ? <p className="empty-state">Loading appointments...</p> : visible.length ? visible.map((item) => <AppointmentRow key={item.id} appointment={item} onUpdated={onUpdated} onDeleted={onDeleted} />) : <p className="empty-state">No appointments found.</p>}</div></section>
}
