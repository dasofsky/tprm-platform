export const config = { maxDuration: 10 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { website } = req.body
  if (!website) return res.status(400).json({ error: 'website required' })

  try {
    // Clean up the URL
    const url = website.startsWith('http') ? website : `https://${website}`
    const domain = new URL(url).hostname

    // Try multiple favicon sources in order of quality
    const sources = [
      `https://logo.clearbit.com/${domain}`,           // Best quality — company logos
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,  // Google fallback
    ]

    // Test Clearbit first (best logos)
    try {
      const check = await fetch(`https://logo.clearbit.com/${domain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(4000),
      })
      if (check.ok) {
        return res.status(200).json({ logoUrl: `https://logo.clearbit.com/${domain}` })
      }
    } catch {}

    // Fall back to Google favicon
    return res.status(200).json({
      logoUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    })

  } catch (err) {
    return res.status(200).json({ logoUrl: null })
  }
}
