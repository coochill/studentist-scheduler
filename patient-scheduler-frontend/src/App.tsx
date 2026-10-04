import { useEffect, useState } from 'react'
import { AuthPage } from './components/AuthPage'
import { endSession, isAuthenticated } from './auth'
import { AppLayout } from './components/layout/AppLayout'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { DashboardPage } from './pages/DashboardPage'
import { PatientsPage } from './pages/PatientsPage'
import { SettingsPage } from './pages/SettingsPage'
import { api, type Appointment, type CaseType, type Patient } from './services/api'
import './App.css'

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated)
  const [activePage, setActivePage] = useState('Dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [shouldOpenAppointmentForm, setShouldOpenAppointmentForm] = useState(false)

  useEffect(() => {
    const preventStalePageRestore = (event: PageTransitionEvent) => {
      if (!authenticated || !event.persisted) return
      window.location.replace(window.location.href)
    }
    const preventBackIntoSession = () => {
      if (!isAuthenticated()) {
        window.history.pushState(null, '', window.location.href)
      }
    }

    window.addEventListener('pageshow', preventStalePageRestore)
    window.addEventListener('popstate', preventBackIntoSession)
    window.history.replaceState({ authenticated }, '', window.location.href)
    return () => {
      window.removeEventListener('pageshow', preventStalePageRestore)
      window.removeEventListener('popstate', preventBackIntoSession)
    }
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return
    Promise.all([api.getPatients(), api.getAppointments(), api.getCaseTypes()])
      .then(([patientData, appointmentData, caseTypeData]) => {
        setPatients(patientData)
        setAppointments(appointmentData)
        setCaseTypes(caseTypeData)
      })
      .catch(() => setLoadError('Unable to load live clinic data. Start the Laravel API and try again.'))
      .finally(() => setIsLoading(false))
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return
    const refreshAppointments = () => {
      setIsRefreshing(true)
      api.getAppointments().then(setAppointments).catch(() => undefined).finally(() => setIsRefreshing(false))
    }
    const interval = window.setInterval(refreshAppointments, 7000)
    return () => window.clearInterval(interval)
  }, [authenticated])

  function addPatient(patient: Patient) {
    setPatients((current) => [...current, patient].sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)))
  }

  function addAppointment(appointment: Appointment) {
    setAppointments((current) => [...current, appointment].sort((a, b) => `${a.appointment_date}${a.start_time}`.localeCompare(`${b.appointment_date}${b.start_time}`)))
  }

  function updatePatient(updated: Patient) {
    setPatients((current) =>
      current.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    )
  }

  function updateAppointment(updated: Appointment) {
    setAppointments((current) =>
      current.map((a) => (a.id === updated.id ? updated : a))
    )
  }

  function renderPage() {
    if (activePage === 'Patients')
  return (
    <PatientsPage
      patients={patients}
      appointments={appointments}
      caseTypes={caseTypes}
      isLoading={isLoading}
      loadError={loadError}
      onCreated={addPatient}
      onUpdated={updatePatient}
      onDeleted={(id) => setPatients((current) => current.filter((p) => p.id !== id))}
      onAppointmentUpdated={updateAppointment}
      onAppointmentDeleted={(id) => setAppointments((current) => current.filter((a) => a.id !== id))}
    />
  )
    if (activePage === 'Appointments') return <AppointmentsPage appointments={appointments} patients={patients} isLoading={isLoading} isRefreshing={isRefreshing} loadError={loadError} autoOpenForm={shouldOpenAppointmentForm} onAutoOpenHandled={() => setShouldOpenAppointmentForm(false)} onCreated={addAppointment} onUpdated={(updated) => setAppointments((current) => current.map((item) => item.id === updated.id ? updated : item))} onDeleted={(id) => setAppointments((current) => current.filter((item) => item.id !== id))} />
    if (activePage === 'Settings') return <SettingsPage caseTypes={caseTypes} isLoading={isLoading} loadError={loadError} onChanged={setCaseTypes} />
    return <DashboardPage patients={patients} appointments={appointments} isLoading={isLoading} loadError={loadError} onSchedule={() => { setActivePage('Appointments'); setShouldOpenAppointmentForm(true) }} onViewCalendar={() => setActivePage('Appointments')} />
  }

  if (!authenticated) {
    return <AuthPage onAuthenticated={() => {
      window.history.replaceState({ authenticated: true }, '', window.location.href)
      setAuthenticated(true)
    }} />
  }

  return <AppLayout activePage={activePage} isSidebarOpen={isSidebarOpen} onNavigate={setActivePage} onOpenSidebar={() => setIsSidebarOpen(true)} onCloseSidebar={() => setIsSidebarOpen(false)} onLogout={() => {
    void endSession()
    window.history.replaceState({ authenticated: false }, '', window.location.href)
    setAuthenticated(false)
  }}>{renderPage()}</AppLayout>
}

export default App
