import { useState, useEffect, useRef } from 'react'
import { useTheme, useAuth } from '../context'
import { Card, Btn, Spinner } from './ui'
import { uploadDocument, fetchDocuments, deleteDocument, getDocumentURL } from '../db'
import { supabase } from '../supabase'

const DOC_TYPES = [
  { v: 'audit_report',   l: '📋 Audit Report',        icon: '📋' },
  { v: 'certificate',    l: '🏆 Certificate',          icon: '🏆' },
  { v: 'contract',       l: '📜 Contract',             icon: '📜' },
  { v: 'questionnaire',  l: '❓ Questionnaire',        icon: '❓' },
  { v: 'pentest',        l: '🔐 Pen Test Report',      icon: '🔐' },
  { v: 'other',          l: '📄 Other',                icon: '📄' },
]

const docIcon = type => DOC_TYPES.find(d => d.v === type)?.icon || '📄'
const fmtSize = bytes => bytes > 1024*1024 ? `${(bytes/1024/1024).toFixed(1)} MB` : `${Math.round(bytes/1024)} KB`
const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function DocumentsTab({ vendor, onScoreUpdate }) {
  const t = useTheme()
  const { currentUser, canWrite } = useAuth()
  const [docs,       setDocs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [analyzing,  setAnalyzing]  = useState(false)
  const [error,      setError]      = useState(null)
  const [docType,    setDocType]    = useState('other')
  const [dragOver,   setDragOver]   = useState(false)
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

  async function handleFiles(files) {
    if (!files?.length) return
    setUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      try {
        // Upload to Supabase Storage
        const doc = await uploadDocument(vendor.id, file, {
          doc_type:    docType,
          uploaded_by: currentUser?.name || 'Unknown',
        })
        setDocs(p => [doc, ...p])

        // Now analyze with AI
        setAnalyzing(true)
        await analyzeDocument(doc, file)
      } catch (err) {
        setError(`Failed to upload ${file.name}: ${err.message}`)
      }
    }

    setUploading(false)
    setAnalyzing(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function analyzeDocument(doc, file) {
    try {
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

      // For non-PDFs read as text; PDFs are fetched server-side from Supabase Storage
      let textContent = null
      if (!isPDF) {
        textContent = await file.text().catch(() => null)
      }

      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName:  vendor.name,
          fileName:    file.name,
          docType:     doc.doc_type,
          filePath:    doc.file_path,   // server fetches PDF directly from Supabase
          isPDF,
          textContent,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        console.error('analyze-document error:', errData)
        return
      }

      const analysis = await response.json()

      // Update the document row with AI analysis
      await supabase.from('documents').update({
        summary:      analysis.summary,
        key_findings: analysis.keyFindings || [],
        score_impact: analysis.scoreImpact || {},
      }).eq('id', doc.id)

      // Refresh docs list
      await loadDocs()

      // Update vendor scores if AI found significant impacts
      if (analysis.scoreImpact && onScoreUpdate) {
        const newScores = { ...vendor.raScores }
        let changed = false
        Object.keys(analysis.scoreImpact).forEach(k => {
          const delta = analysis.scoreImpact[k] || 0
          if (delta !== 0 && newScores[k] !== undefined) {
            newScores[k] = Math.min(100, Math.max(0, newScores[k] + delta))
            changed = true
          }
        })
        if (changed) {
          const avg = Math.round(Object.values(newScores).reduce((a,b) => a+b, 0) / 5)
          onScoreUpdate({ ...vendor, raScores: newScores, riskScore: avg })
        }
      }
    } catch (err) {
      console.warn('Document analysis failed (non-critical):', err)
    }
  }

  async function handleDownload(doc) {
    try {
      const url = await getDocumentURL(doc.file_path)
      if (url) window.open(url, '_blank')
    } catch (err) {
      setError('Failed to get download link')
    }
  }

  async function handleDelete(doc) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    try {
      await deleteDocument(doc)
      setDocs(p => p.filter(d => d.id !== doc.id))
    } catch (err) {
      setError('Failed to delete document')
    }
  }

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
            style={{ padding: 28, textAlign: 'center', cursor: uploading ? 'default' : 'pointer', background: dragOver ? t.accentBg : t.surface2, borderBottom: `1px solid ${t.border}`, transition: 'background .15s' }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {uploading || analyzing ? '⏳' : '📁'}
            </div>
            {uploading
              ? <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Uploading...</div>
              : analyzing
              ? <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Analyzing with AI...</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 3 }}>Claude is reviewing the document and updating risk scores</div>
                </div>
              : <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Drop files here or click to upload</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 3 }}>PDF · DOCX · XLSX · TXT — AI will analyze and update risk scores</div>
                </div>
            }
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv" onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
          </div>

          {/* Document type selector */}
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text2, whiteSpace: 'nowrap' }}>Document type:</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DOC_TYPES.map(dt => (
                <button key={dt.v} onClick={() => setDocType(dt.v)}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${docType === dt.v ? t.accent : t.border}`, background: docType === dt.v ? t.accentBg : 'transparent', color: docType === dt.v ? t.accentText : t.text2 }}>
                  {dt.l}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {error && (
        <div style={{ padding: '10px 14px', background: t.dangerBg, border: `1px solid ${t.dangerText}44`, borderRadius: 8, fontSize: 12, color: t.dangerText, marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Document list */}
      {loading
        ? <div style={{ textAlign: 'center', padding: 40, color: t.text3 }}><Spinner /></div>
        : docs.length === 0
        ? <Card style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>No documents uploaded</div>
            <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>
              {canWrite ? 'Upload contracts, audit reports, certifications and more.' : 'No documents have been uploaded for this vendor yet.'}
            </div>
          </Card>
        : docs.map(doc => (
          <Card key={doc.id} style={{ padding: 18, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 26, flexShrink: 0 }}>{docIcon(doc.doc_type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                      {DOC_TYPES.find(d => d.v === doc.doc_type)?.l.replace(/^\S+\s/, '') || 'Document'}
                      {doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ''}
                      {doc.uploaded_by ? ` · Uploaded by ${doc.uploaded_by}` : ''}
                      {doc.created_at ? ` · ${fmtDate(doc.created_at)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Btn small variant="ghost" onClick={() => handleDownload(doc)}>⬇ Download</Btn>
                    {canWrite && <Btn small variant="danger" onClick={() => handleDelete(doc)}>Delete</Btn>}
                  </div>
                </div>

                {doc.summary && (
                  <p style={{ fontSize: 12, color: t.text2, lineHeight: 1.6, margin: '8px 0 0' }}>{doc.summary}</p>
                )}

                {doc.key_findings?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Key Findings</div>
                    {doc.key_findings.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: t.text, paddingLeft: 10, borderLeft: `2px solid ${t.accent}55`, marginBottom: 4, lineHeight: 1.5 }}>{f}</div>
                    ))}
                  </div>
                )}

                {doc.score_impact && Object.values(doc.score_impact).some(v => v !== 0) && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.06em', paddingTop: 2 }}>Score impact:</span>
                    {Object.entries(doc.score_impact).filter(([,v]) => v !== 0).map(([k, v]) => (
                      <span key={k} style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999, background: v > 0 ? t.successBg : t.dangerBg, color: v > 0 ? t.successText : t.dangerText, border: `1px solid ${(v > 0 ? t.successText : t.dangerText)}33` }}>
                        {k} {v > 0 ? `+${v}` : v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))
      }
    </div>
  )
}
