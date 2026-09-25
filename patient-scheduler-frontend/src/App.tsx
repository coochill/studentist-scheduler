import { useEffect, useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { DashboardPage } from './pages/DashboardPage'
import { PatientsPage } from './pages/PatientsPage'
import { SettingsPage } from './pages/SettingsPage'
import { api, type Appointment, type CaseType, type Patient } from './services/api'
import './App.css'

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [shouldOpenAppointmentForm, setShouldOpenAppointmentForm] = useState(false)

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

  function addPatient(patient: Patient) {
    setPatients((current) => [...current, patient].sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)))
  }

  function addAppointment(appointment: Appointment) {
    setAppointments((current) => [...current, appointment].sort((a, b) => `${a.appointment_date}${a.start_time}`.localeCompare(`${b.appointment_date}${b.start_time}`)))
  }

  function renderPage() {
    if (activePage === 'Patients') return <PatientsPage patients={patients} appointments={appointments} caseTypes={caseTypes} isLoading={isLoading} loadError={loadError} onCreated={addPatient} onDeleted={(id) => setPatients((current) => current.filter((patient) => patient.id !== id))} />
    if (activePage === 'Appointments') return <AppointmentsPage appointments={appointments} patients={patients} isLoading={isLoading} loadError={loadError} autoOpenForm={shouldOpenAppointmentForm} onAutoOpenHandled={() => setShouldOpenAppointmentForm(false)} onCreated={addAppointment} onUpdated={(updated) => setAppointments((current) => current.map((item) => item.id === updated.id ? updated : item))} onDeleted={(id) => setAppointments((current) => current.filter((item) => item.id !== id))} />
    if (activePage === 'Settings') return <SettingsPage caseTypes={caseTypes} isLoading={isLoading} loadError={loadError} onChanged={setCaseTypes} />
    return <DashboardPage patients={patients} appointments={appointments} isLoading={isLoading} loadError={loadError} onSchedule={() => { setActivePage('Appointments'); setShouldOpenAppointmentForm(true) }} />
  }

  return <AppLayout activePage={activePage} isSidebarOpen={isSidebarOpen} onNavigate={setActivePage} onOpenSidebar={() => setIsSidebarOpen(true)} onCloseSidebar={() => setIsSidebarOpen(false)}>{renderPage()}</AppLayout>
}

export default App
