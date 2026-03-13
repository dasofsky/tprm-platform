export const config = { maxDuration: 60 }

// Priority order for document types — questionnaires answer the most questions
const DOC_TYPE_PRIORITY = ['questionnaire', 'soc2', 'security', 'policy', 'other']

const ALL_KEYS = ['mfa','sso','soc2_iso','cloud_provider','infosec_annual','security_team',
  'pii','password_policy','gold_master','security_awareness','staging_env',
  'asset_inventory','library_inventory','rbac','ir_testing','bcp','outsource_dev']

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchDoc(supabaseUrl, serviceKey, fp) {
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
  if (!signedData.signedURL) throw new Error('Could not get signed URL')

  const url     = `${supabaseUrl}/storage/v1${signedData.signedURL}`
  const fileRes = await fetch(url)
  const ext     = fp.split('.').pop().toLowerCase()

  if (ext === 'pdf') {
    const buf    = await fileRes.arrayBuffer()
    const base64 = Buffer.from(buf).toString('base64')
    return { type: 'pdf', base64, fileName: fp.split('/').pop() }
  } else if (ext === 'docx' || ext === 'doc') {
    const buf     = await fileRes.arrayBuffer()
    const mammoth = await import('mammoth')
    const result  = await mammoth.extractRawText({ buffer: Buffer.from(buf) })
    return { type: 'text', text: result.value?.slice(0, 12000) || '', fileName: fp.split('/').pop() }
  } else if (ext === 'txt') {
    const text = await fileRes.text()
    return { type: 'text', text: text.slice(0, 12000), fileName: fp.split('/').pop() }
  }
  return null
}

function buildContent(doc, vendorName, vendorWebsite, researchSection, unknownKeys) {
  const content = []
  if (doc.type === 'pdf') {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: doc.base64 } })
  }

  const docSection = doc.type === 'text'
    ? `DOCUMENT: ${doc.fileName}\n${doc.text}`
    : `DOCUMENT: ${doc.fileName} (PDF — read the document block above)`

  const prompt = `You are a third-party risk analyst completing a security scorecard for "${vendorName}" (${vendorWebsite || ''}).

Read the provided document carefully. Answer ONLY the following questions. For each:
- Clearly evidenced → "confidence": "high"
- Reasonably inferred → "confidence": "medium"  
- Not found → "value": "unknown", "confidence": "unknown"
- "source": where exactly you found it (e.g. "Section 3.2", "Page 4", "Not found in this document")
- cloud_provider: return provider name (AWS/Azure/GCP/etc), "N/A" if self-hosted, or "unknown"

Questions to answer: ${unknownKeys.join(', ')}

Return ONLY valid JSON, no markdown:
{
${unknownKeys.map(k => `  "${k}": { "value": "...", "confidence": "high|medium|unknown", "source": "..." }`).join(',\n')}
}

${docSection}
${researchSection}`

  content.push({ type: 'text', text: prompt })
  return content
}

async function callClaude(apiKey, content, hasPdf, retries = 2) {
  const headers = {
    'Content-Type':      'application/json',
    'x-api-key':         apiKey,
    'anthropic-version': '2023-06-01',
    ...(hasPdf ? { 'anthropic-beta': 'pdfs-2024-09-25' } : {}),
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages:   [{ role: 'user', content }],
      }),
    })

    if (response.status === 429 && attempt < retries) {
      const waitMs = (attempt + 1) * 15000
      console.log(`Rate limited, waiting ${waitMs}ms before retry ${attempt + 1}`)
      await sleep(waitMs)
      continue
    }

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || `API error ${response.status}`)
    return data
  }
}

function mergeResults(base, overlay) {
  const rank = { high: 3, medium: 2, unknown: 1 }
  const merged = { ...base }
  for (const key of ALL_KEYS) {
    if (!overlay[key]) continue
    const baseR    = rank[base[key]?.confidence]    || 0
    const overlayR = rank[overlay[key]?.confidence] || 0
    if (overlayR > baseR) merged[key] = overlay[key]
  }
  return merged
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey      = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY

  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { vendorId, vendorName, vendorWebsite, filePaths = [], docTypes = [], researchData = null } = req.body
  if (!vendorName) return res.status(400).json({ error: 'vendorName is required' })

  const researchSection = researchData
    ? `\nWEB RESEARCH:\nSummary: ${researchData.summary || ''}\nCertifications: ${(researchData.certifications || []).join(', ')}\nCompliance: ${(researchData.compliance || []).join(', ')}`
    : ''

  // Sort: questionnaire first, then by doc type priority
  const sortedPaths = [...filePaths].sort((a, b) => {
    const ta = docTypes[filePaths.indexOf(a)] || 'other'
    const tb = docTypes[filePaths.indexOf(b)] || 'other'
    return DOC_TYPE_PRIORITY.indexOf(ta) - DOC_TYPE_PRIORITY.indexOf(tb)
  })

  console.log(`Scorecard "${vendorName}": ${sortedPaths.length} docs, sequential processing`)

  let scorecard    = {}
  let docsAnalyzed = 0

  for (const fp of sortedPaths.slice(0, 4)) {
    const unknownKeys = ALL_KEYS.filter(k => !scorecard[k] || scorecard[k].confidence === 'unknown')
    if (unknownKeys.length === 0) { console.log('All answered — stopping early'); break }

    console.log(`Doc: ${fp.split('/').pop()} — ${unknownKeys.length} unknown`)

    try {
      const doc     = await fetchDoc(supabaseUrl, serviceKey, fp)
      if (!doc) continue

      const content = buildContent(doc, vendorName, vendorWebsite, researchSection, unknownKeys)
      const data    = await callClaude(apiKey, content, doc.type === 'pdf')
      const text    = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
      const match   = text.match(/\{[\s\S]*\}/)

      if (match) {
        scorecard = mergeResults(scorecard, JSON.parse(match[0]))
        docsAnalyzed++
        const answered = ALL_KEYS.filter(k => scorecard[k]?.confidence !== 'unknown').length
        console.log(`  Merged — ${answered}/${ALL_KEYS.length} answered`)
      }

      // 2s pause between docs to stay well under rate limits
      if (sortedPaths.indexOf(fp) < sortedPaths.length - 1) await sleep(2000)

    } catch (err) {
      console.error(`Failed on ${fp}:`, err.message)
      if (err.message.includes('rate limit') || err.message.includes('tokens per minute')) break
    }
  }

  // Research-only fallback if no docs were processed
  if (docsAnalyzed === 0 && researchData) {
    console.log('No docs — research-only pass')
    try {
      const content = buildContent(
        { type: 'text', text: '', fileName: 'web research' },
        vendorName, vendorWebsite, researchSection, ALL_KEYS
      )
      const data  = await callClaude(apiKey, content, false)
      const text  = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
      const match = text.match(/\{[\s\S]*\}/)
      if (match) scorecard = JSON.parse(match[0])
    } catch (err) {
      console.error('Research fallback failed:', err.message)
    }
  }

  // Fill missing keys as unknown
  for (const key of ALL_KEYS) {
    if (!scorecard[key]) scorecard[key] = { value: 'unknown', confidence: 'unknown', source: 'Not analyzed' }
  }

  scorecard._generatedAt = new Date().toISOString()
  scorecard._docCount    = docsAnalyzed
  scorecard._hadResearch = !!researchData
  scorecard._partial     = docsAnalyzed < sortedPaths.length

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
}
