import type { ReactNode } from 'react'

export function StatCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: string; icon: ReactNode }) {
  return <article className="summary-card"><div className={`summary-icon ${tone}`}>{icon}</div><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>
}
