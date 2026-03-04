import { useState } from 'react'
import { useTheme } from '../context'
import { Btn, Inp, Sel } from './ui'
import { CATEGORIES, TIERS } from '../data'

export function AddVendorModal({ onClose, onAdd }) {
  const t = useTheme()
  const [form, setForm] = useState({ name: '', website: '', category: 'Cloud Infrastructure', tier: 'High', contact: '', country: '' })
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.website.trim()) e.website = 'Required'
    else if (!/^https?:\/\/.+/.test(form.website)) e.website = 'Must start with https://'
    return e
  }

  const submit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onAdd({
      ...form,
      id: Date.now(), status: 'Onboarding', riskScore: 50,
      raScores: { security: 50, compliance: 50, financial: 50, operational: 50, reputational: 50 },
      alerts: [], ddCompleted: [], research: null, documents: [],
      monData: [50, 50, 50, 50, 50, 50],
    })
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,.35)', border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: t.text }}>Add New Vendor</div>
          <button onClick={onClose} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: t.text2, fontSize: 13 }}>✕</button>
        </div>

        {[
          { k: 'name',    l: 'Company Name *', ph: 'e.g. Acme Corp' },
          { k: 'website', l: 'Website *',       ph: 'https://example.com' },
          { k: 'contact', l: 'Contact Person',  ph: 'John Smith' },
          { k: 'country', l: 'Country',         ph: 'United States' },
        ].map(f => (
          <div key={f.k} style={{ marginBottom: 11 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>{f.l}</label>
            <Inp value={form[f.k]} onChange={e => set(f.k, e.target.value)} placeholder={f.ph} />
            {errors[f.k] && <div style={{ fontSize: 11, color: t.dangerText, marginTop: 2 }}>{errors[f.k]}</div>}
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Category</label>
            <Sel value={form.category} onChange={e => set('category', e.target.value)} options={CATEGORIES} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 4 }}>Risk Tier</label>
            <Sel value={form.tier} onChange={e => set('tier', e.target.value)} options={TIERS} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="accent" onClick={submit}>Add Vendor →</Btn>
        </div>
      </div>
    </div>
  )
}
