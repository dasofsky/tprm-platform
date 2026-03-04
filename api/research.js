export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Make sure the API key is configured
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured in Vercel environment variables.' })
  }

  const { vendorName, vendorWebsite } = req.body
  if (!vendorName) {
    return res.status(400).json({ error: 'vendorName is required' })
  }

  const prompt = `You are a third-party risk analyst. Research the security posture of "${vendorName}" (${vendorWebsite || 'website unknown'}).

Search for and analyze:
- Security certifications (ISO 27001, SOC 2, PCI DSS, etc.)
- Known data breaches or security incidents
- Regulatory compliance status
- Bug bounty programs
- Recent security news

Return ONLY a valid JSON object with NO additional text, markdown, or explanation:
{
  "summary": "2-3 sentence overview of their security posture",
  "certifications": ["list", "of", "certifications"],
  "incidents": [{"date": "YYYY", "description": "...", "severity": "low|medium|high|critical"}],
  "strengths": ["up to 4 key strengths"],
  "weaknesses": ["up to 4 key concerns"],
  "compliance": ["list of compliance frameworks"],
  "bugBounty": true,
  "newsHighlights": [{"title": "...", "date": "...", "sentiment": "positive|negative|neutral", "url": "https://... or null"}],
  "recommendedScores": {
    "security": 50,
    "compliance": 50,
    "financial": 50,
    "operational": 50,
    "reputational": 50
  },
  "overallRiskScore": 50,
  "riskLevel": "Low|Medium|High",
  "lastUpdated": "${new Date().toISOString()}"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Anthropic API error:', data)
      return res.status(500).json({ error: data.error?.message || 'Anthropic API error' })
    }

    // Extract the text response from content blocks
    const text = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Parse JSON from the response
    try {
      const match = text.match(/\{[\s\S]*\}/)
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(text)
      return res.status(200).json(parsed)
    } catch {
      // If JSON parsing fails, return the raw text so we can debug
      return res.status(200).json({ raw: text, summary: text, overallRiskScore: 50, riskLevel: 'Medium' })
    }

  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
