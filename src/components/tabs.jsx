import { useState } from 'react'
import { useTheme } from '../context'
import { useAuth } from '../context'
import { Card, Btn, SBadge, ScorePill, SectionHeader, AlertRow } from './ui'
import { BarChart, RadarChart, MiniLine } from './charts'
import { riskColor, tierDot, alertStyle } from '../utils'
import { AssignedTo } from './AssignedTo'
import { DD_ITEMS, RA_DIMS } from '../data'

// All possible columns with labels
const ALL_COLUMNS = [
  { id: 'name',      label: 'Vendor',      always: true },
  { id: 'category',  label: 'Category' },
  { id: 'tier',      label: 'Tier' },
  { id: 'status',    label: 'Status' },
  { id: 'riskScore', label: 'Risk Score' },
  ...(true ? [{ id: 'dd', label: 'DD Progress' }] : []),  // filtered by showDD below
  { id: 'contact',   label: 'Contact' },
  { id: 'contactEmail', label: 'Contact Email' },
  { id: 'jira',      label: 'Jira Ticket' },
  { id: 'alerts',    label: 'Alerts' },
]

const DEFAULT_COLS = ['name', 'category', 'tier', 'status', 'riskScore', 'dd']

// ─── COLUMN SELECTOR ──────────────────────────────────────────────────────────
function ColumnSelector({ visible, onChange }) {
  const t = useTheme()
  const [open, setOpen] = useState(false)
  const toggleCol = id => {
    if (id === 'name') return // always shown
    const next = visible.includes(id) ? visible.filter(c => c !== id) : [...visible, id]
    onChange(next)
  }
  return (
    <div style={{ position: 'relative' }}>
      <Btn variant="ghost" small onClick={() => setOpen(p => !p)}>
        ⊞ Columns ({visible.length})
      </Btn>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, minWidth: 180, boxShadow: `0 8px 28px rgba(0,0,0,${t.dark ? .5 : .14})`, zIndex: 40 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Show / Hide Columns</div>
            {ALL_COLUMNS.map(col => (
              <div key={col.id} onClick={() => toggleCol(col.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: col.always ? 'default' : 'pointer', opacity: col.always ? .5 : 1 }}
                onMouseOver={e => { if (!col.always) e.currentTarget.style.background = t.surface2 }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: visible.includes(col.id) ? '#6366f1' : t.surface2, border: `2px solid ${visible.includes(col.id) ? '#6366f1' : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {visible.includes(col.id) && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{col.label}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 8, paddingTop: 8 }}>
              <button onClick={() => { onChange(ALL_COLUMNS.map(c => c.id)); setOpen(false) }}
                style={{ fontSize: 11, color: t.accentText, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Show all</button>
              <button onClick={() => { onChange(DEFAULT_COLS); setOpen(false) }}
                style={{ fontSize: 11, color: t.text3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 10 }}>Reset</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── VENDOR LOGO ──────────────────────────────────────────────────────────────
function VendorLogo({ vendor, size = 28 }) {
  const [err, setErr] = useState(false)
  if (!vendor.logoUrl || err) {
    // Fallback: colored initials circle
    const initial = vendor.name?.[0]?.toUpperCase() || '?'
    const colors  = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#ef4444']
    const bg      = colors[vendor.name?.charCodeAt(0) % colors.length] || '#6366f1'
    return (
      <div style={{ width: size, height: size, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: '#fff', fontSize: size * .42 }}>
        {initial}
      </div>
    )
  }
  return (
    <img src={vendor.logoUrl} alt={vendor.name} onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain', borderRadius: 6, background: '#fff', border: `1px solid #e2e8f0`, padding: 2, flexShrink: 0 }} />
  )
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
export function OverviewTab({ vendors, onSelect, onAdd, onBulkImport }) {
  const t = useTheme()
  const { canWrite, showDD } = useAuth()
  const [visibleCols,   setVisibleCols]   = useState(DEFAULT_COLS)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [filterStatus,  setFilterStatus]  = useState('all')
  const [filterCat,     setFilterCat]     = useState('all')
  const [filterTier,    setFilterTier]    = useState('all')
  const [filterHasDocs, setFilterHasDocs] = useState(false)
  const allAlerts = vendors.flatMap(v => (v.alerts || []).map(a => ({ ...a, vendor: v.name })))
  const counts = {
    total:  vendors.length,
    active: vendors.filter(v => v.status === 'Active').length,
    high:   vendors.filter(v => v.riskScore < 50).length,
    crit:   allAlerts.filter(a => a.type === 'critical').length,
  }
  // Derive unique values for filter dropdowns
  const allStatuses  = [...new Set(vendors.map(v => v.status).filter(Boolean))]
  const allCats      = [...new Set(vendors.map(v => v.category).filter(Boolean))]
  const allTiers     = [...new Set(vendors.map(v => v.tier).filter(Boolean))]

  // Apply search + filters
  const filtered = vendors.filter(v => {
    const q = searchQuery.toLowerCase().trim()
    if (q && !v.name?.toLowerCase().includes(q) &&
             !v.category?.toLowerCase().includes(q) &&
             !v.contact?.toLowerCase().includes(q) &&
             !v.contactEmail?.toLowerCase().includes(q) &&
             !v.jiraTicket?.toLowerCase().includes(q)) return false
    if (filterStatus !== 'all' && v.status !== filterStatus) return false
    if (filterCat    !== 'all' && v.category !== filterCat)  return false
    if (filterTier   !== 'all' && v.tier !== filterTier)     return false
    if (filterHasDocs && !(v.documents?.length > 0))         return false
    return true
  })

  const activeFilters = [
    filterStatus !== 'all', filterCat !== 'all',
    filterTier !== 'all', filterHasDocs, searchQuery.trim() !== ''
  ].filter(Boolean).length

  const clearAll = () => {
    setSearchQuery(''); setFilterStatus('all')
    setFilterCat('all'); setFilterTier('all'); setFilterHasDocs(false)
  }

  const show = id => visibleCols.includes(id)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <SectionHeader title="Portfolio Overview" subtitle="Real-time summary of your third-party vendor landscape" />
        <div style={{ display: 'flex', gap: 8 }}>
          {canWrite && <Btn variant="ghost" small onClick={onBulkImport}>📥 Bulk Import</Btn>}
          {canWrite && <Btn variant="primary" onClick={onAdd}>+ Add Vendor</Btn>}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { l: 'Total Vendors',   v: counts.total,  a: '#6366f1' },
          { l: 'Active',          v: counts.active, a: '#16a34a' },
          { l: 'High Risk',       v: counts.high,   a: '#dc2626' },
          { l: 'Critical Alerts', v: counts.crit,   a: '#d97706' },
        ].map(k => (
          <Card key={k.l} style={{ padding: '18px 20px', borderTop: `3px solid ${k.a}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{k.l}</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: t.text, lineHeight: 1 }}>{k.v}</div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>Risk Score by Vendor</div>
          <BarChart vendors={vendors} />
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 14 }}>Risk Distribution</div>
          {[{ l: 'Low Risk', min: 75, max: 100, c: '#16a34a' }, { l: 'Medium Risk', min: 50, max: 74, c: '#d97706' }, { l: 'High Risk', min: 0, max: 49, c: '#dc2626' }].map(r => {
            const cnt = vendors.filter(v => v.riskScore >= r.min && v.riskScore <= r.max).length
            return (
              <div key={r.l} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ fontSize: 12, color: t.text2, fontWeight: 500 }}>{r.l}</span><span style={{ fontSize: 12, fontWeight: 700, color: r.c }}>{cnt}</span></div>
                <div style={{ background: t.border, borderRadius: 999, height: 7 }}><div style={{ background: r.c, height: 7, borderRadius: 999, width: `${(cnt / Math.max(vendors.length, 1)) * 100}%`, transition: 'width .4s' }} /></div>
              </div>
            )
          })}
          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 8 }}>Active Alerts</div>
            {allAlerts.length === 0
              ? <div style={{ fontSize: 12, color: t.text3 }}>No active alerts</div>
              : allAlerts.slice(0, 3).map(a => {
                  const s = alertStyle(a.type)
                  return <div key={a.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}><span style={{ flexShrink: 0 }}>{s.icon}</span><div><div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{a.vendor}</div><div style={{ fontSize: 11, color: t.text2 }}>{a.msg}</div></div></div>
                })}
          </div>
        </Card>
      </div>

      {/* Vendor table */}
      <Card style={{ overflow: 'hidden' }}>
        {/* Search + Filter bar */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search input */}
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: t.text3, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search vendors..."
                style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text, background: t.inputBg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.text3, fontSize: 12 }}>✕</button>
              )}
            </div>

            {/* Status filter */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '7px 10px', border: `1px solid ${filterStatus !== 'all' ? t.accent : t.border}`, borderRadius: 8, fontSize: 12, color: filterStatus !== 'all' ? t.accentText : t.text2, background: filterStatus !== 'all' ? t.accentBg : t.inputBg, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="all">All Statuses</option>
              {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Category filter */}
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ padding: '7px 10px', border: `1px solid ${filterCat !== 'all' ? t.accent : t.border}`, borderRadius: 8, fontSize: 12, color: filterCat !== 'all' ? t.accentText : t.text2, background: filterCat !== 'all' ? t.accentBg : t.inputBg, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="all">All Categories</option>
              {allCats.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Tier filter */}
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
              style={{ padding: '7px 10px', border: `1px solid ${filterTier !== 'all' ? t.accent : t.border}`, borderRadius: 8, fontSize: 12, color: filterTier !== 'all' ? t.accentText : t.text2, background: filterTier !== 'all' ? t.accentBg : t.inputBg, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="all">All Tiers</option>
              {allTiers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Has documents toggle */}
            <button onClick={() => setFilterHasDocs(p => !p)}
              style={{ padding: '7px 12px', border: `1px solid ${filterHasDocs ? t.accent : t.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: filterHasDocs ? t.accentText : t.text2, background: filterHasDocs ? t.accentBg : t.inputBg, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📎 Has Docs
            </button>

            {/* Clear filters */}
            {activeFilters > 0 && (
              <button onClick={clearAll}
                style={{ padding: '7px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.dangerText, background: t.dangerBg, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ✕ Clear ({activeFilters})
              </button>
            )}

            {/* Column selector + result count pushed right */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: t.text3, whiteSpace: 'nowrap' }}>
                {filtered.length === vendors.length
                  ? <>{vendors.length} vendors</>
                  : <><strong style={{ color: t.text }}>{filtered.length}</strong> of {vendors.length}</>
                }
              </span>
              <ColumnSelector visible={visibleCols} onChange={setVisibleCols} />
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: t.surface2 }}>
                {/* Always: Vendor name */}
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Vendor</th>
                {show('category')  && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Category</th>}
                {show('tier')      && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Tier</th>}
                {show('status')    && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Status</th>}
                {show('riskScore') && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Risk Score</th>}
                {show('dd')        && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>DD Progress</th>}
                {show('contact')   && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Contact</th>}
                {show('contactEmail') && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Contact Email</th>}
                {show('jira')      && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Jira</th>}
                {show('assessor')  && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Assessor</th>}
                {show('alerts')    && <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>Alerts</th>}
                <th style={{ padding: '9px 14px', borderBottom: `1px solid ${t.border}` }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={20} style={{ padding: '40px 20px', textAlign: 'center', color: t.text3, fontSize: 13 }}>
                    No vendors match your search.{' '}
                    <button onClick={clearAll} style={{ color: t.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Clear filters</button>
                  </td></tr>
                : filtered.map((v, i) => {
                const ddP = Math.round(((v.ddCompleted?.length || 0) / DD_ITEMS.length) * 100)
                const alertCount = v.alerts?.length || 0
                return (
                  <tr key={v.id} style={{ borderTop: i > 0 ? `1px solid ${t.border2}` : 'none' }}
                    onMouseOver={e => e.currentTarget.style.background = t.surface2}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>

                    {/* Vendor name — always shown, includes logo */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <VendorLogo vendor={v} size={28} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{v.name}</div>
                          <a href={v.website} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: t.accent }}>{v.website}</a>
                        </div>
                      </div>
                    </td>

                    {show('category')  && <td style={{ padding: '10px 14px', fontSize: 12, color: t.text2, whiteSpace: 'nowrap' }}>{v.category}</td>}
                    {show('tier')      && <td style={{ padding: '10px 14px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: t.text2 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: tierDot(v.tier), display: 'inline-block', flexShrink: 0 }} />{v.tier}</span></td>}
                    {show('status')    && <td style={{ padding: '10px 14px' }}><SBadge status={v.status} /></td>}
                    {show('riskScore') && <td style={{ padding: '10px 14px' }}><ScorePill score={v.riskScore} /></td>}
                    {show('dd')        && (
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, background: t.border, borderRadius: 999, height: 5 }}>
                            <div style={{ width: `${ddP}%`, background: ddP === 100 ? '#16a34a' : ddP > 50 ? '#d97706' : '#dc2626', height: 5, borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: t.text2 }}>{ddP}%</span>
                        </div>
                      </td>
                    )}
                    {show('contact')   && <td style={{ padding: '10px 14px', fontSize: 12, color: t.text2 }}>{v.contact || '—'}</td>}
                    {show('contactEmail') && <td style={{ padding: '10px 14px', fontSize: 12, color: t.text2 }}>{v.contactEmail ? <a href={`mailto:${v.contactEmail}`} style={{ color: '#6366f1' }}>{v.contactEmail}</a> : '—'}</td>}
                    {show('jira')      && (
                      <td style={{ padding: '10px 14px' }}>
                        {v.jiraTicket
                          ? <span style={{ fontSize: 11, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 4 }}>{v.jiraTicket}</span>
                          : <span style={{ fontSize: 11, color: t.text3 }}>—</span>}
                      </td>
                    )}
                    {show('assessor')  && (
                      <td style={{ padding: '10px 14px' }}>
                        {v.assignedTo
                          ? <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{v.assignedTo.split(' ')[0]}</span>
                          : <span style={{ fontSize: 11, color: t.text3 }}>—</span>}
                      </td>
                    )}
                    {show('alerts')    && (
                      <td style={{ padding: '10px 14px' }}>
                        {alertCount > 0
                          ? <span style={{ fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 999 }}>🔔 {alertCount}</span>
                          : <span style={{ fontSize: 11, color: t.text3 }}>—</span>}
                      </td>
                    )}
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => onSelect(v)} style={{ fontSize: 12, color: '#4338ca', fontWeight: 600, background: '#eef2ff', border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 6, fontFamily: 'inherit' }}>Open →</button>
                    </td>
                  </tr>
                )
              })}
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── DUE DILIGENCE ────────────────────────────────────────────────────────────
export function DDTab({ vendors, onSelect }) {
  const t = useTheme()
  const stats = [
    { l: 'Fully Complete', v: vendors.filter(v => v.ddCompleted?.length === DD_ITEMS.length).length, a: '#16a34a' },
    { l: 'In Progress',    v: vendors.filter(v => v.ddCompleted?.length > 0 && v.ddCompleted?.length < DD_ITEMS.length).length, a: '#d97706' },
    { l: 'Not Started',    v: vendors.filter(v => !v.ddCompleted?.length).length, a: '#dc2626' },
  ]
  return (
    <div className="page">
      <SectionHeader title="Due Diligence" subtitle="Track completion of due diligence checklists across all vendors" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {stats.map(k => (
          <Card key={k.l} style={{ padding: '16px 20px', borderLeft: `3px solid ${k.a}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.text, lineHeight: 1 }}>{k.v}</div>
          </Card>
        ))}
      </div>
      {vendors.map(v => {
        const done = v.ddCompleted?.length || 0
        const pct = Math.round((done / DD_ITEMS.length) * 100)
        return (
          <Card key={v.id} style={{ padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <VendorLogo vendor={v} size={32} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{v.category} · {v.tier} Tier</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: t.text3, marginBottom: 2 }}>Completion</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: pct === 100 ? '#16a34a' : pct > 50 ? '#d97706' : '#dc2626' }}>{pct}%</div>
                </div>
                <button onClick={() => onSelect(v)} style={{ fontSize: 12, color: '#4338ca', fontWeight: 600, background: '#eef2ff', border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 6, fontFamily: 'inherit' }}>Manage →</button>
              </div>
            </div>
            <div style={{ background: t.border, borderRadius: 999, height: 6, marginBottom: 12 }}>
              <div style={{ background: pct === 100 ? '#16a34a' : pct > 50 ? '#d97706' : '#dc2626', height: 6, borderRadius: 999, width: `${pct}%`, transition: 'width .4s' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {DD_ITEMS.map((item, i) => {
                const d = v.ddCompleted?.includes(i)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 8px', borderRadius: 6, background: d ? '#f0fdf4' : t.surface2, border: `1px solid ${d ? '#16a34a33' : t.border}` }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{d ? '✅' : '⬜'}</span>
                    <span style={{ fontSize: 10, color: d ? '#16a34a' : t.text2, fontWeight: d ? 600 : 400, lineHeight: 1.3 }}>{item}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ─── RISK ASSESSMENT ─────────────────────────────────────────────────────────
export function RATab({ vendors, onSelect }) {
  const t = useTheme()
  return (
    <div className="page">
      <SectionHeader title="Risk Assessment" subtitle="Click a vendor to open their full risk assessment" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {vendors.map(v => (
          <Card key={v.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <VendorLogo vendor={v} size={32} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{v.tier} Tier · {v.category}</div>
                </div>
              </div>
              <ScorePill score={v.riskScore} />
            </div>
            <RadarChart scores={v.raScores} size={200} />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => onSelect(v)} style={{ fontSize: 12, color: '#4338ca', fontWeight: 600, background: '#eef2ff', border: 'none', cursor: 'pointer', padding: '5px 14px', borderRadius: 6, fontFamily: 'inherit' }}>Open Assessment →</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── MONITORING ───────────────────────────────────────────────────────────────
export function MonitoringTab({ vendors, onSelect }) {
  const t = useTheme()
  const allAlerts = vendors.flatMap(v => (v.alerts || []).map(a => ({ ...a, vendor: v.name })))
  return (
    <div className="page">
      <SectionHeader title="Continuous Monitoring" subtitle="Real-time alerts and risk trend tracking" />
      {allAlerts.length > 0 && (
        <Card style={{ marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '13px 20px', borderBottom: `1px solid ${t.border}`, fontSize: 13, fontWeight: 700, color: t.text }}>
            🔔 Active Alerts <span style={{ fontSize: 11, color: t.text3, marginLeft: 6 }}>{allAlerts.length} total</span>
          </div>
          {allAlerts.map(a => <AlertRow key={a.id} alert={a} vendorName={a.vendor} />)}
        </Card>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        {vendors.map(v => (
          <Card key={v.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <VendorLogo vendor={v} size={30} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{v.name}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}><SBadge status={v.status} /><ScorePill score={v.riskScore} /></div>
                </div>
              </div>
              <button onClick={() => onSelect(v)} style={{ fontSize: 11, color: '#4338ca', fontWeight: 600, background: '#eef2ff', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontFamily: 'inherit' }}>Open →</button>
            </div>
            <MiniLine data={v.monData} color={riskColor(v.riskScore)} />
          </Card>
        ))}
      </div>
    </div>
  )
}
