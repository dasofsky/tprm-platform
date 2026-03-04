import { useTheme } from '../context'
import { roleStyle, avatarGrad, alertStyle, riskColor, riskLabel } from '../utils'

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  const t = useTheme()
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, ...style }}>
      {children}
    </div>
  )
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', disabled = false, small = false, style = {} }) {
  const t = useTheme()
  const base = {
    padding: small ? '4px 11px' : '9px 18px',
    borderRadius: 8, fontSize: small ? 11 : 13, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
    fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
    gap: 6, opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', transition: 'opacity .15s',
  }
  const variants = {
    primary: { background: '#0f172a', color: '#fff' },
    accent:  { background: '#6366f1', color: '#fff' },
    ghost:   { background: 'transparent', color: t.text2, border: `1px solid ${t.border}` },
    danger:  { background: '#dc2626', color: '#fff' },
    danger:  { background: t.dangerBg, color: t.dangerText, border: `1px solid ${t.dangerText}44` },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
export function Inp({ value, onChange, placeholder, type = 'text', style = {}, disabled = false }) {
  const t = useTheme()
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} disabled={disabled}
      style={{ width: '100%', padding: '9px 12px', border: `1px solid ${t.border}`, borderRadius: 8,
        fontSize: 13, outline: 'none', color: t.text, background: disabled ? t.surface2 : t.inputBg,
        boxSizing: 'border-box', opacity: disabled ? 0.6 : 1, ...style }} />
  )
}

// ─── SELECT ───────────────────────────────────────────────────────────────────
export function Sel({ value, onChange, options, style = {} }) {
  const t = useTheme()
  return (
    <select value={value} onChange={onChange}
      style={{ width: '100%', padding: '9px 12px', border: `1px solid ${t.border}`, borderRadius: 8,
        fontSize: 13, outline: 'none', color: t.text, background: t.inputBg, cursor: 'pointer', ...style }}>
      {options.map(o => <option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}
    </select>
  )
}

// ─── TAB BUTTON ───────────────────────────────────────────────────────────────
export function TBtn({ active, onClick, children }) {
  const t = useTheme()
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
      cursor: 'pointer', border: 'none', fontFamily: 'inherit',
      background: active ? t.surface : 'transparent',
      color: active ? t.text : t.text3,
      boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
      whiteSpace: 'nowrap', transition: 'all .15s',
    }}>
      {children}
    </button>
  )
}

// ─── TAB BAR ──────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onChange, style = {} }) {
  const t = useTheme()
  return (
    <div style={{ display: 'flex', gap: 2, background: t.surface2, padding: 3, borderRadius: 10, border: `1px solid ${t.border}`, width: 'fit-content', ...style }}>
      {tabs.map(([id, label]) => <TBtn key={id} active={active === id} onClick={() => onChange(id)}>{label}</TBtn>)}
    </div>
  )
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
export function Toggle({ on, onToggle }) {
  const t = useTheme()
  return (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ width: 40, height: 22, borderRadius: 11, background: on ? '#6366f1' : t.border, transition: 'background .2s', position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: on ? 21 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </div>
    </div>
  )
}

// ─── SCORE PILL ───────────────────────────────────────────────────────────────
export function ScorePill({ score }) {
  const c = riskColor(score)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: c }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
      {score} <span style={{ fontWeight: 400, fontSize: 11, color: '#94a3b8' }}>({riskLabel(score)})</span>
    </span>
  )
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
export function SBadge({ status }) {
  const t = useTheme()
  const map = {
    Active:         { bg: t.successBg, c: t.successText, b: t.successText + '44' },
    'Under Review': { bg: t.warnBg,    c: t.warnText,    b: t.warnText + '44' },
    Onboarding:     { bg: '#f0f9ff',   c: '#0284c7',     b: '#bae6fd' },
    inactive:       { bg: t.surface2,  c: t.text3,       b: t.border },
    active:         { bg: t.successBg, c: t.successText, b: t.successText + '44' },
  }
  const s = map[status] || { bg: t.surface2, c: t.text3, b: t.border }
  return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, border: `1px solid ${s.b}`, background: s.bg, color: s.c }}>{status}</span>
}

// ─── ROLE BADGE ───────────────────────────────────────────────────────────────
export function RoleBadge({ role }) {
  const rc = roleStyle(role)
  return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.c, border: `1px solid ${rc.b}`, textTransform: 'capitalize' }}>{role}</span>
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
export function Avatar({ user, size = 32 }) {
  const [c1, c2] = avatarGrad(user)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg,${c1},${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * .35, fontWeight: 700, flexShrink: 0, letterSpacing: '-.02em' }}>
      {user.initials}
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle }) {
  const t = useTheme()
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontWeight: 800, fontSize: 21, color: t.text, letterSpacing: '-.025em', margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: t.text2, marginTop: 3 }}>{subtitle}</p>}
    </div>
  )
}

// ─── ALERT ROW ────────────────────────────────────────────────────────────────
export function AlertRow({ alert, vendorName }) {
  const t = useTheme()
  const s = alertStyle(alert.type)
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${t.border2}` }}>
      <div style={{ width: 4, background: s.bar, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '12px 16px', background: t.dark ? t.surface : `${s.bg}88`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>{s.icon}</span>
          <div>
            {vendorName && <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{vendorName}</div>}
            <div style={{ fontSize: 12, color: t.text2 }}>{alert.msg}</div>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: s.text, background: s.bg, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', flexShrink: 0 }}>{alert.type}</span>
      </div>
    </div>
  )
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, color = '#6366f1' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin .8s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity=".2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
