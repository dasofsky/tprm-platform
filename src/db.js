import { supabase } from './supabase'

// ─── VENDORS ──────────────────────────────────────────────────────────────────

export async function fetchVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('name')
  if (error) throw error
  // Map snake_case DB columns → camelCase used in the app
  return data.map(mapVendorFromDB)
}

export async function createVendor(vendor) {
  const { data, error } = await supabase
    .from('vendors')
    .insert([mapVendorToDB(vendor)])
    .select()
    .single()
  if (error) throw error
  return mapVendorFromDB(data)
}

export async function updateVendor(id, updates) {
  const { data, error } = await supabase
    .from('vendors')
    .update(mapVendorToDB(updates))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapVendorFromDB(data)
}

export async function deleteVendor(id) {
  const { error } = await supabase.from('vendors').delete().eq('id', id)
  if (error) throw error
}

// Map DB row (snake_case) → app object (camelCase)
function mapVendorFromDB(row) {
  return {
    id:          row.id,
    name:        row.name,
    website:     row.website,
    category:    row.category,
    tier:        row.tier,
    status:      row.status,
    riskScore:   row.risk_score,
    contact:     row.contact,
    country:     row.country,
    raScores:    row.ra_scores,
    alerts:      row.alerts      || [],
    ddCompleted: row.dd_completed || [],
    research:    row.research,
    documents:   row.documents   || [],
    monData:     row.mon_data    || [],
    jiraTicket:  row.jira_ticket,
    logoUrl:     row.logo_url,
  }
}

// Map app object (camelCase) → DB row (snake_case)
function mapVendorToDB(v) {
  const out = {}
  if (v.name        !== undefined) out.name         = v.name
  if (v.website     !== undefined) out.website      = v.website
  if (v.category    !== undefined) out.category     = v.category
  if (v.tier        !== undefined) out.tier         = v.tier
  if (v.status      !== undefined) out.status       = v.status
  if (v.riskScore   !== undefined) out.risk_score   = v.riskScore
  if (v.contact     !== undefined) out.contact      = v.contact
  if (v.country     !== undefined) out.country      = v.country
  if (v.raScores    !== undefined) out.ra_scores    = v.raScores
  if (v.alerts      !== undefined) out.alerts       = v.alerts
  if (v.ddCompleted !== undefined) out.dd_completed = v.ddCompleted
  if (v.research    !== undefined) out.research     = v.research
  if (v.documents   !== undefined) out.documents    = v.documents
  if (v.monData     !== undefined) out.mon_data     = v.monData
  if (v.jiraTicket  !== undefined) out.jira_ticket  = v.jiraTicket
  if (v.logoUrl     !== undefined) out.logo_url     = v.logoUrl
  out.updated_at = new Date().toISOString()
  return out
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function fetchUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')
  if (error) throw error
  return data.map(mapUserFromDB)
}

export async function createUser(user) {
  const { data, error } = await supabase
    .from('users')
    .insert([mapUserToDB(user)])
    .select()
    .single()
  if (error) throw error
  return mapUserFromDB(data)
}

export async function updateUser(id, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(mapUserToDB(updates))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapUserFromDB(data)
}

export async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

function mapUserFromDB(row) {
  return {
    id:         row.id,
    name:       row.name,
    email:      row.email,
    role:       row.role,
    access:     row.access,
    status:     row.status,
    initials:   row.initials,
    lastLogin:  row.last_login,
    department: row.department,
    avatarIdx:  row.avatar_idx,
  }
}

function mapUserToDB(u) {
  const out = {}
  if (u.name       !== undefined) out.name       = u.name
  if (u.email      !== undefined) out.email      = u.email
  if (u.role       !== undefined) out.role       = u.role
  if (u.access     !== undefined) out.access     = u.access
  if (u.status     !== undefined) out.status     = u.status
  if (u.initials   !== undefined) out.initials   = u.initials
  if (u.lastLogin  !== undefined) out.last_login = u.lastLogin
  if (u.department !== undefined) out.department = u.department
  if (u.avatarIdx  !== undefined) out.avatar_idx = u.avatarIdx
  return out
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export async function fetchDocuments(vendorId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function uploadDocument(vendorId, file, meta) {
  const filePath = `${vendorId}/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('vendor-documents')
    .upload(filePath, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('documents')
    .insert([{ vendor_id: vendorId, name: file.name, file_path: filePath, file_size: file.size, file_type: file.type, ...meta }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDocument(doc) {
  await supabase.storage.from('vendor-documents').remove([doc.file_path])
  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw error
}

export async function getDocumentURL(filePath) {
  const { data } = await supabase.storage
    .from('vendor-documents')
    .createSignedUrl(filePath, 3600)
  return data?.signedUrl
}

// ─── COMMENTS ─────────────────────────────────────────────────────────────────

export async function fetchComments(vendorId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createComment(comment) {
  const { data, error } = await supabase
    .from('comments')
    .insert([comment])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(id) {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data.map(c => c.name)
}

export async function saveCategories(names) {
  // Full replace: delete all then reinsert
  await supabase.from('categories').delete().neq('id', 0)
  const rows = names.map((name, i) => ({ name, sort_order: i }))
  const { error } = await supabase.from('categories').insert(rows)
  if (error) throw error
}
