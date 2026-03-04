export const config = { maxDuration: 15 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in Vercel environment variables' })
  }

  try {
    // 1. Look up the user by email using the admin API
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    })
    const listData = await listRes.json()
    const user = listData.users?.[0]

    if (!user) return res.status(404).json({ error: `No auth account found for ${email}. The user needs to be invited first.` })

    // 2. Update their password using the admin API
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ password })
    })

    const updateData = await updateRes.json()
    if (!updateRes.ok) throw new Error(updateData.message || 'Failed to update password')

    return res.status(200).json({ success: true, email })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
