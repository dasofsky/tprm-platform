import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useTheme } from '../context'
import { Btn, Spinner } from './ui'
import { fetchCategories } from '../db'

// Expected columns (name → internal key)
const COL_MAP = {
  'company name':   'name',    'name': 'name',   'vendor': 'name',  'vendor name': 'name',
  'website':        'website', 'url': 'website',  'company website': 'website',
  'contact email':  'contactEmail', 'email': 'contactEmail', 'contact_email': 'contactEmail',
  'contact':        'contact', 'contact name': 'contact',  'contact person': 'contact',
  'category':       'category',
  'tier':           'tier',
  'country':        'country',
  'jira':           'jiraTicket', 'jira ticket': 'jiraTicket', 'jira_ticket': 'jiraTicket',
  'status':         'status',
  'assigned to':    'assignedTo', 'assessor': 'assignedTo',
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map(line => {
    // Handle quoted commas
    const cols = []
    let cur = '', inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    const row = {}
    headers.forEach((h, i) => {
      const key = COL_MAP[h]
      if (key) row[key] = cols[i]?.replace(/^"|"$/g, '') || ''
    })
    return row
  }).filter(r => r.name?.trim())
}

async function parseXLSX(buffer) {
  // XLSX is imported at top of file via npm package
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return rows.map(row => {
    const mapped = {}
    Object.entries(row).forEach(([h, v]) => {
      const key = COL_MAP[String(h).toLowerCase().trim()]
      if (key) mapped[key] = String(v).trim()
    })
    return mapped
  }).filter(r => r.name?.trim())
}

