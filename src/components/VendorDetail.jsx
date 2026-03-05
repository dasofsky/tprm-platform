import { useState } from 'react'
import { useTheme, useAuth } from '../context'
import { Card, Btn, TabBar, ScorePill, SBadge, AlertRow } from './ui'
import { RadarChart } from './charts'
import { IntelligencePanel } from './IntelligencePanel'
import { DocumentsTab } from './DocumentsTab'
import { CommentsTab } from './CommentsTab'
import { exportVendorPDF } from '../pdfExport'
import { AssignedTo }   from './AssignedTo'
import { ApprovalTab }  from './ApprovalTab'
import { riskColor, riskLabel } from '../utils'
import { RA_DIMS, DD_ITEMS } from '../data'

export function VendorDetail({ vendor, onBack, onUpdate, onDelete }) {
  const t = useTheme()
  const { canWrite, isAdmin } = useAuth()
  const [tab, setTab] = useState('intelligence')
  const [scores, setScores] = useState({ ...vendor.raScores })
  const [ddDone, setDdDone] = useState(vendor.ddCompleted || [])
  const [exporting, setExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  const handleExport = async () => {
    setExporting(true)
    try { await exportVendorPDF(vendor) }
    finally { setExporting(false) }
  }

  const ddPct = Math.round((ddDone.length / DD_ITEMS.length) * 100)

  const tabs = [
    ['approval',     '✅ Approval'],
    ['intelligence', '🔍 Intelligence'],
    ['assessment',   '📊 Assessment'],
    ['dd',           `✅ Due Diligence (${ddPct}%)`],
    ['documents',    '📁 Documents'],
    ['comments',     '💬 Notes'],
    ['alerts',       `🚨 Alerts${vendor.alerts?.length ? ` (${vendor.alerts.length})` : ''}`],
  ]

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Btn variant="ghost" small onClick={onBack}>← Back</Btn>
        {isAdmin && (
          <Btn variant="ghost" small onClick={() => setShowDeleteConfirm(true)}
            style={{ marginLeft: 'auto', color: t.text3, fontSize: 11, opacity: 0.6 }}>
            ⋯ Delete Vendor
          </Btn>
        )}
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AssignedTo vendor={vendor} onUpdate={onUpdate} />
          <Btn variant="ghost" small onClick={handleExport} disabled={exporting}>
            {exporting ? '⏳ Exporting...' : '⬇ Export PDF'}
          </Btn>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: t.text3, textTransform: 'uppercase', letterSpacing: '.08em' }}>Risk Score</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: riskColor(vendor.riskScore), lineHeight: 1 }}>{vendor.riskScore}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: riskColor(vendor.riskScore) }}>{riskLabel(vendor.riskScore)} Risk</div>
          </div>
        </div>
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} style={{ marginBottom: 20 }} />

      {tab === 'approval'     && <ApprovalTab vendor={vendor} onUpdate={onUpdate} />}
      {tab === 'intelligence' && <IntelligencePanel vendor={vendor} onUpdate={onUpdate} />}

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

      {tab === 'dd' && (
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>Due Diligence Checklist</div>
              <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{ddDone.length} of {DD_ITEMS.length} items complete</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: ddPct === 100 ? t.successText : ddPct > 50 ? t.warnText : t.dangerText, lineHeight: 1 }}>{ddPct}%</div>
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

      {tab === 'documents' && <DocumentsTab vendor={vendor} onScoreUpdate={onUpdate} />}
      {tab === 'comments'  && <CommentsTab  vendor={vendor} />}

      {tab === 'alerts' && (
        !vendor.alerts?.length
          ? <Card style={{ padding: 36, textAlign: 'center' }}><div style={{ fontSize: 24, marginBottom: 6 }}>✅</div><div style={{ fontSize: 14, fontWeight: 700, color: t.successText }}>No active alerts</div></Card>
          : <Card style={{ overflow: 'hidden' }}>{vendor.alerts.map(a => <AlertRow key={a.id} alert={a} />)}</Card>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div onClick={() => setShowDeleteConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: t.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,.35)', border: `1px solid ${t.dangerText}44` }}>
            <div style={{ fontSize: 28, marginBottom: 10, textAlign: 'center' }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 6, textAlign: 'center' }}>Delete Vendor?</div>
            <div style={{ fontSize: 13, color: t.text2, textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
              This will permanently delete <strong style={{ color: t.text }}>{vendor.name}</strong> and all associated documents, comments and risk data. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => { setShowDeleteConfirm(false); onDelete(vendor.id) }}>Delete Permanently</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
