export const config = { maxDuration: 20 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { vendorName, category, currentScores, commentBody } = req.body

  const prompt = `You are a third-party risk analyst reviewing an intelligence note added by a team member about a vendor.

Vendor: ${vendorName}
Category: ${category}
Current risk scores (0–100, higher = lower risk / better posture):
- Security: ${currentScores.security}
- Compliance: ${currentScores.compliance}
- Financial: ${currentScores.financial}
- Operational: ${currentScores.operational}
- Reputational: ${currentScores.reputational}

Intelligence note from team member:
"${commentBody}"

Analyze the note and determine if it contains information that should adjust any of the 5 risk dimensions.
Only adjust scores if the note contains genuinely risk-relevant information (e.g. a breach, a certification, financial trouble, a lawsuit, a key personnel change, a regulatory action).
Do not adjust scores for generic observations or opinions with no factual basis.

Return ONLY valid JSON, no markdown:
{
  "relevant": true or false,
  "summary": "one sentence explaining what risk-relevant information was found, or 'No risk-relevant information found' if not relevant",
  "scoreImpact": {
    "security": 0,
    "compliance": 0,
    "financial": 0,
    "operational": 0,
    "reputational": 0
  }
}

scoreImpact rules:
- Use 0 for dimensions not affected by this note
- Positive numbers (+3 to +15) if the note improves confidence in that dimension
- Negative numbers (-3 to -15) if the note reveals a concern or risk
- Keep adjustments conservative and proportional to the severity of the information`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' })

    const text  = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : { relevant: false, summary: '', scoreImpact: {} }
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