export function BulkImportModal({ onClose, onImport }) {
  const t = useTheme()
  const fileRef = useRef()
  const [step,     setStep]     = useState('upload')  // upload | preview | importing | done
  const [rows,     setRows]     = useState([])
  const [errors,   setErrors]   = useState([])
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [parseErr, setParseErr] = useState(null)

  const handleFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    setParseErr(null)
    try {
      let parsed = []
      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        const text = await file.text()
        parsed = parseCSV(text)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        parsed = await parseXLSX(buf)
      } else {
        setParseErr('Please upload a .csv or .xlsx file')
        return
      }

      if (parsed.length === 0) {
        setParseErr('No valid rows found. Make sure your file has a header row with at least "Company Name" and "Website" columns.')
        return
      }

      setRows(parsed)
      setStep('preview')
    } catch (err) {
      setParseErr(`Could not parse file: ${err.message}`)
    }
  }

  const handleImport = async () => {
    setStep('importing')
    setErrors([])
    let done = 0
    const errs = []

    for (const row of rows) {
      try {
        // Fetch logo for each vendor
        let logoUrl = null
        if (row.website) {
          try {
            const r = await fetch('/api/get-logo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ website: row.website }),
            })
            const d = await r.json()
            logoUrl = d.logoUrl || null
          } catch {}
        }

        await onImport({
          name:         row.name?.trim(),
          website:      row.website?.trim() || '',
          category:     row.category?.trim() || 'Other',
          tier:         row.tier?.trim() || 'Medium',
          contact:      row.contact?.trim() || '',
          contactEmail: row.contactEmail?.trim() || '',
          country:      row.country?.trim() || '',
          jiraTicket:   row.jiraTicket?.trim() || '',
          status:       row.status?.trim() || 'Onboarding',
          assignedTo:   row.assignedTo?.trim() || '',
          logoUrl,
          riskScore:    50,
          raScores:     { security: 50, compliance: 50, financial: 50, operational: 50, reputational: 50 },
          alerts: [], ddCompleted: [], research: null, documents: [], monData: [50,50,50,50,50,50],
        })
        done++
        setProgress(Math.round((done / rows.length) * 100))
      } catch (err) {
        errs.push(`${row.name}: ${err.message}`)
      }
    }

    setErrors(errs)
    setStep('done')
    setProgress(100)
  }

  const th = { padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' }
  const td = { padding: '8px 12px', fontSize: 12, color: t.text, borderBottom: `1px solid ${t.border2}` }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 780, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.35)', border: `1px solid ${t.border}` }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: t.text }}>📥 Bulk Import Vendors</div>
            <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>Upload a CSV or Excel file to import multiple vendors at once</div>
          </div>
          <button onClick={onClose} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: t.text2, fontSize: 13 }}>✕</button>
        </div>

        {/* ── UPLOAD STEP ── */}
        {step === 'upload' && (
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
              style={{ border: `2px dashed ${t.border}`, borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer', background: t.surface2, marginBottom: 16 }}
              onMouseOver={e => e.currentTarget.style.borderColor = t.accent}
              onMouseOut={e => e.currentTarget.style.borderColor = t.border}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Drop your file here or click to browse</div>
              <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>Supports .csv and .xlsx files</div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
            </div>

            {parseErr && <div style={{ padding: '10px 14px', background: t.dangerBg, border: `1px solid ${t.dangerText}44`, borderRadius: 8, fontSize: 12, color: t.dangerText, marginBottom: 14 }}>⚠️ {parseErr}</div>}

            {/* Column guide */}
            <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 8 }}>Expected columns</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  ['Company Name', 'Required'],
                  ['Website', 'Required'],
                  ['Contact Email', 'Optional'],
                  ['Contact', 'Optional'],
                  ['Category', 'Optional'],
                  ['Tier', 'Optional'],
                  ['Jira Ticket', 'Optional'],
                  ['Status', 'Optional'],
                  ['Assigned To', 'Optional'],
                ].map(([col, req]) => (
                  <div key={col} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: req === 'Required' ? 700 : 400, color: req === 'Required' ? t.text : t.text2 }}>{col}</span>
                    <span style={{ fontSize: 10, color: req === 'Required' ? t.accent : t.text3 }}>{req}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 10 }}>Column headers are flexible — "Vendor Name", "Company Name", "Name" are all recognised as the name field.</div>
            </div>
          </div>
        )}

        {/* ── PREVIEW STEP ── */}
        {step === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                Found <strong>{rows.length}</strong> vendors in <em>{fileName}</em>
              </div>
              <Btn variant="ghost" small onClick={() => setStep('upload')}>← Change file</Btn>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: `1px solid ${t.border}`, borderRadius: 10, marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: t.surface2 }}>
                  <tr>
                    {['Name', 'Website', 'Contact Email', 'Contact', 'Category', 'Tier', 'Jira'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...td, fontWeight: 600 }}>{r.name || <span style={{ color: t.dangerText }}>⚠ Missing</span>}</td>
                      <td style={{ ...td, color: t.accent, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.website || '—'}</td>
                      <td style={td}>{r.contactEmail || '—'}</td>
                      <td style={td}>{r.contact || '—'}</td>
                      <td style={td}>{r.category || '—'}</td>
                      <td style={td}>{r.tier || '—'}</td>
                      <td style={td}>{r.jiraTicket || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
              <Btn variant="accent" onClick={handleImport}>Import {rows.length} Vendors →</Btn>
            </div>
          </div>
        )}

        {/* ── IMPORTING STEP ── */}
        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Spinner size={32} />
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginTop: 16 }}>Importing vendors...</div>
            <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>Fetching logos and saving to database</div>
            <div style={{ marginTop: 16, background: t.border, borderRadius: 999, height: 8, maxWidth: 300, margin: '16px auto 0' }}>
              <div style={{ background: '#6366f1', height: 8, borderRadius: 999, width: `${progress}%`, transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: 12, color: t.text3, marginTop: 6 }}>{progress}%</div>
          </div>
        )}

        {/* ── DONE STEP ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>Import complete!</div>
            <div style={{ fontSize: 13, color: t.text2, marginTop: 4 }}>
              {rows.length - errors.length} of {rows.length} vendors imported successfully
            </div>
            {errors.length > 0 && (
              <div style={{ marginTop: 16, textAlign: 'left', background: t.dangerBg, border: `1px solid ${t.dangerText}44`, borderRadius: 8, padding: 14, maxHeight: 120, overflowY: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.dangerText, marginBottom: 6 }}>Failed rows:</div>
                {errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: t.dangerText }}>{e}</div>)}
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              <Btn variant="accent" onClick={onClose}>Done</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
