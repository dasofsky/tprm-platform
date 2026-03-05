export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { vendorName, category, raScores, research } = req.body

  const researchContext = research
    ? `Known information: ${research.summary || ''}. Certifications: ${(research.certifications || []).join(', ') || 'none found'}. Concerns: ${(research.concerns || []).join(', ') || 'none noted'}.`
    : 'No AI research has been run on this vendor yet.'

  const prompt = `You are a third-party risk analyst explaining risk scores for a vendor assessment.

Vendor: ${vendorName}
Category: ${category}
${researchContext}

Current scores (0–100, higher = lower risk / better posture):
- Security: ${raScores.security}
- Compliance: ${raScores.compliance}
- Financial: ${raScores.financial}
- Operational: ${raScores.operational}
- Reputational: ${raScores.reputational}

For each of the 5 dimensions write 1–3 sentences explaining why the vendor received that specific score. Be specific to this vendor and category. Reference any known certifications, concerns, or industry norms. If no research data is available, explain what typically drives scores for this type of vendor and what would raise or lower it.

Return ONLY valid JSON, no markdown:
{
  "security": "explanation...",
  "compliance": "explanation...",
  "financial": "explanation...",
  "operational": "explanation...",
  "reputational": "explanation..."
}`

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
        max_tokens: 800,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' })

    const text  = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
    const match = text.match(/\{[\s\S]*\}/)
    const reasons = match ? JSON.parse(match[0]) : {}
    return res.status(200).json({ reasons })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
