import { useState, useEffect } from 'react'
import { useTheme } from '../context'
import { Btn, Inp, Sel, Spinner } from './ui'
import { TIERS } from '../data'
import { fetchCategories } from '../db'

export function AddVendorModal({ onClose, onAdd }) {
  const t = useTheme()
  const [form, setForm] = useState({
    name: '', website: '', category: '', tier: 'High',
    contact: '', contactEmail: '', jiraTicket: ''
  })
  const [errors,     setErrors]     = useState({})
  const [categories, setCategories] = useState([])
  const [fetchingLogo, setFetchingLogo] = useState(false)
  const [logoPreview,  setLogoPreview]  = useState(null)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetchCategories()
      .then(cats => { setCategories(cats); setForm(p => ({ ...p, category: cats[0] || '' })) })
      .catch(() => setCategories(['Cloud Infrastructure', 'Cybersecurity', 'Other']))
  }, [])

  // Auto-fetch logo when website is entered and loses focus
  async function handleWebsiteBlur() {
    const url = form.website.trim()
    if (!url || url.length < 6) return
    setFetchingLogo(true)
    try {
      const res = await fetch('/api/get-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: url }),
      })
      const data = await res.json()
      if (data.logoUrl) setLogoPreview(data.logoUrl)
    } catch {}
    setFetchingLogo(false)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.website.trim()) e.website = 'Required'
    else if (!/^https?:\/\/.+/.test(form.website)) e.website = 'Must start with https://'
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    // Fetch logo if not already fetched
    let logoUrl = logoPreview
    if (!logoUrl && form.website) {
      try {
        const res = await fetch('/api/get-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website: form.website }),
        })
        const data = await res.json()
        logoUrl = data.logoUrl
      } catch {}
    }

    onAdd({
      ...form,
      logoUrl,
      id: Date.now(), status: 'Onboarding', riskScore: 50,
      raScores: { security: 50, compliance: 50, financial: 50, operational: 50, reputational: 50 },
      alerts: [], ddCompleted: [], research: null, documents: [],
      monData: [50, 50, 50, 50, 50, 50],
    })
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(0,0,0,.35)', border: `1px solid ${t.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: t.text }}>Add New Vendor</div>
          <button onClick={onClose} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: t.text2, fontSize: 13 }}>✕</button>
        </div>

        {/* Logo preview */}
        {(logoPreview || fetchingLogo) && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: t.surface2, borderRadius: 8, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            {fetchingLogo
              ? <><Spinner size={18} /><span style={{ fontSize: 12, color: t.text2 }}>Fetching company logo...</span></>
              : <>
                  <img src={logoPreview} alt="Logo" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, background: '#fff', padding: 2 }}
                    onError={() => setLogoPreview(null)} />
                  <span style={{ fontSize: 12, color: t.successText, fontWeight: 600 }}>✓ Logo found</span>
                  <button onClick={() => setLogoPreview(null)} style={{ marginLeft: 'auto', fontSize: 11, color: t.text3, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                </>
            }
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Company Name *</label>
            <Inp value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Acme Corp" />
            {errors.name && <div style={{ fontSize: 11, color: t.dangerText, marginTop: 2 }}>{errors.name}</div>}
          </div>

          {/* Website — triggers logo fetch on blur */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Website *</label>
            <Inp value={form.website} onChange={e => set('website', e.target.value)} onBlur={handleWebsiteBlur} placeholder="https://example.com" />
            {errors.website && <div style={{ fontSize: 11, color: t.dangerText, marginTop: 2 }}>{errors.website}</div>}
          </div>

          {/* Contact + Country */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Contact Person</label>
              <Inp value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="John Smith" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Contact Email</label>
              <Inp value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="vendor@example.com" type="email" />
            </div>
          </div>

          {/* Category + Tier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Category</label>
              <Sel value={form.category} onChange={e => set('category', e.target.value)} options={categories.length ? categories : ['Loading...']} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Risk Tier</label>
              <Sel value={form.tier} onChange={e => set('tier', e.target.value)} options={TIERS} />
            </div>
          </div>

          {/* Jira Ticket */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>
              Jira Ticket <span style={{ fontWeight: 400, color: t.text3 }}>(optional)</span>
            </label>
            <Inp value={form.jiraTicket} onChange={e => set('jiraTicket', e.target.value)} placeholder="e.g. TPRM-123" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="accent" onClick={submit}>Add Vendor →</Btn>
        </div>
      </div>
    </div>
  )
}
