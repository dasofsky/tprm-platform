import { jsPDF } from 'jspdf'
import { riskColor, riskLabel } from './utils'
import { RA_DIMS, DD_ITEMS } from './data'

const SONIC_RED  = [220, 50, 50]
const DARK       = [15, 23, 42]
const GRAY       = [71, 85, 105]
const LIGHT_GRAY = [241, 245, 249]
const WHITE      = [255, 255, 255]
const GREEN      = [22, 163, 74]
const AMBER      = [217, 119, 6]
const RED        = [220, 38, 38]

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return [r,g,b]
}

function scoreRgb(score) {
  return score >= 75 ? GREEN : score >= 50 ? AMBER : RED
}

export async function exportVendorPDF(vendor, { showDD = true } = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, margin = 18
  let y = 0

  // ── HEADER BAR ────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 36, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Sonic TPRM Platform', margin, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(165, 243, 252)
  doc.text('Third-Party Risk Management — Vendor Risk Report', margin, 24)

  doc.setTextColor(148, 163, 184)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}`, margin, 31)

  y = 46

  // ── VENDOR TITLE ──────────────────────────────────────────────────────────
  doc.setTextColor(...DARK)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(vendor.name, margin, y)
  y += 7

  // Build the subtitle line
  const approvalStatus = vendor.approval?.status && vendor.approval.status !== 'N/A'
    ? vendor.approval.status
    : null
  const rawJira = vendor.jiraTicket || ''
  const jiraFormatted = rawJira
    ? 'NPW-' + rawJira.replace(/^NPW-?/i, '').trim()
    : null

  const subtitleParts = [
    vendor.category,
    vendor.tier ? `${vendor.tier} Tier` : null,
    vendor.status,
    vendor.website,
    jiraFormatted,
    approvalStatus,
  ].filter(Boolean)

  // Render the subtitle — split into two lines if too long for the page
  const subtitleText = subtitleParts.join('  ·  ')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)

  const maxWidth = W - margin * 2
  const subtitleLines = doc.splitTextToSize(subtitleText, maxWidth)
  doc.text(subtitleLines, margin, y)
  y += subtitleLines.length * 5 + 2

  // If approval status present, draw a small colored badge beside it
  if (approvalStatus) {
    const approvalColors = {
      'Approved':                     [22, 163, 74],
      'Approved with Conditions':     [217, 119, 6],
      'Approved with Recommendations':[217, 119, 6],
      'Denied':                       [220, 38, 38],
    }
    const badgeRgb = approvalColors[approvalStatus] || GRAY
    // Draw a subtle colored line under the subtitle to indicate approval state
    doc.setDrawColor(...badgeRgb)
    doc.setLineWidth(1.5)
    doc.line(margin, y - 1, margin + 60, y - 1)
    doc.setLineWidth(0.4)
    y += 2
  }

  // Divider
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(margin, y, W - margin, y)
  y += 8

  // ── RISK SCORE BANNER ─────────────────────────────────────────────────────
  const rgb = scoreRgb(vendor.riskScore)
  doc.setFillColor(rgb[0], rgb[1], rgb[2], 0.08)
  doc.setFillColor(...LIGHT_GRAY)
  doc.roundedRect(margin, y, W - margin*2, 22, 3, 3, 'F')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Overall Risk Score', margin + 6, y + 9)

  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...rgb)
  doc.text(String(vendor.riskScore), margin + 6, y + 19)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...rgb)
  doc.text(`${riskLabel(vendor.riskScore)} Risk`, margin + 24, y + 19)

  // Mini score bars on the right
  const dimX = margin + 85
  RA_DIMS.forEach((d, i) => {
    const val = vendor.raScores[d.key] || 0
    const bx  = dimX + (i * 22)
    const rgb2 = scoreRgb(val)

    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(d.label, bx, y + 6, { align: 'center', maxWidth: 18 })

    doc.setFillColor(226, 232, 240)
    doc.roundedRect(bx - 6, y + 8, 12, 3, 1, 1, 'F')
    doc.setFillColor(...rgb2)
    doc.roundedRect(bx - 6, y + 8, 12 * val/100, 3, 1, 1, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...rgb2)
    doc.text(String(val), bx, y + 18, { align: 'center' })
  })

  y += 30

  // ── VENDOR DETAILS ────────────────────────────────────────────────────────
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Vendor Details', margin, y)
  y += 5

  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, W - margin, y)
  y += 6

  const details = [
    ['Contact',  vendor.contact  || '—'],
    ['Category', vendor.category || '—'],
    ['Tier',     vendor.tier     || '—'],
    ['Status',   vendor.status   || '—'],
    ['Website',  vendor.website  || '—'],
  ]

  details.forEach(([label, value], i) => {
    const col = i % 2 === 0 ? margin : W/2 + 4
    if (i % 2 === 0 && i > 0) y += 7
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(label.toUpperCase(), col, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(value, col + 22, y)
  })
  y += 14

  // ── AI INTELLIGENCE ───────────────────────────────────────────────────────
  if (vendor.research && !vendor.research.raw) {
    const r = vendor.research

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('AI Security Intelligence', margin, y)
    y += 5
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, y, W - margin, y)
    y += 6

    // Summary
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    const summaryLines = doc.splitTextToSize(r.summary || '', W - margin*2)
    doc.text(summaryLines, margin, y)
    y += summaryLines.length * 5 + 4

    // Certifications
    if (r.certifications?.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text('Certifications:', margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      doc.text(r.certifications.join('  ·  '), margin + 28, y)
      y += 7
    }

    // Strengths & Weaknesses side by side
    const colW = (W - margin*2 - 6) / 2
    if (r.strengths?.length > 0 || r.weaknesses?.length > 0) {
      const startY = y

      // Strengths
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...GREEN)
      doc.text('✓ Strengths', margin, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      r.strengths?.slice(0,4).forEach(s => {
        const lines = doc.splitTextToSize(`• ${s}`, colW - 4)
        doc.text(lines, margin, y)
        y += lines.length * 4.5
      })

      // Weaknesses (same column start)
      let wy = startY
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...RED)
      doc.text('⚠ Concerns', margin + colW + 6, wy)
      wy += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      r.weaknesses?.slice(0,4).forEach(w => {
        const lines = doc.splitTextToSize(`• ${w}`, colW - 4)
        doc.text(lines, margin + colW + 6, wy)
        wy += lines.length * 4.5
      })

      y = Math.max(y, wy) + 4
    }

    // Incidents
    if (r.incidents?.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text('Known Incidents', margin, y)
      y += 4
      r.incidents.forEach(inc => {
        const sCol = inc.severity === 'critical' ? RED : inc.severity === 'high' ? [249,115,22] : inc.severity === 'medium' ? AMBER : GRAY
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...sCol)
        doc.text(`[${inc.severity?.toUpperCase()}]`, margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GRAY)
        const lines = doc.splitTextToSize(`${inc.date} — ${inc.description}`, W - margin*2 - 22)
        doc.text(lines, margin + 20, y)
        y += lines.length * 4.5 + 1
      })
      y += 2
    }
  }

  if (showDD) {
    // ── DUE DILIGENCE ─────────────────────────────────────────────────────────
    // New page if we're getting close to the bottom
    if (y > 220) { doc.addPage(); y = 20 }
  
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Due Diligence Checklist', margin, y)
  
    const ddPct = Math.round(((vendor.ddCompleted?.length || 0) / DD_ITEMS.length) * 100)
    const pctRgb = ddPct === 100 ? GREEN : ddPct > 50 ? AMBER : RED
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...pctRgb)
    doc.text(`${ddPct}% Complete`, W - margin, y, { align: 'right' })
    y += 5
  
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, y, W - margin, y)
  
    // Progress bar
    y += 4
    doc.setFillColor(226, 232, 240)
    doc.roundedRect(margin, y, W - margin*2, 3, 1, 1, 'F')
    doc.setFillColor(...pctRgb)
    doc.roundedRect(margin, y, (W - margin*2) * ddPct/100, 3, 1, 1, 'F')
    y += 8
  
    // Checklist items in 2 columns
    DD_ITEMS.forEach((item, i) => {
      const done = vendor.ddCompleted?.includes(i)
      const col  = i % 2 === 0 ? margin : W/2 + 4
      if (i % 2 === 0 && i > 0) y += 6
  
      doc.setFontSize(9)
      if (done) {
        doc.setFillColor(...GREEN)
        doc.circle(col + 2, y - 1.5, 2, 'F')
        doc.setTextColor(...WHITE)
        doc.setFont('helvetica', 'bold')
        doc.text('✓', col + 1.3, y - 0.5)
        doc.setTextColor(...DARK)
        doc.setFont('helvetica', 'normal')
      } else {
        doc.setDrawColor(200, 210, 220)
        doc.circle(col + 2, y - 1.5, 2, 'S')
        doc.setTextColor(...GRAY)
        doc.setFont('helvetica', 'normal')
      }
      doc.text(item, col + 6, y)
    })
    y += 10
  
    // ── ALERTS ────────────────────────────────────────────────────────────────
    if (vendor.alerts?.length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
  
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text('Active Alerts', margin, y)
      y += 5
      doc.setDrawColor(226, 232, 240)
      doc.line(margin, y, W - margin, y)
      y += 6
  
      vendor.alerts.forEach(a => {
        const aCol = a.type === 'critical' ? RED : a.type === 'warning' ? AMBER : [3, 105, 161]
        doc.setFillColor(...aCol)
        doc.rect(margin, y - 3, 2.5, 7, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...aCol)
        doc.text(a.type.toUpperCase(), margin + 5, y + 0.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...DARK)
        doc.text(a.msg, margin + 22, y + 0.5)
        y += 8
      })
    }
  
  
  }

    // ── DOCUMENTS USED IN ANALYSIS ───────────────────────────────────────────
  // Fetch documents from Supabase for this vendor
  let vendorDocs = []
  try {
    const { fetchDocuments } = await import('./db.js')
    vendorDocs = await fetchDocuments(vendor.id)
  } catch {}

  if (vendorDocs.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Documents Used in Risk Analysis', margin, y)
    y += 5
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, y, W - margin, y)
    y += 7

    vendorDocs.forEach(d => {
      if (y > 265) { doc.addPage(); y = 20 }

      // Doc name + type
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text(d.name || 'Untitled', margin, y)

      const docTypeLabel = d.doc_type ? d.doc_type.replace(/_/g,' ').replace(/\w/g, l => l.toUpperCase()) : 'Document'
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      doc.text(` — ${docTypeLabel}`, margin + doc.getTextWidth(d.name || 'Untitled'), y)
      y += 5

      // Summary
      if (d.summary) {
        const lines = doc.splitTextToSize(d.summary, W - margin*2)
        doc.setFontSize(8)
        doc.setTextColor(...GRAY)
        doc.text(lines, margin, y)
        y += lines.length * 4.5
      }

      // Score impacts
      const impacts = d.score_impact ? Object.entries(d.score_impact).filter(([,v]) => v !== 0) : []
      if (impacts.length > 0) {
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...GRAY)
        doc.text('Score impact: ', margin, y)
        let ix = margin + doc.getTextWidth('Score impact: ')
        impacts.forEach(([k, v]) => {
          const iCol = v > 0 ? GREEN : RED
          doc.setTextColor(...iCol)
          const label = `${k} ${v > 0 ? '+' : ''}${v}  `
          doc.text(label, ix, y)
          ix += doc.getTextWidth(label)
        })
        y += 5
      }
      y += 3
    })
  }

  // ── NEWS HIGHLIGHTS ───────────────────────────────────────────────────────
  if (vendor.research?.newsHighlights?.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Recent News', margin, y)
    y += 5
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, y, W - margin, y)
    y += 7

    vendor.research.newsHighlights.forEach(n => {
      if (y > 268) { doc.addPage(); y = 20 }
      const sentCol = n.sentiment === 'positive' ? GREEN : n.sentiment === 'negative' ? RED : GRAY
      const icon    = n.sentiment === 'positive' ? '▲' : n.sentiment === 'negative' ? '▼' : '●'

      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...sentCol)
      doc.text(icon, margin, y)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      const titleLines = doc.splitTextToSize(n.title || '', W - margin*2 - 8)
      doc.text(titleLines, margin + 6, y)
      y += titleLines.length * 4.5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...GRAY)
      const dateSent = [n.date, n.sentiment ? `Sentiment: ${n.sentiment}` : ''].filter(Boolean).join('  ·  ')
      doc.text(dateSent, margin + 6, y)
      y += 6
    })
  }

  
  // ── APPROVAL DECISION ────────────────────────────────────────────────────
  const appr = vendor.approval || {}
  if (appr.status && appr.status !== 'N/A') {
    if (y > 220) { doc.addPage(); y = 20 }

    // Section header
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Approval Decision', margin, y)
    y += 5
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(margin, y, W - margin, y)
    y += 8

    // Status badge row
    const approvalColors = {
      'Approved':                      [22, 163, 74],
      'Approved with Conditions':      [217, 119, 6],
      'Approved with Recommendations': [217, 119, 6],
      'Denied':                        [220, 38, 38],
    }
    const aCol = approvalColors[appr.status] || GRAY

    doc.setFillColor(...aCol)
    doc.roundedRect(margin, y - 4, 3, 14, 1, 1, 'F')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...aCol)
    doc.text(appr.status, margin + 8, y + 5)

    if (appr.savedAt || appr.savedBy) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      const savedStr = [
        appr.savedBy ? `by ${appr.savedBy}` : '',
        appr.savedAt ? new Date(appr.savedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '',
      ].filter(Boolean).join(' · ')
      doc.text(savedStr, margin + 8, y + 12)
    }
    y += 20

    // Field rows — only show non-N/A fields
    const approvalRows = [
      { label: 'MFA',               value: appr.mfa,        show: appr.mfa && appr.mfa !== 'N/A' },
      { label: 'DPA',               value: appr.dpa,        show: appr.dpa && appr.dpa !== 'N/A' },
      { label: 'SSO',               value: appr.sso,        show: appr.sso && appr.sso !== 'N/A' },
      { label: 'SOC 2 Required',    value: 'Yes',           show: appr.soc2 },
      { label: 'CDK 3PA Required',  value: 'Yes',           show: appr.cdk },
      { label: 'Password Hygiene',  value: 'Required',      show: appr.passwordHygiene },
      { label: 'URL Whitelist',     value: appr.whitelist,  show: appr.whitelist && appr.whitelist !== 'N/A' },
      { label: 'VLAN',              value: appr.vlan,       show: appr.vlan && appr.vlan !== 'N/A' },
      { label: 'Pilot Deployment',  value: 'Yes',           show: appr.pilot },
    ]

    const visibleRows = approvalRows.filter(r => r.show)
    if (visibleRows.length > 0) {
      doc.setFontSize(8.5)
      visibleRows.forEach(row => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...DARK)
        doc.text(`${row.label}:`, margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GRAY)
        doc.text(String(row.value), margin + 38, y)
        y += 6
      })

      // Whitelist exceptions
      if (appr.whitelist === 'Approved Except' && appr.whitelistExcept?.trim()) {
        appr.whitelistExcept.trim().split('\n').filter(Boolean).forEach(url => {
          if (y > 270) { doc.addPage(); y = 20 }
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...GRAY)
          doc.setFontSize(8)
          doc.text(`  • ${url.trim()}`, margin + 38, y)
          y += 5
        })
      }
      y += 4
    }

    // Generated Jira text
    if (appr.generatedText?.trim()) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text('Jira Post Content', margin, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...GRAY)

      const jiraLines = appr.generatedText.trim().split('\n')
      jiraLines.forEach(line => {
        if (y > 270) { doc.addPage(); y = 20 }
        if (!line.trim()) { y += 3; return }

        // Bold section headers (lines wrapped in *asterisks*)
        if (line.startsWith('*') && line.endsWith('*')) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...DARK)
          const headerText = line.slice(1, -1)
          doc.text(headerText, margin, y)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...GRAY)
          y += 5
          return
        }

        // Bullet points
        const prefix   = line.startsWith('•') ? '• ' : ''
        const textBody = line.startsWith('•') ? line.slice(1).trim() : line
        const indent   = line.startsWith('•') ? margin + 4 : margin
        const wrapped  = doc.splitTextToSize(prefix + textBody, W - indent - margin)
        doc.text(wrapped, indent, y)
        y += wrapped.length * 4.5
      })
    }

    // Additional notes
    if (appr.additionalNotes?.trim()) {
      if (y > 240) { doc.addPage(); y = 20 }
      y += 4
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text('Additional Notes', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...GRAY)
      const noteLines = doc.splitTextToSize(appr.additionalNotes.trim(), W - margin * 2)
      doc.text(noteLines, margin, y)
      y += noteLines.length * 4.5 + 4
    }
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...LIGHT_GRAY)
    doc.rect(0, 285, W, 12, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('Sonic TPRM Platform — Confidential', margin, 292)
    doc.text(`Page ${i} of ${pageCount}`, W - margin, 292, { align: 'right' })
  }

  // Save
  const filename = `${vendor.name.replace(/[^a-z0-9]/gi, '_')}_Risk_Report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
