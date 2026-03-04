import { useState } from 'react'
import { useTheme, useAuth } from '../context'
import { Avatar, TBtn } from './ui'

const NAV_TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'dd',         label: 'Due Diligence' },
  { id: 'ra',         label: 'Risk Assessment' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'settings',   label: '⚙ Settings' },
]

export function Navbar({ activeTab, onTabChange, vendorOpen }) {
  const t = useTheme()
  const { users, currentUser, setCurrentUser } = useAuth()
  const [showSwitcher, setShowSwitcher] = useState(false)

  return (
    <div style={{ background: t.navBg, borderBottom: `1px solid ${t.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 40, boxShadow: `0 1px 6px rgba(0,0,0,${t.dark ? .25 : .05})`, transition: 'background .25s' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#0f172a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#a5f3fc', fontSize: 16 }}>◈</span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: t.text, letterSpacing: '-.02em' }}>TPRM Platform</div>
          <div style={{ fontSize: 10, color: t.text3, fontWeight: 500, letterSpacing: '.07em', textTransform: 'uppercase' }}>Third-Party Risk</div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div style={{ display: 'flex', gap: 2, background: t.surface2, padding: 3, borderRadius: 10, border: `1px solid ${t.border}` }}>
        {NAV_TABS.map(nt => (
          <TBtn key={nt.id} active={activeTab === nt.id && !vendorOpen} onClick={() => onTabChange(nt.id)}>
            {nt.label}
          </TBtn>
        ))}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Dark mode toggle */}
        <button onClick={t.toggle} title={t.dark ? 'Light Mode' : 'Dark Mode'}
          style={{ width: 32, height: 32, borderRadius: 8, background: t.surface2, border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {t.dark ? '☀️' : '🌙'}
        </button>

        {/* User switcher */}
        <div style={{ position: 'relative' }}>
          <div onClick={() => setShowSwitcher(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface2 }}>
            <Avatar user={currentUser} size={26} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{currentUser.name.split(' ')[0]}</div>
              <div style={{ fontSize: 10, color: t.text3, textTransform: 'capitalize' }}>{currentUser.role}</div>
            </div>
            <span style={{ fontSize: 10, color: t.text3 }}>▾</span>
          </div>

          {showSwitcher && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 8, minWidth: 220, boxShadow: `0 8px 28px rgba(0,0,0,${t.dark ? .5 : .14})`, zIndex: 50 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', padding: '4px 8px 6px' }}>Switch User (Demo)</div>
              {users.filter(u => u.status === 'active').map(u => (
                <div key={u.id} onClick={() => { setCurrentUser(u.id); setShowSwitcher(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: u.id === currentUser.id ? t.accentBg : 'transparent', marginBottom: 1 }}
                  onMouseOver={e => { if (u.id !== currentUser.id) e.currentTarget.style.background = t.surface2 }}
                  onMouseOut={e => { e.currentTarget.style.background = u.id === currentUser.id ? t.accentBg : 'transparent' }}>
                  <Avatar user={u} size={24} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: t.text3, textTransform: 'capitalize' }}>{u.role} · {u.access === 'read_write' ? 'R/W' : 'R/O'}</div>
                  </div>
                  {u.id === currentUser.id && <span style={{ fontSize: 11, color: t.accent }}>●</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
