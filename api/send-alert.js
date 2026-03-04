export const config = { maxDuration: 15 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, vendorName, alertType, alertMessage, riskScore } = req.body
  if (!to || !vendorName) return res.status(400).json({ error: 'Missing required fields' })

  // Use Resend (free email API — 3000 emails/month free tier)
  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })

  const alertColor = alertType === 'critical' ? '#dc2626' : alertType === 'warning' ? '#d97706' : '#0284c7'
  const alertIcon  = alertType === 'critical' ? '🚨' : alertType === 'warning' ? '⚠️' : 'ℹ️'

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
    <body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f1f5f9">
      <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">

        <!-- Header -->
        <div style="background:#0f172a;padding:24px 28px;display:flex;align-items:center;gap:12px">
          <div style="color:#a5f3fc;font-size:22px">◈</div>
          <div>
            <div style="color:#fff;font-size:16px;font-weight:700">Sonic Automotive TPRM Platform</div>
            <div style="color:#94a3b8;font-size:12px;margin-top:2px">Third-Party Risk Alert</div>
          </div>
        </div>

        <!-- Alert banner -->
        <div style="background:${alertColor}18;border-left:4px solid ${alertColor};padding:16px 28px">
          <div style="font-size:15px;font-weight:700;color:${alertColor}">${alertIcon} ${alertType?.toUpperCase()} ALERT</div>
          <div style="font-size:13px;color:#475569;margin-top:4px">${alertMessage}</div>
        </div>

        <!-- Body -->
        <div style="padding:24px 28px">
          <div style="font-size:13px;color:#475569;margin-bottom:20px">
            A ${alertType} risk alert has been triggered for <strong style="color:#0f172a">${vendorName}</strong>.
            Immediate review may be required.
          </div>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px">Alert Details</div>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="font-size:12px;color:#64748b;padding:4px 0;width:40%">Vendor</td><td style="font-size:12px;font-weight:600;color:#0f172a">${vendorName}</td></tr>
              <tr><td style="font-size:12px;color:#64748b;padding:4px 0">Alert Type</td><td style="font-size:12px;font-weight:600;color:${alertColor};text-transform:capitalize">${alertType}</td></tr>
              <tr><td style="font-size:12px;color:#64748b;padding:4px 0">Risk Score</td><td style="font-size:12px;font-weight:600;color:#0f172a">${riskScore || 'N/A'}</td></tr>
              <tr><td style="font-size:12px;color:#64748b;padding:4px 0">Triggered</td><td style="font-size:12px;font-weight:600;color:#0f172a">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>
            </table>
          </div>

          <a href="${process.env.APP_URL || 'https://your-tprm.vercel.app'}" 
             style="display:inline-block;background:#6366f1;color:#fff;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none">
            Review in TPRM Platform →
          </a>
        </div>

        <!-- Footer -->
        <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0">
          <div style="font-size:11px;color:#94a3b8">
            Sonic Automotive · TPRM Platform · This is an automated alert.
            <br/>To manage your alert preferences, visit Settings in the platform.
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from:    'TPRM Platform <alerts@your-domain.com>',
        to:      Array.isArray(to) ? to : [to],
        subject: `${alertIcon} [${alertType?.toUpperCase()}] ${vendorName} — TPRM Alert`,
        html,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Email send failed')
    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
