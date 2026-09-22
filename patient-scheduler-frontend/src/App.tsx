import { useState, type ReactNode } from 'react'
import { Bell, CalendarDays, ChevronRight, LayoutDashboard, Menu, Search, Settings, Users, X } from 'lucide-react'
import './App.css'

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Patients', icon: Users },
  { label: 'Appointments', icon: CalendarDays },
  { label: 'Settings', icon: Settings },
]

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row"><div className="brand-mark">S</div><div><strong>Studentist</strong><span>Patient Scheduler</span></div><button className="icon-button close-menu-button" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
        <nav className="navigation" aria-label="Main navigation"><p className="nav-label">Workspace</p>{navigation.map(({ label, icon: Icon }, index) => <button className={`nav-item ${index === 0 ? 'active' : ''}`} key={label}><Icon size={19} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-footer"><div className="help-card"><p>Need a hand?</p><span>Visit the help center</span><ChevronRight size={16} /></div><p className="version-label">Patient Scheduler · v0.1</p></div>
      </aside>
      {isSidebarOpen && <button className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation" />}
      <main className="main-content">
        <header className="topbar"><div className="topbar-title"><button className="icon-button mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div><p className="eyebrow">Tuesday, September 22, 2026</p><h1>Good morning, Studentist</h1></div></div><div className="topbar-actions"><button className="icon-button" aria-label="Search"><Search size={19} /></button><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span /></button><div className="profile-chip"><span className="avatar">DR</span><span className="profile-name">Dr. Reyes</span></div></div></header>
        <section className="page-content">
          <div className="welcome-row"><div><p className="section-kicker">Overview</p><h2>Your clinic at a glance</h2></div><button className="primary-button"><CalendarDays size={17} />Schedule appointment</button></div>
          <div className="summary-grid"><SummaryCard label="Total patients" value="128" detail="12 added this month" tone="mint" icon={<Users size={20} />} /><SummaryCard label="Today's appointments" value="08" detail="2 appointments remaining" tone="peach" icon={<CalendarDays size={20} />} /><SummaryCard label="Open patient cases" value="34" detail="Across 19 patients" tone="lilac" icon={<LayoutDashboard size={20} />} /></div>
          <div className="dashboard-grid"><section className="content-panel"><div className="panel-heading"><div><p className="section-kicker">Today</p><h3>Upcoming appointments</h3></div><button className="text-button">View calendar <ChevronRight size={16} /></button></div><Appointment time="09:00" period="AM" patient="Maria Santos" caseName="CMR" status="Confirmed" /><Appointment time="10:30" period="AM" patient="Juan Dela Cruz" caseName="Jacket Crown" status="Confirmed" /><Appointment time="02:00" period="PM" patient="Andrea Flores" caseName="Tooth Extraction" status="Pending" /></section><section className="content-panel"><div className="panel-heading"><div><p className="section-kicker">Recent activity</p><h3>Patient updates</h3></div></div><Activity initials="MS" name="Maria Santos" text="Case details updated" time="20 min ago" /><Activity initials="JD" name="Juan Dela Cruz" text="New patient case added" time="1 hr ago" /><Activity initials="AF" name="Andrea Flores" text="Appointment scheduled" time="Yesterday" /></section></div>
        </section>
      </main>
    </div>
  )
}

function SummaryCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: string; icon: ReactNode }) { return <article className="summary-card"><div className={`summary-icon ${tone}`}>{icon}</div><p>{label}</p><strong>{value}</strong><span>{detail}</span></article> }
function Appointment({ time, period, patient, caseName, status }: { time: string; period: string; patient: string; caseName: string; status: string }) { return <div className="appointment-row"><div className="appointment-time"><strong>{time}</strong><span>{period}</span></div><div className="appointment-info"><strong>{patient}</strong><span>{caseName}</span></div><span className={`status ${status.toLowerCase()}`}>{status}</span></div> }
function Activity({ initials, name, text, time }: { initials: string; name: string; text: string; time: string }) { return <div className="activity-row"><span className="activity-avatar">{initials}</span><div><strong>{name}</strong><span>{text}</span></div><time>{time}</time></div> }

export default App