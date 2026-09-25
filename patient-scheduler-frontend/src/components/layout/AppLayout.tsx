import { Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  activePage: string
  isSidebarOpen: boolean
  onNavigate: (page: string) => void
  onOpenSidebar: () => void
  onCloseSidebar: () => void
  children: ReactNode
}

export function AppLayout({ activePage, isSidebarOpen, onNavigate, onOpenSidebar, onCloseSidebar, children }: AppLayoutProps) {
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const date = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return <div className="app-shell"><Sidebar activePage={activePage} isOpen={isSidebarOpen} onNavigate={(page) => { onNavigate(page); onCloseSidebar() }} onClose={onCloseSidebar} /><main className="main-content"><header className="topbar"><div className="topbar-title"><button className="icon-button mobile-menu-button" onClick={onOpenSidebar} aria-label="Open navigation"><Menu size={20} /></button><div><p className="eyebrow">{date}</p><h1>{greeting}, Studentist</h1></div></div><div className="topbar-actions"><div className="profile-chip"><span className="avatar">DR</span><span className="profile-name">Dr. Mirania</span></div></div></header>{children}</main></div>
}
