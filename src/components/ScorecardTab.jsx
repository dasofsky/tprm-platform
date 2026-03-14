import { useState } from 'react'
import { useTheme } from '../context'
import { useAuth } from '../context'
import { supabase } from '../supabase'

const QUESTIONS = [
  { key: 'mfa',               label: 'MFA Supported/Enforced',             type: 'yesno', group: 'Access Control' },
  { key: 'sso',               label: 'SSO Supported',                      type: 'yesno', group: 'Access Control' },
  { key: 'rbac',              label: 'Role Based Permissions',              type: 'yesno', group: 'Access Control' },
  { key: 'password_policy',   label: 'Password Policy',                    type: 'yesno', group: 'Access Control' },
  { key: 'soc2_iso',          label: 'SOC2 or ISO 27001 Certified',        type: 'yesno', group: 'Compliance & Certifications' },
  { key: 'infosec_annual',    label: 'Reviews InfoSec Policies Annually',  type: 'yesno', group: 'Compliance & Certifications' },
  { key: 'ir_testing',        label: 'Incident Response Testing Annually', type: 'yesno', group: 'Compliance & Certifications' },
  { key: 'cloud_provider',    label: 'Cloud Provider',                     type: 'text',  group: 'Infrastructure' },
  { key: 'gold_master',       label: 'Servers Use Gold Master Images',     type: 'yesno', group: 'Infrastructure' },
  { key: 'staging_env',       label: 'Staging/Pre-production Environment', type: 'yesno', group: 'Infrastructure' },
  { key: 'asset_inventory',   label: 'Inventory of IT Assets',             type: 'yesno', group: 'Infrastructure' },
  { key: 'security_team',     label: 'Dedicated Security Team',            type: 'yesno', group: 'Security Program' },
  { key: 'security_awareness',label: 'Security Awareness Program',         type: 'yesno', group: 'Security Program' },
  { key: 'bcp',               label: 'Business Continuity Plan',           type: 'yesno', group: 'Security Program' },
  { key: 'pii',               label: 'Handles PII',                        type: 'yesno', group: 'Data & Privacy' },
  { key: 'library_inventory', label: 'Inventory of 3rd Party Libraries',   type: 'yesno', group: 'Development' },
  { key: 'outsource_dev',     label: 'Outsources Development Efforts',     type: 'yesno', group: 'Development' },
]

const GROUPS = ['Access Control', 'Compliance & Certifications', 'Infrastructure', 'Security Program', 'Data & Privacy', 'Development']

function ValueBadge({ value, type }) {
  const t = useTheme()

  if (value === 'unknown' || value === undefined || value === null) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
        background: t.surface2, color: t.text3, border: `1px solid ${t.border}`,
        padding: '2px 8px', borderRadius: 4 }}>
        <span style={{ fontSize: 10 }}>?</span> Unknown
      </span>
    )
  }

  if (type === 'text') {
    return (
      <span style={{ fontSize: 12, fontWeight: 600, color: t.text,
        background: '#f0f9ff', border: '1px solid #bae6fd',
        padding: '2px 10px', borderRadius: 4, color: '#0369a1' }}>
        {value}
      </span>
    )
  }

  // yes/no
  const isYes = value === 'yes'
  // For "outsource_dev" and "pii", yes is a warning not a positive
  const isWarningKey = false // handled by caller
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
      background: isYes ? '#f0fdf4' : '#fef2f2',
      color: isYes ? '#15803d' : '#dc2626',
      border: `1px solid ${isYes ? '#bbf7d0' : '#fecaca'}`,
      padding: '2px 10px', borderRadius: 4 }}>
      {isYes ? '✓ Yes' : '✗ No'}
    </span>
  )
}

function ConfidenceDot({ confidence }) {
  const t = useTheme()
  if (confidence === 'unknown') return null
  const color = confidence === 'high' ? '#16a34a' : '#d97706'
  const label = confidence === 'high' ? 'High confidence' : 'Medium confidence'
  return (
    <span title={label} style={{ width: 7, height: 7, borderRadius: '50%',
      background: color, display: 'inline-block', flexShrink: 0, marginLeft: 4 }} />
  )
}

