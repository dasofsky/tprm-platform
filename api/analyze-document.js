export const config = { maxDuration: 60 }

const EXT_TO_MIME = {
  '.pdf':  'application/pdf',
  '.docx': 'docx',
  '.doc':  'docx',
  '.xlsx': 'xlsx',
  '.xls':  'xlsx',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.txt':  'text/plain',
  '.csv':  'text/plain',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey      = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY

  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { vendorName, fileName, docType, filePath, textContent } = req.body

  const ext      = '.' + (fileName?.split('.').pop() || '').toLowerCase()
  const fileType = EXT_TO_MIME[ext] || 'text/plain'

  console.log(`analyze-document: file=${fileName}, ext=${ext}, fileType=${fileType}`)

  try {
    let userContent

    // ── Fetch file from Supabase Storage ─────────────────────────────────────
    const fetchFromStorage = async () => {
      const signedRes = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/vendor-documents/${filePath}`,
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
      return fileRes.arrayBuffer()
    }

    // ── PDF — native Claude document block ────────────────────────────────────
    if (fileType === 'application/pdf' && filePath && supabaseUrl && serviceKey) {
      const buf    = await fetchFromStorage()
      const base64 = Buffer.from(buf).toString('base64')
      console.log(`PDF: bytes=${buf.byteLength}`)
      userContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text',     text: buildPrompt(vendorName, fileName, docType) },
      ]

    // ── DOCX — extract text using mammoth via dynamic import ──────────────────
    } else if (fileType === 'docx' && filePath && supabaseUrl && serviceKey) {
      const buf = await fetchFromStorage()
      console.log(`DOCX: bytes=${buf.byteLength}, extracting text...`)
      try {
        const mammoth   = await import('mammoth')
        const result    = await mammoth.extractRawText({ buffer: Buffer.from(buf) })
        const extracted = result.value?.trim() || ''
        console.log(`DOCX extracted: ${extracted.length} chars`)
        userContent = buildTextPrompt(vendorName, fileName, docType,
          extracted.slice(0, 10000) || '(could not extract text from this DOCX)')
      } catch (mammothErr) {
        console.error('mammoth extraction failed:', mammothErr.message)
        userContent = buildTextPrompt(vendorName, fileName, docType,
          `(DOCX file: ${fileName} — text extraction failed, please summarize based on filename and document type)`)
      }

    // ── XLSX — extract text by parsing XML inside the ZIP ────────────────────
    } else if (fileType === 'xlsx' && filePath && supabaseUrl && serviceKey) {
      const buf = await fetchFromStorage()
      console.log(`XLSX: bytes=${buf.byteLength}, extracting...`)
      try {
        // XLSX files are ZIP archives — extract shared strings XML for text content
        const { Readable } = await import('stream')
        const unzipper     = await import('unzipper')
        const zip          = await unzipper.Open.buffer(Buffer.from(buf))
        
        let sharedStrings = ''
        let sheetsText    = ''

        for (const file of zip.files) {
          if (file.path === 'xl/sharedStrings.xml') {
            const content   = await file.buffer()
            sharedStrings   = content.toString('utf8')
              .replace(/<[^>]+>/g, ' ')   // strip XML tags
              .replace(/\s+/g, ' ').trim()
          }
          if (file.path.startsWith('xl/worksheets/') && file.path.endsWith('.xml')) {
            const content = await file.buffer()
            sheetsText   += content.toString('utf8')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ').trim() + '\n'
          }
        }

        const extracted = [sharedStrings, sheetsText].filter(Boolean).join('\n').slice(0, 10000)
        console.log(`XLSX extracted: ${extracted.length} chars`)
        userContent = buildTextPrompt(vendorName, fileName, docType,
          extracted || '(could not extract text from this XLSX)')
      } catch (xlsxErr) {
        console.error('XLSX extraction failed:', xlsxErr.message)
        userContent = buildTextPrompt(vendorName, fileName, docType,
          `(Excel file: ${fileName} — please summarize based on filename and document type)`)
      }

    // ── Images — native Claude image block ────────────────────────────────────
    } else if (fileType.startsWith('image/') && filePath && supabaseUrl && serviceKey) {
      const buf    = await fetchFromStorage()
      const base64 = Buffer.from(buf).toString('base64')
      console.log(`Image: bytes=${buf.byteLength}`)
      userContent = [
        { type: 'image', source: { type: 'base64', media_type: fileType, data: base64 } },
        { type: 'text',  text: buildPrompt(vendorName, fileName, docType) },
      ]

    // ── Plain text / CSV — use content sent from client ───────────────────────
    } else {
      console.log(`Text mode: length=${textContent?.length ?? 0}`)
      userContent = buildTextPrompt(vendorName, fileName, docType, textContent)
    }

    // ── Call Claude ───────────────────────────────────────────────────────────
    const headers = {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    }
    if (Array.isArray(userContent) && userContent[0]?.type === 'document') {
      headers['anthropic-beta'] = 'pdfs-2024-09-25'
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages:   [{ role: 'user', content: userContent }],
      }),
    })

    const data = await response.json()
    console.log(`Anthropic status=${response.status}, stop_reason=${data.stop_reason}`)

    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data).slice(0, 500))
      return res.status(500).json({ error: data.error?.message || 'API error' })
    }

    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
    console.log(`Response preview: ${text.slice(0, 200)}`)

    try {
      const match  = text.match(/\{[\s\S]*\}/)
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(text)
      return res.status(200).json(parsed)
    } catch {
      return res.status(200).json({ summary: text.slice(0, 400), keyFindings: [], scoreImpact: {} })
    }

  } catch (err) {
    console.error('Server error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

function buildPrompt(vendorName, fileName, docType) {
  return `You are a third-party risk analyst reviewing a vendor document.
Vendor: ${vendorName} | File: ${fileName} | Type: ${docType}

Read the full content carefully and return ONLY valid JSON — no markdown, no extra text:
{
  "summary": "2-3 sentence summary of the document and its risk significance",
  "keyFindings": ["specific finding 1", "specific finding 2", "specific finding 3"],
  "scoreImpact": { "security": 0, "compliance": 0, "financial": 0, "operational": 0, "reputational": 0 }
}
scoreImpact: positive (+5 to +20) improves score, negative (-5 to -20) reveals concerns, 0 if no impact.`
}

function buildTextPrompt(vendorName, fileName, docType, textContent) {
  return `${buildPrompt(vendorName, fileName, docType)}\n\nDocument content:\n${textContent?.slice(0, 10000) || '(no content)'}`
}
