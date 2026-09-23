export interface CaseType {
  id: number
  name: string
  description: string | null
  checklist_items?: ChecklistItem[]
}

export interface ChecklistItem {
  id: number
  case_type_id: number
  title: string
  sort_order: number
}

// A trimmed-down view of an appointment, attached to each task so patient
// details can display "when is/was this task scheduled" without pulling
// in the full Appointment shape (patient, case, other tasks, etc).
export interface TaskAppointment {
  id: number
  appointment_date: string
  start_time: string
  end_time: string
  status: string
}

export interface PatientCaseTask {
  id: number
  patient_case_id: number
  case_type_checklist_item_id: number | null
  title: string
  start_date: string | null
  expected_end_date: string | null
  completed_date: string | null
  status: 'pending' | 'in_progress' | 'completed'
  // Computed by the backend: true once this task has a linked appointment
  // whose status is "completed".
  can_complete: boolean
  // The appointment(s) this task is scheduled under. Status and dates on
  // the task above are now derived automatically from these rather than
  // entered manually.
  appointments?: TaskAppointment[]
}

export interface PatientCase {
  id: number
  patient_id: number
  case_type_id: number
  details: string | null
  case_type?: CaseType
  images?: CaseImage[]
  tasks?: PatientCaseTask[]
  appointments?: Appointment[]
}

export interface CaseImage {
  id: number
  patient_case_id: number
  image_path: string
}

export interface Patient {
  id: number
  first_name: string
  last_name: string
  contact_number: string | null
  date_of_birth: string | null
  address: string | null
  notes: string | null
  patient_cases: PatientCase[]
}

export interface Appointment {
  id: number
  patient_case_id: number
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  patient_case: PatientCase & { patient: Patient; case_type: CaseType }
  // One or more checklist tasks this appointment was booked for. All of
  // them belong to the same patient_case as patient_case_id above.
  tasks: PatientCaseTask[]
}

// Appointments are now created/updated from a set of tasks rather than a
// case directly — the backend derives patient_case_id from the tasks.
export interface AppointmentPayload {
  task_ids: number[]
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  getPatients: (search = '') => request<Patient[]>(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getPatient: (id: number) => request<Patient>(`/patients/${id}`),
  updatePatient: (id: number, payload: Omit<Patient, 'id' | 'patient_cases'>) => request<Patient>(`/patients/${id}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  deletePatient: (id: number) => request<void>(`/patients/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  }),
  createPatientCase: (payload: { patient_id: number; case_type_id: number; details: string | null }) => request<PatientCase>('/patient-cases', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  updatePatientCase: (id: number, payload: { patient_id: number; case_type_id: number; details: string | null }) => request<PatientCase>(`/patient-cases/${id}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  deletePatientCase: (id: number) => request<void>(`/patient-cases/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  }),
  createPatient: (payload: Omit<Patient, 'id' | 'patient_cases'>) => request<Patient>('/patients', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  getAppointments: () => request<Appointment[]>('/appointments'),
  getCaseTypes: () => request<CaseType[]>('/case-types'),
  createCaseType: (payload: { name: string; description: string | null; checklist_items: string[] }) => request<CaseType>('/case-types', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  updateCaseType: (id: number, payload: { name: string; description: string | null; checklist_items: string[] }) => request<CaseType>(`/case-types/${id}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  deleteCaseType: (id: number) => request<void>(`/case-types/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  }),
  createAppointment: (payload: AppointmentPayload) => request<Appointment>('/appointments', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  updateAppointment: (id: number, payload: AppointmentPayload) => request<Appointment>(`/appointments/${id}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  deleteAppointment: (id: number) => request<void>(`/appointments/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  }),
  updatePatientCaseTask: (id: number, payload: Pick<PatientCaseTask, 'start_date' | 'expected_end_date' | 'completed_date' | 'status'>) => request<PatientCaseTask>(`/patient-case-tasks/${id}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
}