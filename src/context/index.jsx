import { createContext, useContext, useState, useEffect } from 'react'
import { fetchVendors, createVendor, updateVendor as dbUpdateVendor, deleteVendor as dbDeleteVendor } from '../db'
import { fetchUsers,   createUser,   updateUser   as dbUpdateUser,   deleteUser   as dbDeleteUser   } from '../db'
import { INIT_VENDORS } from '../data'

// ─── THEME ────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext()
export const useTheme = () => useContext(ThemeCtx)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false)
  const toggle = () => setDark(p => !p)
  const t = {
    dark, toggle,
    bg:          dark ? '#0d0f18' : '#f1f5f9',
    surface:     dark ? '#161927' : '#ffffff',
    surface2:    dark ? '#1e2235' : '#f8fafc',
    border:      dark ? '#2a2f4a' : '#e2e8f0',
    border2:     dark ? '#1e2235' : '#f8fafc',
    text:        dark ? '#eef1ff' : '#0f172a',
    text2:       dark ? '#8892b0' : '#475569',
    text3:       dark ? '#4a5170' : '#94a3b8',
    accent:      '#6366f1',
    accentBg:    dark ? '#1e2040' : '#eef2ff',
    accentText:  dark ? '#a5b4fc' : '#4338ca',
    navBg:       dark ? '#10121e' : '#ffffff',
    inputBg:     dark ? '#1e2235' : '#ffffff',
    dangerBg:    dark ? '#2a1418' : '#fef2f2',
    dangerText:  dark ? '#f87171' : '#dc2626',
    successBg:   dark ? '#0d1f16' : '#f0fdf4',
    successText: dark ? '#4ade80' : '#16a34a',
    warnBg:      dark ? '#221a08' : '#fffbeb',
    warnText:    dark ? '#fbbf24' : '#d97706',
  }
  return <ThemeCtx.Provider value={t}>{children}</ThemeCtx.Provider>
}

// ─── VENDOR CONTEXT ───────────────────────────────────────────────────────────
const VendorCtx = createContext()
export const useVendors = () => useContext(VendorCtx)

export function VendorProvider({ children }) {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => { loadVendors() }, [])

  async function loadVendors() {
    try {
      setLoading(true); setError(null)
      const data = await fetchVendors()
      setVendors(data)
    } catch (err) {
      console.error('Failed to load vendors:', err)
      setError('Could not connect to database. Showing local data.')
      setVendors(INIT_VENDORS)
    } finally {
      setLoading(false)
    }
  }

  async function addVendor(vendor) {
    const saved = await createVendor(vendor)
    setVendors(p => [...p, saved])
    return saved
  }

  async function editVendor(updated) {
    const { id, ...updates } = updated
    const saved = await dbUpdateVendor(id, updates)
    setVendors(p => p.map(v => v.id === id ? saved : v))
    return saved
  }

  async function removeVendor(id) {
    await dbDeleteVendor(id)
    setVendors(p => p.filter(v => v.id !== id))
  }

  return (
    <VendorCtx.Provider value={{ vendors, loading, error, addVendor, editVendor, removeVendor, reload: loadVendors }}>
      {children}
    </VendorCtx.Provider>
  )
}

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx = createContext()
export const useAuth = () => useContext(AuthCtx)

const INIT_USERS = [
  { id: 1, name: 'Alex Morgan',   email: 'alex@company.com',   role: 'admin',   access: 'read_write', status: 'active',   initials: 'AM', last_login: '2026-03-03T10:22:00Z', department: 'Risk & Compliance', avatar_idx: 0 },
  { id: 2, name: 'Jamie Chen',    email: 'jamie@company.com',  role: 'analyst', access: 'read_write', status: 'active',   initials: 'JC', last_login: '2026-03-02T15:44:00Z', department: 'Security',          avatar_idx: 1 },
  { id: 3, name: 'Sam Rivera',    email: 'sam@company.com',    role: 'viewer',  access: 'read_only',  status: 'active',   initials: 'SR', last_login: '2026-02-28T09:10:00Z', department: 'Operations',        avatar_idx: 2 },
  { id: 4, name: 'Taylor Brooks', email: 'taylor@company.com', role: 'analyst', access: 'read_write', status: 'inactive', initials: 'TB', last_login: '2026-02-10T11:30:00Z', department: 'Finance',           avatar_idx: 3 },
  { id: 5, name: 'Jordan Kim',    email: 'jordan@company.com', role: 'admin',   access: 'read_write', status: 'active',   initials: 'JK', last_login: '2026-03-01T08:55:00Z', department: 'IT',                avatar_idx: 4 },
]

export function AuthProvider({ children }) {
  const [users,   setUsers]   = useState([])
  const [curId,   setCurId]   = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const data = await fetchUsers()
      if (data.length === 0) {
        for (const u of INIT_USERS) await createUser(u)
        setUsers(INIT_USERS)
      } else {
        setUsers(data)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
      setUsers(INIT_USERS)
    } finally {
      setLoading(false)
    }
  }

  const currentUser = users.find(u => u.id === curId) || users[0]
  const isAdmin  = currentUser?.role === 'admin'
  const canWrite = currentUser?.access === 'read_write'

  async function addUser(user) {
    const initials   = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const avatar_idx = users.length % 5
    const saved = await createUser({ ...user, initials, avatar_idx, last_login: null, status: 'active' })
    setUsers(p => [...p, saved])
  }

  async function updateUser(user) {
    const { id, ...updates } = user
    const saved = await dbUpdateUser(id, updates)
    setUsers(p => p.map(u => u.id === id ? saved : u))
  }

  async function deleteUser(id) {
    await dbDeleteUser(id)
    setUsers(p => p.filter(u => u.id !== id))
  }

  return (
    <AuthCtx.Provider value={{ users, currentUser, setCurrentUser: setCurId, isAdmin, canWrite, addUser, updateUser, deleteUser, loading }}>
      {children}
    </AuthCtx.Provider>
  )
}
