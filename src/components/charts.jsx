import { useTheme } from '../context'
import { RA_DIMS, MONTHS } from '../data'
import { riskColor } from '../utils'

// ─── RADAR CHART ──────────────────────────────────────────────────────────────
export function RadarChart({ scores, size = 220 }) {
  const t = useTheme()
  const cx = size / 2, cy = size / 2
  const r = size / 2 - 32
  const n = RA_DIMS.length
  const angle = i => (i * 2 * Math.PI / n) - Math.PI / 2

  const gridRings = [20, 40, 60, 80, 100].map(pct => (
    <circle key={pct} cx={cx} cy={cy} r={r * pct / 100} fill="none" stroke={t.border} strokeWidth="1" />
  ))

  const axes = RA_DIMS.map((d, i) => {
    const a = angle(i)
    const x2 = cx + r * Math.cos(a)
    const y2 = cy + r * Math.sin(a)
    const lx = cx + (r + 20) * Math.cos(a)
    const ly = cy + (r + 20) * Math.sin(a)
    const anchor = Math.cos(a) > 0.1 ? 'start' : Math.cos(a) < -0.1 ? 'end' : 'middle'
    return (
      <g key={d.key}>
        <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={t.border} strokeWidth="1" />
        <text x={lx} y={ly + 4} textAnchor={anchor} fill={t.text3} fontSize="10" fontFamily="DM Sans,sans-serif" fontWeight="600">{d.label}</text>
      </g>
    )
  })

  const points = RA_DIMS.map((d, i) => {
    const val = (scores[d.key] || 0) / 100
    const a = angle(i)
    return `${cx + r * val * Math.cos(a)},${cy + r * val * Math.sin(a)}`
  }).join(' ')

  const dots = RA_DIMS.map((d, i) => {
    const val = (scores[d.key] || 0) / 100
    const a = angle(i)
    return <circle key={d.key} cx={cx + r * val * Math.cos(a)} cy={cy + r * val * Math.sin(a)} r="3.5" fill="#6366f1" />
  })

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridRings}{axes}
      <polygon points={points} fill="#6366f1" fillOpacity=".15" stroke="#6366f1" strokeWidth="2.5" />
      {dots}
    </svg>
  )
}

// ─── BAR CHART ────────────────────────────────────────────────────────────────
export function BarChart({ vendors }) {
  const t = useTheme()
  const W = 520, H = 180
  const startX = 40, usableH = H - 30
  const barW = Math.floor((W - startX - 20) / vendors.length) - 10

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {[0, 25, 50, 75, 100].map(v => {
        const y = usableH - (v / 100) * usableH + 5
        return (
          <g key={v}>
            <text x={35} y={y + 3} textAnchor="end" fill={t.text3} fontSize="9" fontFamily="DM Sans,sans-serif">{v}</text>
            <line x1={startX} y1={y} x2={W} y2={y} stroke={t.border} strokeWidth="0.5" strokeDasharray="3" />
          </g>
        )
      })}
      {vendors.map((v, i) => {
        const barH = (v.riskScore / 100) * usableH
        const x = startX + i * ((W - startX) / vendors.length) + 5
        const y = usableH - barH + 5
        const color = riskColor(v.riskScore)
        return (
          <g key={v.id}>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill={color} />
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fill={t.text3} fontSize="10" fontFamily="DM Sans,sans-serif">{v.name.split(' ')[0]}</text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill={color} fontSize="10" fontFamily="DM Sans,sans-serif" fontWeight="700">{v.riskScore}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── LINE CHART ───────────────────────────────────────────────────────────────
export function MiniLine({ data, color, height = 80 }) {
  const t = useTheme()
  const W = 300
  const min = Math.min(...data) - 5
  const max = Math.max(...data) + 5
  const range = max - min || 1

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = height - ((v - min) / range) * height
    return [x, y]
  })

  const polyPts = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const areaPath = `M ${pts.map(([x, y]) => `${x},${y}`).join(' L ')} L ${W},${height} L 0,${height} Z`
  const gradId = `grad-${color.replace('#', '')}`

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <polyline points={polyPts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {MONTHS.map(m => <span key={m} style={{ fontSize: 9, color: t.text3 }}>{m}</span>)}
      </div>
    </div>
  )
}
