import { useTheme } from '../context'
import { useAuth } from '../context'
import { Card, Btn, SBadge, ScorePill, SectionHeader, AlertRow } from './ui'
import { BarChart, RadarChart, MiniLine } from './charts'
import { riskColor, tierDot, alertStyle } from '../utils'
import { DD_ITEMS, RA_DIMS } from '../data'

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
export function OverviewTab({ vendors, onSelect, onAdd }) {
  const t = useTheme()
  const { canWrite } = useAuth()
  const allAlerts = vendors.flatMap(v => (v.alerts || []).map(a => ({ ...a, vendor: v.name })))
  const counts = {
    total:  vendors.length,
    active: vendors.filter(v => v.status === 'Active').length,
    high:   vendors.filter(v => v.riskScore < 50).length,
    crit:   allAlerts.filter(a => a.type === 'critical').length,
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <SectionHeader title="Portfolio Overview" subtitle="Real-time summary of your third-party vendor landscape" />
        {canWrite && <Btn variant="primary" onClick={onAdd}>+ Add Vendor</Btn>}
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
        <div style={{ padding: '13px 20px', borderBottom: `1px solid ${t.border}`, fontSize: 13, fontWeight: 700, color: t.text, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          All Vendors <span style={{ fontSize: 11, color: t.text3 }}>{vendors.length} total</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.surface2 }}>
              {['Vendor', 'Category', 'Tier', 'Status', 'Risk Score', 'DD Progress', ''].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: '.07em', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, i) => {
              const ddP = Math.round(((v.ddCompleted?.length || 0) / DD_ITEMS.length) * 100)
              return (
                <tr key={v.id} style={{ borderTop: i > 0 ? `1px solid ${t.border2}` : 'none' }}
                  onMouseOver={e => e.currentTarget.style.background = t.surface2}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px' }}><div style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{v.name}</div><a href={v.website} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: t.accent }}>{v.website}</a></td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: t.text2, whiteSpace: 'nowrap' }}>{v.category}</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: t.text2 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: tierDot(v.tier), display: 'inline-block', flexShrink: 0 }} />{v.tier}</span></td>
                  <td style={{ padding: '12px 14px' }}><SBadge status={v.status} /></td>
                  <td style={{ padding: '12px 14px' }}><ScorePill score={v.riskScore} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, background: t.border, borderRadius: 999, height: 5 }}>
                        <div style={{ width: `${ddP}%`, background: ddP === 100 ? t.successText : ddP > 50 ? t.warnText : t.dangerText, height: 5, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: t.text2 }}>{ddP}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => onSelect(v)} style={{ fontSize: 12, color: t.accentText, fontWeight: 600, background: t.accentBg, border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 6, fontFamily: 'inherit' }}>Open →</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─── DUE DILIGENCE ────────────────────────────────────────────────────────────
export function DDTab({ vendors, onSelect }) {
  const t = useTheme()
  const stats = [
    { l: 'Fully Complete', v: vendors.filter(v => v.ddCompleted?.length === DD_ITEMS.length).length, a: t.successText },
    { l: 'In Progress',    v: vendors.filter(v => v.ddCompleted?.length > 0 && v.ddCompleted?.length < DD_ITEMS.length).length, a: t.warnText },
    { l: 'Not Started',    v: vendors.filter(v => !v.ddCompleted?.length).length, a: t.dangerText },
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
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{v.name}</div>
                <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{v.category} · {v.tier} Tier</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: t.text3, marginBottom: 2 }}>Completion</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: pct === 100 ? t.successText : pct > 50 ? t.warnText : t.dangerText }}>{pct}%</div>
                </div>
                <button onClick={() => onSelect(v)} style={{ fontSize: 12, color: t.accentText, fontWeight: 600, background: t.accentBg, border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 6, fontFamily: 'inherit' }}>Manage →</button>
              </div>
            </div>
            <div style={{ background: t.border, borderRadius: 999, height: 6, marginBottom: 12 }}>
              <div style={{ background: pct === 100 ? t.successText : pct > 50 ? t.warnText : t.dangerText, height: 6, borderRadius: 999, width: `${pct}%`, transition: 'width .4s' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {DD_ITEMS.map((item, i) => {
                const d = v.ddCompleted?.includes(i)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 8px', borderRadius: 6, background: d ? t.successBg : t.surface2, border: `1px solid ${d ? t.successText + '33' : t.border}` }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{d ? '✅' : '⬜'}</span>
                    <span style={{ fontSize: 10, color: d ? t.successText : t.text2, fontWeight: d ? 600 : 400, lineHeight: 1.3 }}>{item}</span>
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
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{v.name}</div>
                <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{v.tier} Tier · {v.category}</div>
              </div>
              <ScorePill score={v.riskScore} />
            </div>
            <RadarChart scores={v.raScores} size={200} />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => onSelect(v)} style={{ fontSize: 12, color: t.accentText, fontWeight: 600, background: t.accentBg, border: 'none', cursor: 'pointer', padding: '5px 14px', borderRadius: 6, fontFamily: 'inherit' }}>Open Assessment →</button>
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
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{v.name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}><SBadge status={v.status} /><ScorePill score={v.riskScore} /></div>
              </div>
              <button onClick={() => onSelect(v)} style={{ fontSize: 11, color: t.accentText, fontWeight: 600, background: t.accentBg, border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontFamily: 'inherit' }}>Open →</button>
            </div>
            <MiniLine data={v.monData} color={riskColor(v.riskScore)} />
          </Card>
        ))}
      </div>
    </div>
  )
}
