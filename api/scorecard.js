export const config = { maxDuration: 60 }

const SCORECARD_QUESTIONS = [
  { key: 'mfa',              label: 'MFA Supported/Enforced',          type: 'yesno' },
  { key: 'sso',              label: 'SSO Supported',                   type: 'yesno' },
  { key: 'soc2_iso',         label: 'SOC2 or ISO 27001 Certified',     type: 'yesno' },
  { key: 'cloud_provider',   label: 'Cloud Provider',                  type: 'text'  },
  { key: 'infosec_annual',   label: 'Reviews InfoSec Policies Annually', type: 'yesno' },
  { key: 'security_team',    label: 'Dedicated Security Team',         type: 'yesno' },
  { key: 'pii',              label: 'Handles PII',                     type: 'yesno' },
  { key: 'password_policy',  label: 'Password Policy',                 type: 'yesno' },
  { key: 'gold_master',      label: 'Servers Use Gold Master',         type: 'yesno' },
  { key: 'security_awareness', label: 'Security Awareness Program',   type: 'yesno' },
  { key: 'staging_env',      label: 'Staging/Pre-production Environment', type: 'yesno' },
  { key: 'asset_inventory',  label: 'Inventory of IT Assets',         type: 'yesno' },
  { key: 'library_inventory', label: 'Inventory of 3rd Party Libraries', type: 'yesno' },
  { key: 'rbac',             label: 'Role Based Permissions',          type: 'yesno' },
  { key: 'ir_testing',       label: 'Incident Response Testing Annually', type: 'yesno' },
  { key: 'bcp',              label: 'Business Continuity Plan',        type: 'yesno' },
  { key: 'outsource_dev',    label: 'Outsources Development Efforts',  type: 'yesno' },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey      = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY

  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { vendorId, vendorName, vendorWebsite, filePaths = [], researchData = null } = req.body
  if (!vendorName) return res.status(400).json({ error: 'vendorName is required' })

  // ── Fetch and read uploaded documents from Supabase Storage ─────────────
  const documentTexts = []

  if (filePaths.length > 0 && supabaseUrl && serviceKey) {
    for (const fp of filePaths.slice(0, 5)) { // cap at 5 docs
      try {
        const signedRes = await fetch(
          `${supabaseUrl}/storage/v1/object/sign/vendor-documents/${fp}`,
          {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'apikey':        serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ expiresIn: 300 }),
          }
        )
        const signedData = await signedRes.json()
        if (!signedData.signedURL) continue

        const url     = `${supabaseUrl}/storage/v1${signedData.signedURL}`
        const fileRes = await fetch(url)
        const ext     = fp.split('.').pop().toLowerCase()

        if (ext === 'pdf') {
          const buf    = await fileRes.arrayBuffer()
          const base64 = Buffer.from(buf).toString('base64')
          documentTexts.push({ type: 'pdf', base64, fileName: fp.split('/').pop() })
        } else if (ext === 'docx' || ext === 'doc') {
          const buf = await fileRes.arrayBuffer()
          try {
            const mammoth   = await import('mammoth')
            const result    = await mammoth.extractRawText({ buffer: Buffer.from(buf) })
            documentTexts.push({ type: 'text', text: result.value?.slice(0, 8000) || '', fileName: fp.split('/').pop() })
          } catch { /* skip if mammoth fails */ }
        } else if (ext === 'txt') {
          const text = await fileRes.text()
          documentTexts.push({ type: 'text', text: text.slice(0, 8000), fileName: fp.split('/').pop() })
        }
      } catch (err) {
        console.error(`Error fetching doc ${fp}:`, err.message)
      }
    }
  }

  // ── Build Claude message content ─────────────────────────────────────────
  const content = []

  // Attach PDF documents as native blocks
  for (const doc of documentTexts.filter(d => d.type === 'pdf')) {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: doc.base64 } })
  }

  // Build the text prompt
  const docTextSection = documentTexts
    .filter(d => d.type === 'text')
    .map(d => `--- Document: ${d.fileName} ---\n${d.text}`)
    .join('\n\n')

  const researchSection = researchData
    ? `\n\nWEB RESEARCH DATA:\nSummary: ${researchData.summary || ''}\nCertifications: ${(researchData.certifications || []).join(', ')}\nCompliance: ${(researchData.compliance || []).join(', ')}\nStrengths: ${(researchData.strengths || []).join('; ')}\nConcerns: ${(researchData.weaknesses || []).join('; ')}`
    : ''

  const prompt = `You are a third-party risk analyst completing a security scorecard for "${vendorName}" (${vendorWebsite || ''}).

Use the provided documents and research data to answer each question. For each question:
- If the answer is clearly evidenced, set "value" to "yes", "no", or the text value, and "confidence" to "high"
- If it can be reasonably inferred, set "confidence" to "medium"  
- If there is no evidence, set "value" to "unknown" and "confidence" to "unknown"
- Always set "source" to a brief description of where you found the answer (e.g. "Security questionnaire p.3", "SOC2 report", "Web research", "Inferred from certification", "Not found in available documents")
- For cloud_provider, return the provider name (AWS, Azure, GCP, etc.) or "N/A" if self-hosted, or "unknown"

Return ONLY valid JSON — no markdown, no extra text:
{
  "mfa":              { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "sso":              { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "soc2_iso":         { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "cloud_provider":   { "value": "AWS|Azure|GCP|N/A|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "infosec_annual":   { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "security_team":    { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "pii":              { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "password_policy":  { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "gold_master":      { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "security_awareness": { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "staging_env":      { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "asset_inventory":  { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "library_inventory":{ "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "rbac":             { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "ir_testing":       { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "bcp":              { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." },
  "outsource_dev":    { "value": "yes|no|unknown", "confidence": "high|medium|unknown", "source": "..." }
}

${docTextSection ? `UPLOADED DOCUMENTS:\n${docTextSection}` : 'No documents uploaded.'}
${researchSection}`

  content.push({ type: 'text', text: prompt })

  // ── Call Claude ───────────────────────────────────────────────────────────
  const hasPdf = documentTexts.some(d => d.type === 'pdf')
  const headers = {
    'Content-Type':      'application/json',
    'x-api-key':         apiKey,
    'anthropic-version': '2023-06-01',
    ...(hasPdf ? { 'anthropic-beta': 'pdfs-2024-09-25' } : {}),
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages:   [{ role: 'user', content }],
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' })

    const text  = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Could not parse response' })

    const scorecard = JSON.parse(match[0])
    scorecard._generatedAt    = new Date().toISOString()
    scorecard._docCount       = documentTexts.length
    scorecard._hadResearch    = !!researchData

    // Save to Supabase
    if (vendorId && supabaseUrl && serviceKey) {
      await fetch(`${supabaseUrl}/rest/v1/vendors?id=eq.${vendorId}`, {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ scorecard }),
      })
    }

    return res.status(200).json(scorecard)
  } catch (err) {
    console.error('Scorecard error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
