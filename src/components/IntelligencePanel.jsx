import { useState } from 'react'
import { useTheme, useAuth } from '../context'
import { Card, Btn, Spinner } from './ui'
import { RadarChart } from './charts'
import { riskColor, riskLabel } from '../utils'
import { RA_DIMS } from '../data'

export function IntelligencePanel({ vendor, onUpdate }) {
  const t = useTheme()
  const { canWrite } = useAuth()
  const [phase,  setPhase]  = useState(null) // null | 'running' | 'done' | 'error'
  const [log,    setLog]    = useState([])
  const [result, setResult] = useState(vendor.research || null)
  const [tab,    setTab]    = useState('research') // 'research' | 'assessment'

  const addLog = (msg, type = 'info') => setLog(p => [...p, { msg, type }])

  async function runResearch() {
    setPhase('running')
    setLog([])

    try {
      addLog(`🌐 Searching public sources for ${vendor.name}...`)
      addLog('🔍 Checking certifications, breaches & compliance...')

      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName:    vendor.name,
          vendorWebsite: vendor.website,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Research failed')
      }

      addLog('✅ Research complete!', 'success')
      setResult(data)
      setPhase('done')

      // Save results back to the vendor (persists to Supabase via onUpdate)
      const newScores   = data.recommendedScores || vendor.raScores
      const newRiskScore = data.overallRiskScore  || vendor.riskScore
      onUpdate({ ...vendor, research: data, raScores: newScores, riskScore: newRiskScore })

    } catch (err) {
      addLog(`❌ ${err.message}`, 'error')
      setPhase('error')
    }
  }

  const tabStyle = (id) => ({
    padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: 'none', fontFamily: 'inherit',
    background: tab === id ? t.surface : 'transparent',
    color:      tab === id ? t.text    : t.text3,
    boxShadow:  tab === id ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
    whiteSpace: 'nowrap', transition: 'all .15s',
  })

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 2, background: t.surface2, padding: 3, borderRadius: 10, border: `1px solid ${t.border}`, marginBottom: 18, width: 'fit-content' }}>
        <button style={tabStyle('research')}   onClick={() => setTab('research')}>🔍 Web Research</button>
        <button style={tabStyle('assessment')} onClick={() => setTab('assessment')}>📊 AI Assessment</button>
      </div>

      {/* ── RESEARCH TAB ── */}
      {tab === 'research' && (
        <div>
          <Card style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>AI Security Intelligence</div>
                <div style={{ fontSize: 12, color: t.text2, maxWidth: 420, lineHeight: 1.6 }}>
                  Claude searches the web for certifications, breach history, compliance status and recent news about{' '}
                  <strong style={{ color: t.text }}>{vendor.name}</strong>.
                </div>
                <a href={vendor.website} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-block', marginTop: 5, fontSize: 12, color: t.accent }}>
                  🌐 {vendor.website}
                </a>
              </div>

              {canWrite && (
                <Btn
                  variant={phase === 'running' ? 'ghost' : 'accent'}
                  disabled={phase === 'running'}
                  onClick={runResearch}
                >
                  {phase === 'running'
                    ? <><Spinner size={13} color="#94a3b8" /> Researching...</>
                    : phase === 'done' ? '🔄 Re-run Research' : '🔍 Run Research'
                  }
                </Btn>
              )}

              {!canWrite && (
                <div style={{ fontSize: 12, color: t.text3, padding: '8px 12px', background: t.surface2, borderRadius: 8, border: `1px solid ${t.border}` }}>
                  👁 Read-only access
                </div>
              )}
            </div>

            {/* Progress log */}
            {log.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.border}` }}>
                {log.map((l, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 3, color: l.type === 'error' ? t.dangerText : l.type === 'success' ? t.successText : t.text2 }}>
                    {l.msg}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* No results yet */}
          {!result && phase !== 'running' && (
            <Card style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>No intelligence data yet</div>
              <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>
                {canWrite ? 'Click "Run Research" to generate an AI-powered security report.' : 'Contact an admin or analyst to run research on this vendor.'}
              </div>
            </Card>
          )}

          {/* Results */}
          {result && !result.raw && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Summary + Score */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
                <Card style={{ padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Summary</div>
                  <p style={{ fontSize: 13, color: t.text, lineHeight: 1.7, margin: 0 }}>{result.summary}</p>

                  {result.certifications?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Certifications</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {result.certifications.map((c, i) => (
                          <span key={i} style={{ fontSize: 11, fontWeight: 600, background: t.accentBg, color: t.accentText, padding: '2px 8px', borderRadius: 999, border: `1px solid ${t.accent}33` }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                <Card style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em' }}>Risk Score</div>
                  <div style={{ fontSize: 44, fontWeight: 800, color: riskColor(result.overallRiskScore || 50), lineHeight: 1 }}>{result.overallRiskScore || '—'}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: riskColor(result.overallRiskScore || 50) }}>{result.riskLevel}</div>
                  {result.bugBounty && (
                    <div style={{ marginTop: 6, fontSize: 10, background: t.successBg, color: t.successText, borderRadius: 999, padding: '2px 8px', fontWeight: 600, border: `1px solid ${t.successText}33` }}>
                      ✓ Bug Bounty
                    </div>
                  )}
                </Card>
              </div>

              {/* Strengths & Weaknesses */}
              {(result.strengths?.length > 0 || result.weaknesses?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Card style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.successText, marginBottom: 8 }}>✓ Strengths</div>
                    {result.strengths?.map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: t.text, paddingLeft: 10, borderLeft: `2px solid ${t.successText}55`, marginBottom: 6, lineHeight: 1.5 }}>{s}</div>
                    ))}
                  </Card>
                  <Card style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.dangerText, marginBottom: 8 }}>⚠ Concerns</div>
                    {result.weaknesses?.map((w, i) => (
                      <div key={i} style={{ fontSize: 12, color: t.text, paddingLeft: 10, borderLeft: `2px solid ${t.dangerText}55`, marginBottom: 6, lineHeight: 1.5 }}>{w}</div>
                    ))}
                  </Card>
                </div>
              )}

              {/* Incidents */}
              {result.incidents?.length > 0 && (
                <Card style={{ padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Known Incidents</div>
                  {result.incidents.map((inc, i) => {
                    const sColor = { critical: t.dangerText, high: '#f97316', medium: t.warnText, low: t.text3 }[inc.severity] || t.text3
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < result.incidents.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, whiteSpace: 'nowrap', minWidth: 36 }}>{inc.date}</div>
                        <div style={{ flex: 1, fontSize: 12, color: t.text, lineHeight: 1.5 }}>{inc.description}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sColor, background: sColor + '18', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', height: 'fit-content' }}>{inc.severity}</span>
                      </div>
                    )
                  })}
                </Card>
              )}

              {/* News */}
              {result.newsHighlights?.length > 0 && (
                <Card style={{ padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Recent News</div>
                  {result.newsHighlights.map((n, i) => {
                    const sentColor = n.sentiment === 'positive' ? t.successText : n.sentiment === 'negative' ? t.dangerText : t.text3
                    return (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < result.newsHighlights.length - 1 ? `1px solid ${t.border}` : 'none', alignItems: 'center' }}>
                        <span style={{ fontSize: 14 }}>{n.sentiment === 'positive' ? '📈' : n.sentiment === 'negative' ? '📉' : '📰'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{n.date}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sentColor, textTransform: 'capitalize' }}>{n.sentiment}</span>
                      </div>
                    )
                  })}
                </Card>
              )}

              <div style={{ fontSize: 11, color: t.text3, textAlign: 'right' }}>
                Last updated: {result.lastUpdated ? new Date(result.lastUpdated).toLocaleString() : 'Unknown'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ASSESSMENT TAB ── */}
      {tab === 'assessment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>
              {result ? 'AI-Recommended Scores' : 'Current Risk Scores'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
              {RA_DIMS.map(d => {
                const val = vendor.raScores[d.key] || 0
                return (
                  <div key={d.key} style={{ textAlign: 'center', padding: '12px 8px', background: t.surface2, borderRadius: 10, border: `1px solid ${t.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.text2, marginBottom: 5 }}>{d.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: riskColor(val) }}>{val}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: riskColor(val), marginTop: 3 }}>{riskLabel(val)}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 12, padding: '11px 14px', background: t.surface2, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text2 }}>Composite Risk Score</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: riskColor(vendor.riskScore) }}>{vendor.riskScore} <span style={{ fontSize: 12, fontWeight: 400, color: t.text3 }}>({riskLabel(vendor.riskScore)})</span></span>
            </div>
          </Card>

          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 8 }}>Risk Radar</div>
            <RadarChart scores={vendor.raScores} size={240} />
          </Card>

          {!result && (
            <div style={{ fontSize: 12, color: t.text2, textAlign: 'center', padding: '12px', background: t.surface2, borderRadius: 8, border: `1px solid ${t.border}` }}>
              💡 Run web research to get AI-recommended scores based on real data
            </div>
          )}
        </div>
      )}
    </div>
  )
}
