export const config = { maxDuration: 60, bodyParser: { sizeLimit: '10mb' } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { vendorName, fileName, docType, isPDF, base64Data, textContent } = req.body

  const prompt = `You are a third-party risk analyst reviewing a vendor document.

Vendor: ${vendorName}
File: ${fileName}
Document type: ${docType}

Carefully read the full document content above and extract all risk-relevant information.
Return ONLY valid JSON with no extra text, markdown, or explanation:
{
  "summary": "2-3 sentence summary of what this document contains and its risk significance",
  "keyFindings": ["specific finding 1", "specific finding 2", "specific finding 3"],
  "scoreImpact": {
    "security": 0,
    "compliance": 0,
    "financial": 0,
    "operational": 0,
    "reputational": 0
  }
}

For scoreImpact: positive numbers (+5 to +20) if the document improves confidence (e.g. SOC 2 cert → security +15, compliance +15), negative numbers (-5 to -20) if it reveals concerns, 0 if no impact. Be specific and conservative.`

  try {
    // Build the message content — PDF gets sent as a document block, text as plain text
    let userContent

    if (isPDF && base64Data) {
      userContent = [
        {
          type: 'document',
          source: {
            type:       'base64',
            media_type: 'application/pdf',
            data:       base64Data,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ]
    } else {
      userContent = `${prompt}\n\nDocument content:\n${textContent || '(no content provided)'}`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':  'pdfs-2024-09-25',  // enables native PDF reading
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages:   [{ role: 'user', content: userContent }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Anthropic API error:', JSON.stringify(data))
      return res.status(500).json({ error: data.error?.message || 'API error' })
    }

    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('')

    try {
      const match = text.match(/\{[\s\S]*\}/)
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(text)
      return res.status(200).json(parsed)
    } catch {
      return res.status(200).json({
        summary:      text.slice(0, 400),
        keyFindings:  [],
        scoreImpact:  {},
      })
    }
  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: err.message })
  }
}
