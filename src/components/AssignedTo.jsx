import { useState } from 'react'
import { useTheme, useAuth } from '../context'
import { Avatar } from './ui'

export function AssignedTo({ vendor, onUpdate, compact = false }) {
  const t = useTheme()
  const { users, currentUser, canWrite } = useAuth()
  const [open, setOpen] = useState(false)

  const activeUsers  = users.filter(u => u.status === 'active')
  const assignedUser = activeUsers.find(u => u.name === vendor.assignedTo) || null

  const assign = (user) => {
    setOpen(false)
    onUpdate({ ...vendor, assignedTo: user?.name || null })
  }

  if (compact) {
    // Inline badge for the vendor table column
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div onClick={() => canWrite && setOpen(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: canWrite ? 'pointer' : 'default' }}>
          {assignedUser
            ? <><Avatar user={assignedUser} size={20} /><span style={{ fontSize: 11, color: t.text, fontWeight: 600 }}>{assignedUser.name.split(' ')[0]}</span></>
            : <span style={{ fontSize: 11, color: t.text3 }}>— Unassigned</span>
          }
        </div>
        {open && <AssignPicker users={activeUsers} current={assignedUser} onSelect={assign} onClose={() => setOpen(false)} align="left" />}
      </div>
    )
  }

  // Full card style for vendor detail header
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => canWrite && setOpen(p => !p)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, cursor: canWrite ? 'pointer' : 'default', transition: 'border-color .15s' }}
        onMouseOver={e => { if (canWrite) e.currentTarget.style.borderColor = t.accent }}
        onMouseOut={e => { e.currentTarget.style.borderColor = t.border }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Assessor</div>
        {assignedUser
          ? <><Avatar user={assignedUser} size={22} /><span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{assignedUser.name}</span></>
          : <span style={{ fontSize: 12, color: t.text3 }}>Unassigned {canWrite && '▾'}</span>
        }
        {canWrite && assignedUser && <span style={{ fontSize: 10, color: t.text3, marginLeft: 2 }}>▾</span>}
      </div>
      {open && <AssignPicker users={activeUsers} current={assignedUser} onSelect={assign} onClose={() => setOpen(false)} align="right" />}
    </div>
  )
}

function AssignPicker({ users, current, onSelect, onClose, align }) {
  const t = useTheme()
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
      <div style={{ position: 'absolute', [align]: 0, top: 'calc(100% + 6px)', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 8, minWidth: 210, boxShadow: `0 8px 28px rgba(0,0,0,${t.dark ? .5 : .14})`, zIndex: 60 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', padding: '4px 8px 6px' }}>Assign Assessor</div>

        {users.map(u => (
          <div key={u.id} onClick={() => onSelect(u)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 7, cursor: 'pointer', background: u.name === current?.name ? t.accentBg : 'transparent' }}
            onMouseOver={e => { if (u.name !== current?.name) e.currentTarget.style.background = t.surface2 }}
            onMouseOut={e => { e.currentTarget.style.background = u.name === current?.name ? t.accentBg : 'transparent' }}>
            <Avatar user={u} size={24} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{u.name}</div>
              <div style={{ fontSize: 10, color: t.text3, textTransform: 'capitalize' }}>{u.role}</div>
            </div>
            {u.name === current?.name && <span style={{ fontSize: 11, color: t.accent }}>✓</span>}
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 4 }}>
          <div onClick={() => onSelect(null)}
            style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: t.text3 }}
            onMouseOver={e => e.currentTarget.style.background = t.surface2}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            ✕ Remove assignment
          </div>
        </div>
      </div>
    </>
  )
}
