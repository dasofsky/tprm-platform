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

  const adminHeaders = {
    'Content-Type':  'application/json',
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  }

  try {
    // 1. Look up whether the user already has an auth account
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}&per_page=1`,
      { headers: adminHeaders }
    )
    const listData = await listRes.json()
    const existingUser = listData.users?.[0]

    if (existingUser) {
      // 2a. User exists — update their password
      const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existingUser.id}`, {
        method:  'PUT',
        headers: adminHeaders,
        body:    JSON.stringify({ password }),
      })
      const updateData = await updateRes.json()
      if (!updateRes.ok) throw new Error(updateData.message || updateData.msg || 'Failed to update password')
      return res.status(200).json({ success: true, email, action: 'updated' })

    } else {
      // 2b. No auth account yet — create one with email_confirm bypassed
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method:  'POST',
        headers: adminHeaders,
        body:    JSON.stringify({
          email,
          password,
          email_confirm: true,   // skip email confirmation
          user_metadata: {},
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.message || createData.msg || 'Failed to create auth account')
      return res.status(200).json({ success: true, email, action: 'created' })
    }

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
