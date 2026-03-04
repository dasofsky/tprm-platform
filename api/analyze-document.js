export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { vendorName, fileName, docType, content } = req.body

  const prompt = `You are a third-party risk analyst reviewing a vendor document.

Vendor: ${vendorName}
File: ${fileName}
Document type: ${docType}
Content: ${content}

Analyze this document and extract key risk-relevant information.
Return ONLY valid JSON with no extra text:
{
  "summary": "2-3 sentence summary of what this document contains and its significance",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "scoreImpact": {
    "security": 0,
    "compliance": 0,
    "financial": 0,
    "operational": 0,
    "reputational": 0
  }
}

For scoreImpact: use positive numbers (+5 to +20) if the document improves confidence in that dimension (e.g. a SOC 2 cert improves security and compliance), negative numbers (-5 to -20) if it reveals concerns, or 0 if no impact. Keep adjustments conservative.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' })

    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
    try {
      const match = text.match(/\{[\s\S]*\}/)
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(text)
      return res.status(200).json(parsed)
    } catch {
      return res.status(200).json({ summary: text.slice(0, 300), keyFindings: [], scoreImpact: {} })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
