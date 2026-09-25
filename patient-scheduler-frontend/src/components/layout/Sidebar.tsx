import { CalendarDays, ChevronRight, LayoutDashboard, Settings, Users, X } from 'lucide-react'
import schedpxIcon from '../../assets/logo.svg'

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Patients', icon: Users },
  { label: 'Appointments', icon: CalendarDays },
  { label: 'Settings', icon: Settings },
]

interface SidebarProps {
  activePage: string
  isOpen: boolean
  onNavigate: (page: string) => void
  onClose: () => void
}

export function Sidebar({ activePage, isOpen, onNavigate, onClose }: SidebarProps) {
  return <>
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><img src={schedpxIcon} alt="SchedPx" className="brand-logo" /><button className="icon-button close-menu-button" onClick={onClose} aria-label="Close navigation"><X size={19} /></button></div>
      <nav className="navigation" aria-label="Main navigation"><p className="nav-label">Workspace</p>{navigation.map(({ label, icon: Icon }) => <button className={`nav-item ${activePage === label ? 'active' : ''}`} key={label} onClick={() => onNavigate(label)}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer"><div className="help-card"><p>Need a hand?</p><span>Visit the help center</span><ChevronRight size={16} /></div><p className="version-label">Patient Scheduler · v0.1</p></div>
    </aside>
    {isOpen && <button className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" />}
  </>
}
