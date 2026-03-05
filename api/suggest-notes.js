export const config = { maxDuration: 20 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { vendorName, riskScore, category, status, mfa, vlan, researchSummary } = req.body

  const prompt = `You are a security analyst writing additional notes for a vendor TPRM approval post in Jira.

Vendor: ${vendorName}
Category: ${category}
Risk Score: ${riskScore}/100
Decision Status: ${status}
MFA: ${mfa}
VLAN: ${vlan}
${researchSummary ? `Research Summary: ${researchSummary}` : ''}

Write 2-4 concise, practical additional notes that a security team would include in this specific Jira ticket approval post. Focus on actionable items relevant to the vendor type, risk level, and decisions already made. Do not repeat information already covered by MFA or VLAN fields.

Format as bullet points starting with •. Be specific to this vendor where possible. Plain text only, no markdown headers.`

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

    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    return res.status(200).json({ suggestion: text })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
