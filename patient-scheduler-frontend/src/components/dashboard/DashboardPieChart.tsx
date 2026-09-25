interface ChartItem { label: string; value: number; color: string }

export function DashboardPieChart({ data, centerValue, centerLabel }: { data: ChartItem[]; centerValue: number; centerLabel: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cumulative = 0
  const stops = data.map((item) => { const start = total ? cumulative / total * 360 : 0; cumulative += item.value; const end = total ? cumulative / total * 360 : 0; return `${item.color} ${start}deg ${end}deg` }).join(', ')
  return <div className="pie-chart-wrap"><div className="pie-chart-shell"><div className="pie-chart" role="img" aria-label={data.map((item) => `${item.label}: ${item.value}`).join(', ')} style={{ background: total ? `conic-gradient(${stops})` : '#e5e7eb' }} /><div className="pie-chart-center"><strong>{centerValue}</strong><span>{centerLabel}</span></div></div><ul className="pie-chart-legend">{data.map((item) => <li key={item.label}><span className="pie-chart-swatch" style={{ backgroundColor: item.color }} /><span>{item.label}</span><strong>{item.value}</strong></li>)}</ul></div>
}
