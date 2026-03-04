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

export function Navbar({ activeTab, onTabChange, vendorOpen, onSignOut }) {
  const t = useTheme()
  const { users, currentUser, setCurrentUser, isAdmin } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div style={{ background: t.navBg, borderBottom: `1px solid ${t.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 40, boxShadow: `0 1px 6px rgba(0,0,0,${t.dark ? .25 : .05})`, transition: 'background .25s' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/logo.jpg" alt="Sonic Automotive" style={{ height: 30, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ width: 1, height: 26, background: t.border, flexShrink: 0 }} />
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
        {/* Dark mode */}
        <button onClick={t.toggle} title={t.dark ? 'Light Mode' : 'Dark Mode'}
          style={{ width: 32, height: 32, borderRadius: 8, background: t.surface2, border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {t.dark ? '☀️' : '🌙'}
        </button>

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <div onClick={() => setShowMenu(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface2 }}>
            {currentUser && <Avatar user={currentUser} size={26} />}
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{currentUser?.name?.split(' ')[0] || 'User'}</div>
              <div style={{ fontSize: 10, color: t.text3, textTransform: 'capitalize' }}>{currentUser?.role}</div>
            </div>
            <span style={{ fontSize: 10, color: t.text3 }}>▾</span>
          </div>

          {showMenu && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 8, minWidth: 230, boxShadow: `0 8px 28px rgba(0,0,0,${t.dark ? .5 : .14})`, zIndex: 50 }}>

              {/* Current user info */}
              <div style={{ padding: '8px 10px 10px', borderBottom: `1px solid ${t.border}`, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentUser && <Avatar user={currentUser} size={32} />}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{currentUser?.name}</div>
                    <div style={{ fontSize: 11, color: t.text3 }}>{currentUser?.email}</div>
                  </div>
                </div>
              </div>

              {/* Demo user switcher — only for admins */}
              {isAdmin && users.filter(u => u.status === 'active').length > 1 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', padding: '4px 10px 4px' }}>Switch User (Demo)</div>
                  {users.filter(u => u.status === 'active').map(u => (
                    <div key={u.id} onClick={() => { setCurrentUser(u.id); setShowMenu(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: u.id === currentUser?.id ? t.accentBg : 'transparent', marginBottom: 1 }}
                      onMouseOver={e => { if (u.id !== currentUser?.id) e.currentTarget.style.background = t.surface2 }}
                      onMouseOut={e => { e.currentTarget.style.background = u.id === currentUser?.id ? t.accentBg : 'transparent' }}>
                      <Avatar user={u} size={22} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{u.name}</div>
                        <div style={{ fontSize: 10, color: t.text3, textTransform: 'capitalize' }}>{u.role} · {u.access === 'read_write' ? 'R/W' : 'R/O'}</div>
                      </div>
                      {u.id === currentUser?.id && <span style={{ fontSize: 10, color: t.accent }}>●</span>}
                    </div>
                  ))}
                  <div style={{ height: 1, background: t.border, margin: '6px 0' }} />
                </>
              )}

              {/* Sign out */}
              <div onClick={() => { setShowMenu(false); onSignOut?.() }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', color: t.dangerText }}
                onMouseOver={e => e.currentTarget.style.background = t.dangerBg}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: 14 }}>→</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Sign Out</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
