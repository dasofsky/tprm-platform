export const config = { maxDuration: 60 }

// File types Claude can read natively as documents
const BINARY_TYPES = {
  'application/pdf': 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword': 'application/msword',
  'application/vnd.ms-excel': 'application/vnd.ms-excel',
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
  'image/gif': 'image/gif',
}

// Map file extension to mime type for cases where browser sends wrong type
const EXT_TO_MIME = {
  '.pdf':  'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc':  'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls':  'application/vnd.ms-excel',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.txt':  'text/plain',
  '.csv':  'text/plain',
}

// Which content block type Claude expects for each mime
function getBlockType(mime) {
  if (mime?.startsWith('image/')) return 'image'
  if (mime && mime !== 'text/plain') return 'document'
  return 'text'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey      = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY

  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { vendorName, fileName, docType, filePath, textContent } = req.body

  // Determine mime type from filename extension
  const ext  = '.' + (fileName?.split('.').pop() || '').toLowerCase()
  const mime = EXT_TO_MIME[ext] || 'text/plain'
  const blockType = getBlockType(mime)

  console.log(`analyze-document: file=${fileName}, ext=${ext}, mime=${mime}, blockType=${blockType}`)

  try {
    let userContent

    if (blockType !== 'text' && filePath && supabaseUrl && serviceKey) {
      // Fetch binary file server-side from Supabase Storage
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
      const signedUrl  = signedData.signedURL
        ? `${supabaseUrl}/storage/v1${signedData.signedURL}`
        : null

      if (!signedUrl) {
        console.log('Could not get signed URL, falling back to text description')
        userContent = buildTextPrompt(vendorName, fileName, docType, `[File could not be retrieved: ${fileName}]`)
      } else {
        const fileRes    = await fetch(signedUrl)
        const fileBuffer = await fileRes.arrayBuffer()
        const base64     = Buffer.from(fileBuffer).toString('base64')
        console.log(`Fetched file: bytes=${fileBuffer.byteLength}, base64=${base64.length}`)

        if (blockType === 'image') {
          userContent = [
            { type: 'image',    source: { type: 'base64', media_type: mime, data: base64 } },
            { type: 'text',     text: buildPrompt(vendorName, fileName, docType) },
          ]
        } else {
          // document block (PDF, DOCX, XLSX)
          userContent = [
            { type: 'document', source: { type: 'base64', media_type: mime, data: base64 } },
            { type: 'text',     text: buildPrompt(vendorName, fileName, docType) },
          ]
        }
      }
    } else {
      // Plain text / CSV — use text content passed from client
      console.log(`Text mode: length=${textContent?.length ?? 0}`)
      userContent = buildTextPrompt(vendorName, fileName, docType, textContent)
    }

    const headers = {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    }
    // Enable document support beta for non-image binary files
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

Vendor: ${vendorName}
File: ${fileName}
Document type: ${docType}

Read the full document carefully and extract all risk-relevant information.
Return ONLY valid JSON — no markdown fences, no extra text:
{
  "summary": "2-3 sentence summary of the document and its risk significance",
  "keyFindings": ["specific finding 1", "specific finding 2", "specific finding 3"],
  "scoreImpact": {
    "security": 0,
    "compliance": 0,
    "financial": 0,
    "operational": 0,
    "reputational": 0
  }
}

For scoreImpact: positive numbers (+5 to +20) improve the score (e.g. SOC 2 cert → security +15), negative (-5 to -20) reveal concerns, 0 if no impact.`
}

function buildTextPrompt(vendorName, fileName, docType, textContent) {
  return `${buildPrompt(vendorName, fileName, docType)}\n\nDocument content:\n${textContent?.slice(0, 8000) || '(no content)'}`
}
