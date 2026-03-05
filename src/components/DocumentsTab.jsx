import { useState, useEffect, useRef } from 'react'
import { useTheme, useAuth } from '../context'
import { Card, Btn, Spinner } from './ui'
import { uploadDocument, fetchDocuments, deleteDocument, getDocumentURL } from '../db'
import { supabase } from '../supabase'

const DOC_TYPES = [
  { v: 'audit_report',  l: '📋 Audit Report' },
  { v: 'certificate',   l: '🏆 Certificate' },
  { v: 'contract',      l: '📜 Contract' },
  { v: 'questionnaire', l: '❓ Questionnaire' },
  { v: 'pentest',       l: '🔐 Pen Test Report' },
  { v: 'other',         l: '📄 Other' },
]

const docIcon  = type => DOC_TYPES.find(d => d.v === type)?.l.split(' ')[0] || '📄'
const fmtSize  = bytes => bytes > 1024*1024 ? `${(bytes/1024/1024).toFixed(1)} MB` : `${Math.round(bytes/1024)} KB`
const fmtDate  = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const hasAnalysis = doc => doc.summary && doc.summary.length > 10

export function DocumentsTab({ vendor, onScoreUpdate }) {
  const t = useTheme()
  const { currentUser, canWrite } = useAuth()
  const [docs,        setDocs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [dragOver,    setDragOver]    = useState(false)
  const [docType,     setDocType]     = useState('other')
  const [error,       setError]       = useState(null)
  const [analyzing,   setAnalyzing]   = useState(null)  // doc.id being analyzed, or 'uploading'
  const fileRef = useRef()

  useEffect(() => { loadDocs() }, [vendor.id])

  async function loadDocs() {
    try {
      setLoading(true)
      const data = await fetchDocuments(vendor.id)
      setDocs(data)
    } catch (err) {
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  // ── Analyze a document by its DB record (no file object needed) ───────────
  async function analyzeDoc(doc) {
    setAnalyzing(doc.id)
    setError(null)
    try {
      const res = await fetch('/api/analyze-document', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: vendor.name,
          fileName:   doc.name,
          docType:    doc.doc_type,
          filePath:   doc.file_path,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const analysis = await res.json()

      if (!analysis.summary) throw new Error('No analysis returned')

      // Save results back to DB
      await supabase.from('documents').update({
        summary:      analysis.summary,
        key_findings: analysis.keyFindings || [],
        score_impact: analysis.scoreImpact || {},
      }).eq('id', doc.id)

      // Refresh list
      await loadDocs()

      // Apply score impacts to vendor
      if (analysis.scoreImpact && onScoreUpdate) {
        const newScores = { ...vendor.raScores }
        let changed = false
        Object.keys(analysis.scoreImpact).forEach(k => {
          const delta = Number(analysis.scoreImpact[k]) || 0
          if (delta !== 0 && newScores[k] !== undefined) {
            newScores[k] = Math.min(100, Math.max(0, newScores[k] + delta))
            changed = true
          }
        })
        if (changed) {
          const avg = Math.round(Object.values(newScores).reduce((a, b) => a + b, 0) / 5)
          onScoreUpdate({ ...vendor, raScores: newScores, riskScore: avg })
        }
      }
    } catch (err) {
      setError(`Analysis failed for "${doc.name}": ${err.message}`)
    } finally {
      setAnalyzing(null)
    }
  }

  // ── Upload one or more files ───────────────────────────────────────────────
  async function handleFiles(files) {
    if (!files?.length) return
    setUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      try {
        const doc = await uploadDocument(vendor.id, file, {
          doc_type:    docType,
          uploaded_by: currentUser?.name || 'Unknown',
        })
        setDocs(p => [doc, ...p])
        // Immediately analyze
        await analyzeDoc(doc)
      } catch (err) {
        setError(`Failed to upload ${file.name}: ${err.message}`)
      }
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDownload(doc) {
    try {
      const url = await getDocumentURL(doc.file_path)
      if (url) window.open(url, '_blank')
    } catch { setError('Failed to get download link') }
  }

  async function handleDelete(doc) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    try {
      await deleteDocument(doc)
      setDocs(p => p.filter(d => d.id !== doc.id))
    } catch { setError('Failed to delete document') }
  }

  const unanalyzed = docs.filter(d => !hasAnalysis(d))

  return (
    <div>
      {/* Upload area */}
      {canWrite && (
        <Card style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
            style={{ padding: 28, textAlign: 'center', cursor: uploading ? 'default' : 'pointer', background: dragOver ? t.accentBg : t.surface2, borderBottom: `1px solid ${t.border}`, transition: 'background .15s' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {uploading || analyzing === 'uploading' ? '⏳' : '📁'}
            </div>
            {uploading
              ? <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Uploading...</div>
              : analyzing
              ? <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Analyzing with AI...</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 3 }}>Claude is reading the document and updating risk scores</div>
                </div>
              : <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Drop files here or click to upload</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 3 }}>PDF · DOCX · XLSX · TXT · Images — AI will analyze and update risk scores</div>
                </div>
            }
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.jpg,.jpeg,.png"
              onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
          </div>

          {/* Type selector */}
          <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text2, whiteSpace: 'nowrap' }}>Type:</span>
            {DOC_TYPES.map(dt => (
              <button key={dt.v} onClick={() => setDocType(dt.v)}
                style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${docType === dt.v ? t.accent : t.border}`, background: docType === dt.v ? t.accentBg : 'transparent', color: docType === dt.v ? t.accentText : t.text2 }}>
                {dt.l}
              </button>
            ))}
          </div>
        </Card>
      )}

      {error && (
        <div style={{ padding: '10px 14px', background: t.dangerBg, border: `1px solid ${t.dangerText}44`, borderRadius: 8, fontSize: 12, color: t.dangerText, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.dangerText, fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Banner: re-analyze all unanalyzed docs */}
      {unanalyzed.length > 0 && !analyzing && (
        <div style={{ padding: '10px 14px', background: t.warnBg, border: `1px solid ${t.warnText}44`, borderRadius: 8, fontSize: 12, color: t.warnText, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span>⚡ {unanalyzed.length} document{unanalyzed.length > 1 ? 's' : ''} {unanalyzed.length > 1 ? 'have' : 'has'} not been analyzed yet</span>
          {canWrite && (
            <button onClick={async () => { for (const d of unanalyzed) await analyzeDoc(d) }}
              style={{ background: t.warnText, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Analyze All
            </button>
          )}
        </div>
      )}

      {/* Document list */}
      {loading
        ? <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
        : docs.length === 0
        ? <Card style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>No documents uploaded</div>
            <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>
              {canWrite ? 'Upload contracts, audit reports, certifications and more.' : 'No documents have been uploaded yet.'}
            </div>
          </Card>
        : docs.map(doc => {
            const isBeingAnalyzed = analyzing === doc.id
            const analyzed = hasAnalysis(doc)
            return (
              <Card key={doc.id} style={{ padding: 18, marginBottom: 10, opacity: isBeingAnalyzed ? .7 : 1, transition: 'opacity .2s' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 26, flexShrink: 0 }}>{docIcon(doc.doc_type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{doc.name}</div>
                        <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                          {DOC_TYPES.find(d => d.v === doc.doc_type)?.l.replace(/^\S+\s/, '') || 'Document'}
                          {doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ''}
                          {doc.uploaded_by ? ` · ${doc.uploaded_by}` : ''}
                          {doc.created_at ? ` · ${fmtDate(doc.created_at)}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                        {isBeingAnalyzed
                          ? <span style={{ fontSize: 11, color: t.accent, display: 'flex', alignItems: 'center', gap: 4 }}><Spinner size={12} /> Analyzing...</span>
                          : !analyzed && canWrite
                          ? <button onClick={() => analyzeDoc(doc)}
                              style={{ fontSize: 11, fontWeight: 700, color: t.warnText, background: t.warnBg, border: `1px solid ${t.warnText}44`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              ⚡ Analyze
                            </button>
                          : analyzed && canWrite
                          ? <button onClick={() => analyzeDoc(doc)}
                              style={{ fontSize: 11, color: t.text3, background: 'none', border: `1px solid ${t.border}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              ↺ Re-analyze
                            </button>
                          : null
                        }
                        <Btn small variant="ghost" onClick={() => handleDownload(doc)}>⬇ Download</Btn>
                        {canWrite && <Btn small variant="danger" onClick={() => handleDelete(doc)}>Delete</Btn>}
                      </div>
                    </div>

                    {/* Analysis results */}
                    {analyzed && (
                      <>
                        <p style={{ fontSize: 12, color: t.text2, lineHeight: 1.6, margin: '8px 0 0' }}>{doc.summary}</p>
                        {doc.key_findings?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Key Findings</div>
                            {doc.key_findings.map((f, i) => (
                              <div key={i} style={{ fontSize: 12, color: t.text, paddingLeft: 10, borderLeft: `2px solid ${t.accent}55`, marginBottom: 4, lineHeight: 1.5 }}>{f}</div>
                            ))}
                          </div>
                        )}
                        {doc.score_impact && Object.values(doc.score_impact).some(v => v !== 0) && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Score impact:</span>
                            {Object.entries(doc.score_impact).filter(([, v]) => v !== 0).map(([k, v]) => (
                              <span key={k} style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999, background: v > 0 ? t.successBg : t.dangerBg, color: v > 0 ? t.successText : t.dangerText, border: `1px solid ${(v > 0 ? t.successText : t.dangerText)}33` }}>
                                {k} {v > 0 ? `+${v}` : v}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Not yet analyzed */}
                    {!analyzed && !isBeingAnalyzed && (
                      <div style={{ marginTop: 6, fontSize: 11, color: t.text3, fontStyle: 'italic' }}>
                        Not yet analyzed — click ⚡ Analyze to extract risk insights
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
      }
    </div>
  )
}
