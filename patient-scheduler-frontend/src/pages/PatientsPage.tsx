import type { Appointment, CaseType, Patient } from '../services/api'
import { PatientList } from '../components/patients/PatientList'

export function PatientsPage(props: { patients: Patient[]; appointments: Appointment[]; caseTypes: CaseType[]; isLoading: boolean; loadError: string | null; onCreated: (patient: Patient) => void; onDeleted: (id: number) => void }) { return <PatientList {...props} /> }
