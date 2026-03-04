import { useState } from 'react'
import { useTheme, useAuth } from '../context'
import { Card, Btn, TabBar, ScorePill, SBadge, AlertRow, SectionHeader } from './ui'
import { RadarChart } from './charts'
import { riskColor, riskLabel, alertStyle } from '../utils'
import { RA_DIMS, DD_ITEMS } from '../data'

export function VendorDetail({ vendor, onBack, onUpdate }) {
  const t = useTheme()
  const { canWrite } = useAuth()
  const [tab, setTab] = useState('intelligence')
  const [scores, setScores] = useState({ ...vendor.raScores })
  const [ddDone, setDdDone] = useState(vendor.ddCompleted || [])

  const updateScore = (key, val) => {
    const ns = { ...scores, [key]: Number(val) }
    setScores(ns)
    const avg = Math.round(Object.values(ns).reduce((a, b) => a + b, 0) / RA_DIMS.length)
    onUpdate({ ...vendor, raScores: ns, riskScore: avg })
  }

  const toggleDD = (i) => {
    if (!canWrite) return
    const nd = ddDone.includes(i) ? ddDone.filter(x => x !== i) : [...ddDone, i]
    setDdDone(nd)
    onUpdate({ ...vendor, ddCompleted: nd })
  }

  const ddPct = Math.round((ddDone.length / DD_ITEMS.length) * 100)

  const tabs = [
    ['intelligence', '🔍 Intelligence'],
    ['assessment',   '📊 Assessment'],
    ['dd',           `✅ Due Diligence (${ddPct}%)`],
    ['alerts',       `🚨 Alerts${vendor.alerts?.length ? ` (${vendor.alerts.length})` : ''}`],
  ]

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Btn variant="ghost" small onClick={onBack}>← Back</Btn>
        <span style={{ fontSize: 13, color: t.text3 }}>Vendors /</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{vendor.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: t.text, letterSpacing: '-.025em' }}>{vendor.name}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>
            <SBadge status={vendor.status} />
            <span style={{ fontSize: 12, color: t.text2 }}>{vendor.category}</span>
            <span style={{ fontSize: 12, color: t.text2 }}>·</span>
            <a href={vendor.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: t.accent }}>{vendor.website}</a>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: t.text3, textTransform: 'uppercase', letterSpacing: '.08em' }}>Risk Score</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: riskColor(vendor.riskScore), lineHeight: 1 }}>{vendor.riskScore}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: riskColor(vendor.riskScore) }}>{riskLabel(vendor.riskScore)} Risk</div>
        </div>
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} style={{ marginBottom: 20 }} />

      {/* ── INTELLIGENCE ── */}
      {tab === 'intelligence' && (
        <div>
          <Card style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>AI Security Intelligence</div>
                <div style={{ fontSize: 12, color: t.text2, maxWidth: 420 }}>
                  In the hosted version, Claude will search for certifications, breach history, compliance status & news about <strong style={{ color: t.text }}>{vendor.name}</strong>.
                </div>
                <a href={vendor.website} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 5, fontSize: 12, color: t.accent }}>🌐 {vendor.website}</a>
              </div>
              {canWrite
                ? <Btn variant="accent" onClick={() => alert('AI Research will be enabled once deployed with an API key.')}>🔍 Run Research</Btn>
                : <div style={{ fontSize: 12, color: t.text3, padding: '8px 12px', background: t.surface2, borderRadius: 8, border: `1px solid ${t.border}` }}>👁 Read-only access</div>
              }
            </div>
          </Card>

          {/* Score summary */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>Current Risk Scores</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
              {RA_DIMS.map(d => {
                const val = vendor.raScores[d.key] || 0
                return (
                  <div key={d.key} style={{ textAlign: 'center', padding: '12px 8px', background: t.surface2, borderRadius: 10, border: `1px solid ${t.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.text2, marginBottom: 5 }}>{d.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: riskColor(val) }}>{val}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: riskColor(val), marginTop: 3 }}>{riskLabel(val)}</div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── ASSESSMENT ── */}
      {tab === 'assessment' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          <Card style={{ padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 18 }}>Risk Score Assessment</div>
            {RA_DIMS.map(d => {
              const val = scores[d.key] || 0
              const c = riskColor(val)
              return (
                <div key={d.key} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{d.label}</span>
                      <span style={{ fontSize: 11, color: t.text3, marginLeft: 8 }}>{d.desc}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: c }}>{val}</span>
                  </div>
                  {canWrite
                    ? <input type="range" min={0} max={100} value={val} onChange={e => updateScore(d.key, e.target.value)} style={{ width: '100%', accentColor: c, cursor: 'pointer' }} />
                    : <div style={{ background: t.border, borderRadius: 999, height: 7 }}><div style={{ width: `${val}%`, background: c, height: 7, borderRadius: 999 }} /></div>
                  }
                </div>
              )
            })}
            <div style={{ padding: '12px 14px', background: t.surface2, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text2 }}>Composite Score</span>
              <ScorePill score={vendor.riskScore} />
            </div>
          </Card>
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 8 }}>Risk Radar</div>
            <RadarChart scores={scores} size={260} />
          </Card>
        </div>
      )}

      {/* ── DUE DILIGENCE ── */}
      {tab === 'dd' && (
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>Due Diligence Checklist</div>
              <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{ddDone.length} of {DD_ITEMS.length} items complete</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: ddPct === 100 ? t.successText : ddPct > 50 ? t.warnText : t.dangerText, lineHeight: 1 }}>{ddPct}%</div>
            </div>
          </div>
          <div style={{ background: t.border, borderRadius: 999, height: 8, marginBottom: 20 }}>
            <div style={{ background: ddPct === 100 ? t.successText : ddPct > 50 ? t.warnText : t.dangerText, height: 8, borderRadius: 999, width: `${ddPct}%`, transition: 'width .3s' }} />
          </div>
          {DD_ITEMS.map((item, i) => {
            const done = ddDone.includes(i)
            return (
              <div key={i} onClick={() => toggleDD(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 10, background: done ? t.successBg : t.surface2, border: `1px solid ${done ? t.successText + '33' : t.border}`, marginBottom: 8, cursor: canWrite ? 'pointer' : 'default', transition: 'all .15s' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? '#16a34a' : t.surface, border: `2px solid ${done ? '#16a34a' : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {done && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: done ? 600 : 400, color: done ? t.successText : t.text }}>{item}</span>
                {done && <span style={{ marginLeft: 'auto', fontSize: 11, color: t.successText, fontWeight: 600 }}>Done</span>}
              </div>
            )
          })}
        </Card>
      )}

      {/* ── ALERTS ── */}
      {tab === 'alerts' && (
        !vendor.alerts?.length
          ? <Card style={{ padding: 36, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.successText }}>No active alerts</div>
            </Card>
          : <Card style={{ overflow: 'hidden' }}>
              {vendor.alerts.map(a => <AlertRow key={a.id} alert={a} />)}
            </Card>
      )}
    </div>
  )
}
