export const config = { maxDuration: 15 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars' })
  }

  const adminHeaders = {
    'Content-Type':  'application/json',
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  }

  try {
    // ── Strategy: try to create first (idempotent approach)
    // If the user already exists, creation returns a 422 with "already exists" — 
    // then we fall through to update by fetching their ID.

    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method:  'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
      }),
    })
    const createData = await createRes.json()

    // Created successfully
    if (createRes.ok) {
      return res.status(200).json({ success: true, email, action: 'created' })
    }

    // User already exists — find them and update password instead
    const errMsg = (createData.msg || createData.message || createData.error_description || '').toLowerCase()
    const alreadyExists = createRes.status === 422 || errMsg.includes('already') || errMsg.includes('exists')

    if (!alreadyExists) {
      // A real error during creation
      throw new Error(createData.msg || createData.message || `Create failed with status ${createRes.status}`)
    }

    // Fetch all users (paginated) to find by email
    let found = null
    let page  = 1
    while (!found) {
      const listRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`,
        { headers: adminHeaders }
      )
      const listData = await listRes.json()
      const users    = listData.users || []
      if (users.length === 0) break
      found = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (found || users.length < 1000) break
      page++
    }

    if (!found) {
      return res.status(404).json({ error: `Could not locate auth account for ${email}` })
    }

    // Update the password
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${found.id}`, {
      method:  'PUT',
      headers: adminHeaders,
      body:    JSON.stringify({ password }),
    })
    const updateData = await updateRes.json()
    if (!updateRes.ok) throw new Error(updateData.msg || updateData.message || `Update failed with status ${updateRes.status}`)

    return res.status(200).json({ success: true, email, action: 'updated' })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
