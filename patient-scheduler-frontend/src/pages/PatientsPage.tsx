import type { Appointment, CaseType, Patient } from '../services/api'
import { PatientList } from '../components/patients/PatientList'

export function PatientsPage(props: {
  patients: Patient[]
  appointments: Appointment[]
  caseTypes: CaseType[]
  isLoading: boolean
  loadError: string | null
  onCreated: (patient: Patient) => void
  onUpdated: (patient: Patient) => void
  onDeleted: (id: number) => void
  onAppointmentUpdated: (appointment: Appointment) => void
  onAppointmentDeleted: (id: number) => void
}) {
  return <PatientList {...props} />
}