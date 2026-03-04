import { useState } from 'react'
import { useTheme, useAuth } from '../context'
import { Card, Btn, Inp, Sel, Toggle, TabBar, SBadge, RoleBadge, Avatar, SectionHeader } from './ui'
import { roleStyle, fmtDate } from '../utils'
import { DEPARTMENTS } from '../data'

// ─── USER MODAL ───────────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSave, meId }) {
  const t = useTheme()
  const isEdit = !!user?.id
  const [form, setForm] = useState(user || { name: '', email: '', role: 'analyst', access: 'read_write', department: 'Risk & Compliance' })
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name?.trim()) e.name = 'Required'
    if (!form.email?.trim()) e.email = 'Required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    return e
  }

  const submit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(form)
    onClose()
  }

  const rc = roleStyle(form.role)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,.35)', border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: t.text }}>{isEdit ? 'Edit User' : 'Add New User'}</div>
            <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{isEdit ? 'Update details & permissions' : 'Invite to the platform'}</div>
          </div>
          <button onClick={onClose} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: t.text2, fontSize: 13 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[{ k: 'name', l: 'Full Name *', ph: 'e.g. Alex Morgan' }, { k: 'email', l: 'Email *', ph: 'alex@company.com', type: 'email' }].map(f => (
            <div key={f.k}>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>{f.l}</label>
              <Inp value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)} placeholder={f.ph} type={f.type} />
              {errors[f.k] && <div style={{ fontSize: 11, color: t.dangerText, marginTop: 2 }}>{errors[f.k]}</div>}
            </div>
          ))}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Department</label>
            <Sel value={form.department || DEPARTMENTS[0]} onChange={e => set('department', e.target.value)} options={DEPARTMENTS} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Role</label>
              <Sel value={form.role} onChange={e => set('role', e.target.value)} options={[{ v: 'admin', l: 'Admin 👑' }, { v: 'analyst', l: 'Analyst 🔬' }, { v: 'viewer', l: 'Viewer 👁' }]} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Access Level</label>
              <Sel value={form.access} onChange={e => set('access', e.target.value)} options={[{ v: 'read_write', l: 'Read & Write' }, { v: 'read_only', l: 'Read Only' }]} />
            </div>
          </div>

          <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Permissions Preview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.c, border: `1px solid ${rc.b}`, textTransform: 'capitalize' }}>{form.role}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: form.access === 'read_write' ? t.successText : t.text3 }}>{form.access === 'read_write' ? '✏ Read/Write' : '👁 Read Only'}</span>
            </div>
            <div style={{ fontSize: 12, color: t.text2 }}>{{ admin: 'Full access: manage users, settings, all TPRM data', analyst: 'Run research, upload docs, edit assessments', viewer: 'View-only — cannot make changes' }[form.role]}</div>
          </div>

          {isEdit && user.id === meId && (
            <div style={{ fontSize: 12, color: t.warnText, background: t.warnBg, padding: '8px 12px', borderRadius: 8 }}>⚠ You are editing your own account</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="accent" onClick={submit}>{isEdit ? 'Save Changes' : 'Add User'}</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── DELETE CONFIRM ───────────────────────────────────────────────────────────
function DeleteConfirm({ user, onClose, onConfirm }) {
  const t = useTheme()
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.surface, borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', border: `1px solid ${t.border}`, boxShadow: '0 24px 64px rgba(0,0,0,.35)' }}>
        <div style={{ fontSize: 32, marginBottom: 10, textAlign: 'center' }}>🗑</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.text, textAlign: 'center', marginBottom: 6 }}>Delete User?</div>
        <div style={{ fontSize: 13, color: t.text2, textAlign: 'center', marginBottom: 20 }}>Remove <strong style={{ color: t.text }}>{user.name}</strong> permanently?</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
export function SettingsPage() {
  const t = useTheme()
  const { users, currentUser, isAdmin, addUser, updateUser, deleteUser } = useAuth()
  const [stab, setStab]   = useState(isAdmin ? 'users' : 'appearance')
  const [modal, setModal] = useState(null)
  const [delUser, setDelUser] = useState(null)
  const [search, setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [pwModal,   setPwModal]   = useState(null)  // {user} | null
  const [pwValue,   setPwValue]   = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError,   setPwError]   = useState(null)
  const [pwSuccess, setPwSuccess] = useState(null)

  const handleSetPassword = async () => {
    setPwError(null); setPwSuccess(null)
    if (!pwValue || pwValue.length < 8) { setPwError('Password must be at least 8 characters'); return }
    if (pwValue !== pwConfirm) { setPwError('Passwords do not match'); return }
    setPwLoading(true)
    try {
      const res = await fetch('/api/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pwModal.user.email, password: pwValue }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to set password')
      setPwSuccess(`Password updated for ${pwModal.user.name}`)
      setPwValue(''); setPwConfirm('')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwLoading(false)
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (roleFilter === 'all' || u.role === roleFilter)
  })

  const handleSave = form => {
    if (modal?.mode === 'edit') updateUser({ ...modal.user, ...form })
    else addUser(form)
  }

  const stats = [
    { l: 'Total Users', v: users.length,                                    a: '#6366f1' },
    { l: 'Admins',      v: users.filter(u => u.role === 'admin').length,    a: '#9333ea' },
    { l: 'Active',      v: users.filter(u => u.status === 'active').length, a: '#16a34a' },
    { l: 'Read Only',   v: users.filter(u => u.access === 'read_only').length, a: '#d97706' },
  ]

  const tabs = [
    ...(isAdmin ? [['users', '👥 User Management']] : []),
    ['appearance', '🎨 Appearance'],
    ['profile', '👤 My Profile'],
  ]

  return (
    <div className="page">
      <SectionHeader title="Settings" subtitle="Platform configuration, user management & preferences" />
      <TabBar tabs={tabs} active={stab} onChange={setStab} style={{ marginBottom: 24 }} />

      {/* ── USER MANAGEMENT ── */}
      {stab === 'users' && isAdmin && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            {stats.map(s => (
              <Card key={s.l} style={{ padding: '16px 20px', borderTop: `3px solid ${s.a}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>{s.l}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: t.text, lineHeight: 1 }}>{s.v}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: 180 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: t.text3 }}>🔎</span>
              <Inp value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ paddingLeft: 32 }} />
            </div>
            <Sel value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              options={[{ v: 'all', l: 'All Roles' }, { v: 'admin', l: 'Admins' }, { v: 'analyst', l: 'Analysts' }, { v: 'viewer', l: 'Viewers' }]}
              style={{ width: 'auto', minWidth: 130 }} />
            <Btn variant="accent" onClick={() => setModal({ mode: 'add' })}>+ Add User</Btn>
          </div>

          <Card style={{ overflow: 'hidden', marginBottom: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: t.surface2 }}>
                  {['User', 'Department', 'Role', 'Access', 'Status', 'Last Login', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const isMe = u.id === currentUser.id
                  return (
                    <tr key={u.id} style={{ borderTop: i > 0 ? `1px solid ${t.border2}` : 'none', background: isMe ? t.accentBg + '44' : 'transparent' }}
                      onMouseOver={e => { if (!isMe) e.currentTarget.style.background = t.surface2 }}
                      onMouseOut={e => { e.currentTarget.style.background = isMe ? t.accentBg + '44' : 'transparent' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar user={u} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {u.name}
                              {isMe && <span style={{ fontSize: 10, background: t.accentBg, color: t.accentText, border: `1px solid ${t.accent}33`, borderRadius: 999, padding: '1px 6px', fontWeight: 600 }}>You</span>}
                            </div>
                            <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: t.text2 }}>{u.department || '—'}</td>
                      <td style={{ padding: '12px 14px' }}><RoleBadge role={u.role} /></td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontSize: 12, fontWeight: 600, color: u.access === 'read_write' ? t.successText : t.text3 }}>{u.access === 'read_write' ? '✏ Read/Write' : '👁 Read Only'}</span></td>
                      <td style={{ padding: '12px 14px' }}><SBadge status={u.status} /></td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: t.text3 }}>{fmtDate(u.lastLogin)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn small variant="ghost" onClick={() => setModal({ mode: 'edit', user: u })}>Edit</Btn>
                        <Btn small variant="ghost" onClick={() => { setPwModal({ user: u }); setPwValue(''); setPwConfirm(''); setPwError(null); setPwSuccess(null) }} style={{ color: t.accentText, borderColor: t.accent + '44' }}>🔑 Password</Btn>
                          {!isMe && <Btn small variant="danger" onClick={() => setDelUser(u)}>Delete</Btn>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: t.text3 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>🔎</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>No users found</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* Role reference */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Role Permissions Reference</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { role: 'admin',   icon: '👑', desc: 'Full access: manage users, settings, all TPRM data', access: 'Always Read/Write' },
                { role: 'analyst', icon: '🔬', desc: 'Run research, upload docs, edit risk assessments',   access: 'Read/Write or Read Only' },
                { role: 'viewer',  icon: '👁',  desc: 'View-only — cannot make changes',                   access: 'Always Read Only' },
              ].map(r => {
                const rc = roleStyle(r.role)
                return (
                  <div key={r.role} style={{ padding: '14px 16px', background: t.surface2, borderRadius: 10, border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{r.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: t.text, textTransform: 'capitalize' }}>{r.role}</span>
                      <span style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: rc.bg, color: rc.c, border: `1px solid ${rc.b}` }}>{r.role}</span>
                    </div>
                    <p style={{ fontSize: 12, color: t.text2, lineHeight: 1.6, margin: '0 0 5px' }}>{r.desc}</p>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.text3 }}>Access: {r.access}</div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── APPEARANCE ── */}
      {stab === 'appearance' && (
        <div style={{ maxWidth: 560 }}>
          <Card style={{ padding: 24, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 4 }}>Display Theme</div>
            <div style={{ fontSize: 12, color: t.text2, marginBottom: 18 }}>Choose how the TPRM platform looks for you.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              {[{ id: 'light', label: 'Light Mode', icon: '☀️', desc: 'Clean white interface' }, { id: 'dark', label: 'Dark Mode', icon: '🌙', desc: 'Easy on eyes in low light' }].map(m => (
                <div key={m.id} onClick={() => { if (m.id === 'dark' && !t.dark) t.toggle(); if (m.id === 'light' && t.dark) t.toggle() }}
                  style={{ padding: 16, borderRadius: 10, border: `2px solid ${(m.id === 'dark') === t.dark ? t.accent : t.border}`, cursor: 'pointer', background: t.surface2 }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: t.text2, marginTop: 3 }}>{m.desc}</div>
                  {(m.id === 'dark') === t.dark && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: t.accent }}>✓ Active</div>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: t.surface2, borderRadius: 10, border: `1px solid ${t.border}` }}>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Dark Mode</div><div style={{ fontSize: 12, color: t.text2 }}>Toggle light / dark interface</div></div>
              <Toggle on={t.dark} onToggle={t.toggle} />
            </div>
          </Card>
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 12 }}>Live Preview</div>
            <div style={{ background: t.bg, borderRadius: 10, padding: 16, border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['#6366f1', '#16a34a', '#d97706', '#dc2626'].map(c => <div key={c} style={{ height: 5, flex: 1, borderRadius: 999, background: c }} />)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[{ l: 'Vendors', v: 5 }, { l: 'Alerts', v: 3 }, { l: 'High Risk', v: 2 }].map(k => (
                  <div key={k.l} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: t.text3, marginBottom: 3, fontWeight: 600, textTransform: 'uppercase' }}>{k.l}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── MY PROFILE ── */}
      {stab === 'profile' && (
        <div style={{ maxWidth: 560 }}>
          <Card style={{ padding: 24, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, paddingBottom: 18, borderBottom: `1px solid ${t.border}` }}>
              <Avatar user={currentUser} size={60} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>{currentUser.name}</div>
                <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>{currentUser.email}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <RoleBadge role={currentUser.role} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: currentUser.access === 'read_write' ? t.successText : t.text3 }}>{currentUser.access === 'read_write' ? '✏ Read/Write' : '👁 Read Only'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Full Name', currentUser.name], ['Email', currentUser.email], ['Department', currentUser.department || '—'], ['Last Login', fmtDate(currentUser.lastLogin)], ['Role', currentUser.role], ['Status', currentUser.status]].map(([k, v]) => (
                <div key={k} style={{ padding: '11px 14px', background: t.surface2, borderRadius: 8, border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text, textTransform: 'capitalize' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18 }}>
              <Btn variant="accent" onClick={() => setModal({ mode: 'edit', user: currentUser })}>✏ Edit My Profile</Btn>
            </div>
          </Card>
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 12 }}>Theme Preference</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: t.surface2, borderRadius: 10, border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{t.dark ? '🌙' : '☀️'}</span>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{t.dark ? 'Dark Mode' : 'Light Mode'}</div><div style={{ fontSize: 12, color: t.text2 }}>Currently active</div></div>
              </div>
              <Toggle on={t.dark} onToggle={t.toggle} />
            </div>
          </Card>
        </div>
      )}

      {modal && <UserModal user={modal.mode === 'edit' ? modal.user : null} onClose={() => setModal(null)} onSave={handleSave} meId={currentUser.id} />}
      {delUser && <DeleteConfirm user={delUser} onClose={() => setDelUser(null)} onConfirm={() => { deleteUser(delUser.id); setDelUser(null) }} />}

      {pwModal && (
        <div onClick={() => setPwModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: t.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,.35)', border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: t.text }}>🔑 Set Password</div>
                <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>Set a new password for <strong style={{ color: t.text }}>{pwModal.user.name}</strong></div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{pwModal.user.email}</div>
              </div>
              <button onClick={() => setPwModal(null)} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: t.text2, fontSize: 13 }}>✕</button>
            </div>

            {pwSuccess && <div style={{ padding: '10px 14px', background: t.successBg, border: `1px solid ${t.successText}44`, borderRadius: 8, fontSize: 13, color: t.successText, marginBottom: 14 }}>✅ {pwSuccess}</div>}
            {pwError   && <div style={{ padding: '10px 14px', background: t.dangerBg,  border: `1px solid ${t.dangerText}44`,  borderRadius: 8, fontSize: 13, color: t.dangerText,  marginBottom: 14 }}>⚠️ {pwError}</div>}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>New Password</label>
              <input type="password" value={pwValue} onChange={e => setPwValue(e.target.value)} placeholder="Min. 8 characters"
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 13, outline: 'none', color: t.text, background: t.inputBg, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Confirm Password</label>
              <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Repeat password"
                onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 13, outline: 'none', color: t.text, background: t.inputBg, boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setPwModal(null)}>Cancel</Btn>
              <Btn variant="accent" onClick={handleSetPassword} disabled={pwLoading}>
                {pwLoading ? 'Updating...' : 'Set Password'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