export function ScorecardTab({ vendor, onUpdate }) {
  const t = useTheme()
  const { canWrite } = useAuth()
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState({}) // key → bool for source tooltip
  const sc = vendor.scorecard || null

  const toggle = key => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // Fetch document file paths for this vendor
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('file_path, name, doc_type')
        .eq('vendor_id', vendor.id)

      if (docsError) console.error('Failed to fetch documents for scorecard:', docsError.message)

      // Sort so questionnaires come first — they have the most answers
      const sorted = (docs || []).sort((a, b) => {
        if (a.doc_type === 'questionnaire') return -1
        if (b.doc_type === 'questionnaire') return 1
        return 0
      })
      const filePaths = sorted.map(d => d.file_path).filter(Boolean)
      const docTypes  = sorted.map(d => d.doc_type  || 'other')
      console.log(`Scorecard: sending ${filePaths.length} document(s) for ${vendor.name}`, filePaths.map(f => f.split('/').pop()))

      const res = await fetch('/api/scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId:      vendor.id,
          vendorName:    vendor.name,
          vendorWebsite: vendor.website,
          filePaths,
          docTypes,
          researchData:  vendor.research || null,
        }),
      })

      if (!res.ok) throw new Error((await res.json()).error || 'Request failed')
      const scorecard = await res.json()
      onUpdate({ ...vendor, scorecard })
    } catch (err) {
      console.error('Scorecard error:', err)
      alert('Failed to generate scorecard: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Count answered / unknown
  const answered  = sc ? QUESTIONS.filter(q => sc[q.key]?.value !== 'unknown' && sc[q.key]?.value).length : 0
  const total     = QUESTIONS.length
  const pct       = sc ? Math.round((answered / total) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 3 }}>Sonic Scorecard</div>
          <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>
            AI-generated from uploaded documents and web research.
            {sc && (
              <span style={{ marginLeft: 8, color: t.text2 }}>
                {answered}/{total} answered
                {sc._generatedAt && (
                  <span style={{ marginLeft: 8, opacity: .7 }}>
                    · Last run {new Date(sc._generatedAt).toLocaleDateString()}
                    {sc._docCount > 0 && ` · ${sc._docCount} doc${sc._docCount > 1 ? 's' : ''} analyzed`}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        {canWrite && (
          <button onClick={handleGenerate} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
              background: loading ? t.surface2 : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: loading ? t.text3 : '#fff', border: 'none', cursor: loading ? 'wait' : 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 2px 8px rgba(99,102,241,.35)' }}>
            {loading ? '⏳ Analyzing...' : (sc ? '🔄 Re-run Scorecard' : '✨ Generate Scorecard')}
          </button>
        )}
      </div>

      {/* Partial results warning */}
      {sc?._partial && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8,
          background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15 }}>⚠️</span>
          <div style={{ fontSize: 12, color: '#92400e' }}>
            <strong>Partial results</strong> — some documents were skipped due to API rate limits.
            Wait a minute then <button onClick={handleGenerate} style={{ background: 'none', border: 'none',
              cursor: 'pointer', color: '#92400e', textDecoration: 'underline', fontSize: 12, padding: 0,
              fontFamily: 'inherit' }}>re-run the scorecard</button> to fill in remaining unknowns.
          </div>
        </div>
      )}

      {/* Progress bar (only when we have data) */}
      {sc && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Completion</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: t.text }}>{pct}%</span>
            </div>
            <div style={{ background: t.border, borderRadius: 999, height: 6 }}>
              <div style={{ width: `${pct}%`, background: pct >= 75 ? '#16a34a' : pct >= 40 ? '#d97706' : '#6366f1', height: 6, borderRadius: 999, transition: 'width .4s ease' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
            {[
              { dot: '#16a34a', label: 'High confidence' },
              { dot: '#d97706', label: 'Medium' },
              { dot: t.border,  label: 'Unknown' },
            ].map(({ dot, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: t.text3 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block' }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!sc && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 6 }}>No scorecard yet</div>
          <div style={{ fontSize: 13, color: t.text3, maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Upload a security questionnaire or other vendor documents, then click <strong>Generate Scorecard</strong> to auto-fill all 17 questions from the documents and web research.
          </div>
          {canWrite && (
            <button onClick={handleGenerate}
              style={{ padding: '10px 22px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
              ✨ Generate Scorecard
            </button>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 24 }}>
          {GROUPS.map(g => (
            <div key={g} style={{ marginBottom: 20 }}>
              <div style={{ height: 11, width: 120, background: t.border, borderRadius: 4, marginBottom: 12, opacity: .6 }} />
              {QUESTIONS.filter(q => q.group === g).map(q => (
                <div key={q.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ height: 12, width: 200, background: t.border, borderRadius: 4 }} />
                  <div style={{ height: 22, width: 60, background: t.border, borderRadius: 4 }} />
                </div>
              ))}
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: t.text3 }}>
            ⏳ Analyzing documents and research data…
          </div>
        </div>
      )}

      {/* Scorecard table */}
      {sc && !loading && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {GROUPS.map((group, gi) => {
            const qs = QUESTIONS.filter(q => q.group === group)
            return (
              <div key={group}>
                {/* Group header */}
                <div style={{ padding: '10px 18px', background: t.surface2, borderTop: gi > 0 ? `1px solid ${t.border}` : 'none' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: t.text3, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {group}
                  </span>
                </div>

                {qs.map((q, qi) => {
                  const entry = sc[q.key] || {}
                  const isLast = qi === qs.length - 1
                  const isExpanded = expanded[q.key]
                  const hasSource = entry.source && entry.source !== 'unknown'

                  return (
                    <div key={q.key}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 18px', borderBottom: (isLast && gi < GROUPS.length - 1) ? 'none' : `1px solid ${t.border}`,
                        gap: 12 }}>
                        {/* Label + confidence dot */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{q.label}</span>
                          <ConfidenceDot confidence={entry.confidence} />
                        </div>

                        {/* Value + source button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <ValueBadge value={entry.value} type={q.type} />
                          {hasSource && (
                            <button onClick={() => toggle(q.key)}
                              title="View source"
                              style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 5,
                                cursor: 'pointer', padding: '2px 7px', fontSize: 10, color: t.text3,
                                fontFamily: 'inherit', transition: 'all .15s',
                                ...(isExpanded ? { background: t.accentBg, color: t.accentText, borderColor: t.accent } : {}) }}>
                              {isExpanded ? '▲ source' : '▾ source'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable source */}
                      {isExpanded && hasSource && (
                        <div style={{ padding: '8px 18px 12px 44px', background: t.accentBg,
                          borderBottom: `1px solid ${t.border}` }}>
                          <span style={{ fontSize: 11, color: t.text2, lineHeight: 1.55 }}>
                            <span style={{ fontWeight: 700, color: t.text3, textTransform: 'uppercase',
                              fontSize: 9, letterSpacing: '.06em', marginRight: 6 }}>Source</span>
                            {entry.source}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
