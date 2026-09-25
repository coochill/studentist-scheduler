import { useState } from 'react'
import { ChevronRight, Search, Users } from 'lucide-react'
import { api, type Appointment, type CaseType, type Patient } from '../../services/api'
import { PatientDetails } from './PatientDetails'
import { PatientForm } from './PatientForm'

export function PatientList({
  patients,
  appointments,
  caseTypes,
  isLoading,
  loadError,
  onCreated,
  onUpdated,
  onDeleted,
  onAppointmentUpdated,
  onAppointmentDeleted,
}: {
  patients: Patient[]
  appointments: Appointment[]
  caseTypes: CaseType[]
  isLoading: boolean
  loadError: string | null
  onCreated: (patient: Patient) => void
  onUpdated: (updated: Patient) => void
  onDeleted: (id: number) => void
  onAppointmentUpdated: (appointment: Appointment) => void
  onAppointmentDeleted: (id: number) => void
}) {
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<Patient | null>(null)

  if (selected) {
    return (
      <PatientDetails
        patient={selected}
        appointments={appointments.filter((item) => item.patient_case.patient.id === selected.id)}
        caseTypes={caseTypes}
        onBack={() => setSelected(null)}
        onUpdated={onUpdated}
        onDeleted={() => {
          onDeleted(selected.id)
          setSelected(null)
        }}
        onAppointmentUpdated={onAppointmentUpdated}
        onAppointmentDeleted={onAppointmentDeleted}
      />
    )
  }

  const filtered = patients.filter((patient) =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section className="page-content">
      <div className="welcome-row">
        <div>
          <p className="section-kicker">Patient records</p>
          <h2>Patients</h2>
        </div>
        <button className="primary-button" onClick={() => setFormOpen((open) => !open)}>
          <Users size={17} />
          {formOpen ? 'Close form' : 'Add patient'}
        </button>
      </div>
      {loadError && <div className="api-alert" role="alert">{loadError}</div>}
      {formOpen && (
        <PatientForm
          onCreated={(patient) => {
            onCreated(patient)
            setFormOpen(false)
            setSelected(patient)
          }}
        />
      )}
      <div className="patients-toolbar">
        <div className="patient-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patients"
            aria-label="Search patients"
          />
        </div>
        <span>{isLoading ? 'Loading...' : `${filtered.length} patient${filtered.length === 1 ? '' : 's'}`}</span>
      </div>
      <div className="patient-list">
        {isLoading ? (
          <p className="empty-state">Loading patient records...</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No patients found.</p>
        ) : (
          filtered.map((patient) => {
            const tasks = patient.patient_cases.flatMap((item) => item.tasks ?? [])
            const completed = tasks.length > 0 && tasks.every((task) => task.status === 'completed')
            return (
              <article className="patient-row" key={patient.id}>
                <div className="patient-avatar">
                  {patient.first_name[0]}
                  {patient.last_name[0]}
                </div>
                <div className="patient-main">
                  <strong>
                    {patient.first_name} {patient.last_name}
                  </strong>
                  <span>{patient.contact_number || 'No contact number'}</span>
                </div>
                <div className="patient-address">{patient.address || 'No address recorded'}</div>
                <div className="patient-cases">
                  {patient.patient_cases.length ? (
                    patient.patient_cases.slice(0, 3).map((item) => (
                      <span key={item.id}>{item.case_type?.name || 'Unnamed case'}</span>
                    ))
                  ) : (
                    <span className="case-muted">No cases</span>
                  )}
                </div>
                <div className="patient-status">
                  {completed && <span className="patient-completed">Completed</span>}
                </div>
                <button
                  className="text-button patient-view-button"
                  onClick={() => void api.getPatient(patient.id).then(setSelected)}
                >
                  View <ChevronRight size={15} />
                </button>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}