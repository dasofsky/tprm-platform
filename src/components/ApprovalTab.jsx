import { useState, useEffect } from 'react'
import { useTheme, useAuth } from '../context'
import { Card, Btn } from './ui'
import { supabase } from '../supabase'

const STATUSES   = ['N/A', 'Approved', 'Approved with Conditions', 'Approved with Recommendations', 'Denied']
const MFA_OPTS   = ['N/A', 'Required', 'Suggested']
const WHITELIST  = ['N/A', 'Approved', 'Approved Except']
const VLANS      = ['N/A', 'VLAN 203', 'VLAN 204', 'VLAN 206', 'VLAN 204 with PSK 100', 'VLAN 350']
const DPA_OPTS   = ['N/A', 'Required', 'Suggested']
const SSO_OPTS   = ['N/A', 'Required', 'Suggested']

const FIELD_DEFAULTS = {
  status:           'N/A',
  mfa:              'N/A',
  passwordHygiene:  false,
  whitelist:        'N/A',
  whitelistExcept:  '',
  vlan:             'N/A',
  pilot:            false,
  dpa:              'N/A',
  sso:              'N/A',
  soc2:             false,
  cdk:              false,
  additionalNotes:  '',
  generatedText:    '',
  savedAt:          null,
}

function generateText(fields, vendorName, jiraTicket) {
  const lines = []
  const formatJira = (t) => {
    if (!t) return ''
    const clean = t.replace(/^NPW-/i, '').replace(/^NPW/i, '')
    return `NPW-${clean}`
  }
  const jiraRef = jiraTicket ? ` (${formatJira(jiraTicket)})` : ''

  // ── 1. Status ──────────────────────────────────────────────────────────────
  if (fields.status !== 'N/A') {
    const statusMap = {
      'Approved':
        `The TPRM review for ${vendorName}${jiraRef} is approved to move to the next step of the intake process.`,
      'Approved with Conditions':
        `The TPRM review for ${vendorName}${jiraRef} is approved to move to the next step of the intake process with the following conditions:`,
      'Approved with Recommendations':
        `The TPRM review for ${vendorName}${jiraRef} is approved to move to the next step of the intake process with the following recommendations:`,
      'Denied':
        `The TPRM review for ${vendorName}${jiraRef} has been denied for security reasons. This intake cannot proceed until the concerns outlined below have been addressed.`,
    }
    lines.push(statusMap[fields.status] || '')
    lines.push('')
  }

  // ── 2. MFA ────────────────────────────────────────────────────────────────
  if (fields.mfa === 'Required') {
    lines.push('*Multi-Factor Authentication (MFA)*')
    lines.push('MFA will be required to be in place before this intake can move forward. The vendor must confirm MFA enforcement for all user accounts prior to deployment. Acceptable MFA methods include authenticator apps, hardware tokens, or equivalent controls. Single-factor authentication via password alone will not be accepted.')
    lines.push('')
  } else if (fields.mfa === 'Suggested') {
    lines.push('*Multi-Factor Authentication (MFA)*')
    lines.push('It is strongly recommended that this solution be implemented with MFA in place. While not a hard requirement at this stage, enabling MFA significantly reduces the risk of unauthorized access and aligns with Sonic\'s security best practices. The implementation team should evaluate enabling MFA as part of the rollout plan.')
    lines.push('')
  }

  // ── 2b. DPA ──────────────────────────────────────────────────────────────
  if (fields.dpa === 'Required') {
    lines.push('*Data Processing Agreement (DPA)*')
    lines.push('A Data Processing Agreement (DPA) must be in place before this intake can be approved. The vendor must provide a fully executed DPA that meets Sonic\'s data protection requirements prior to any data being shared or processed.')
    lines.push('')
  } else if (fields.dpa === 'Suggested') {
    lines.push('*Data Processing Agreement (DPA)*')
    lines.push('It is suggested that a Data Processing Agreement (DPA) be in place for this vendor. Given the nature of the data involved, establishing a DPA will help ensure both parties understand their obligations regarding data handling, processing, and protection.')
    lines.push('')
  }

  // ── SSO ─────────────────────────────────────────────────────────────────
  if (fields.sso === 'Required') {
    lines.push('*Single Sign-On (SSO)*')
    lines.push("SSO implementation is required before the vendor\'s solution goes live. Please work with the Cloud team to ensure SSO is configured and tested prior to deployment. Access without SSO will not be permitted.")
    lines.push('')
  } else if (fields.sso === 'Suggested') {
    lines.push('*Single Sign-On (SSO)*')
    lines.push("SSO implementation is strongly suggested before the vendor\'s solution goes live. Please work with the Cloud team to evaluate SSO integration as part of the deployment plan. Enabling SSO improves access control and simplifies user lifecycle management.")
    lines.push('')
  }

  // ── SOC2 ─────────────────────────────────────────────────────────────────
  if (fields.soc2) {
    lines.push('*SOC 2 Report Requirement*')
    lines.push('The vendor must present a current SOC 2 Type II report before this intake can move forward. The report must be dated within the last 12 months. Please submit the report to the TPRM team for review prior to proceeding to the next stage of the intake process.')
    lines.push('')
  }

  // ── CDK 3PA ──────────────────────────────────────────────────────────────
  if (fields.cdk) {
    lines.push('*CDK 3PA Certification Requirement*')
    lines.push('This vendor must be CDK 3PA (Third-Party Access) certified before integration or access to CDK systems is permitted. Please confirm the vendor\'s current 3PA certification status with the CDK administration team and provide documentation of active certification to the TPRM team prior to deployment.')
    lines.push('')
  }

  // ── 3. Password Hygiene ───────────────────────────────────────────────────
  if (fields.passwordHygiene) {
    lines.push('*Password & Account Hygiene*')
    lines.push('The following password and account requirements must be observed for this deployment:')
    lines.push('• Use complex passphrases that comply with Sonic\'s passphrase policy. Passphrases should be a minimum of 16 characters, combining words, numbers, and symbols where supported.')
    lines.push('• Reuse of current or previously used passwords is strictly prohibited. All credentials should be unique to this system.')
    lines.push('• All users must have individual accounts. Shared or group accounts are not permitted under any circumstances.')
    lines.push('• Service accounts should follow the principle of least privilege and be reviewed periodically for continued necessity.')
    lines.push('')
  }

  // ── 4. Whitelist ──────────────────────────────────────────────────────────
  if (fields.whitelist === 'Approved') {
    lines.push('*URL & Link Whitelist*')
    lines.push('All links and URLs associated with this intake have been reviewed and approved. No additional firewall or proxy exceptions are required beyond those already in place.')
    lines.push('')
  } else if (fields.whitelist === 'Approved Except') {
    lines.push('*URL & Link Whitelist*')
    lines.push('All links and URLs associated with this intake have been reviewed and approved with the following exceptions. The URLs listed below have been identified as outside the scope of approval and must not be permitted through the network:')
    if (fields.whitelistExcept.trim()) {
      fields.whitelistExcept.trim().split('\n').filter(Boolean).forEach(url => {
        lines.push(`• ${url.trim()}`)
      })
    } else {
      lines.push('• [No exceptions listed — please add rejected URLs above]')
    }
    lines.push('')
  }

  // ── 5. VLAN ───────────────────────────────────────────────────────────────
  if (fields.vlan !== 'N/A') {
    lines.push('*Network Configuration*')
    lines.push(`The device or solution should be configured on ${fields.vlan}. Please coordinate with the Network team to ensure the correct VLAN assignment is applied prior to deployment.`)
    if (fields.vlan === 'VLAN 203') {
      lines.push('Please be aware that all content displayed on devices connected to VLAN 203 must meet the guidelines set forth in Sonic\'s AV Content Policy, as issued by the Legal department to all General Managers. Ensure that content is reviewed and approved before going live.')
    }
    lines.push('')
  }

  // ── 6. Pilot ─────────────────────────────────────────────────────────────
  if (fields.pilot) {
    lines.push('*Pilot Deployment*')
    lines.push(`This intake is approved to move forward as a pilot deployment only. The pilot should be limited in scope and closely monitored by the implementation team. If a broader or full-scale deployment is being considered following the pilot, a new TPRM intake must be resubmitted for review and approval prior to any expanded rollout.`)
    lines.push('')
  }

  // ── 7. Additional Notes ───────────────────────────────────────────────────
  if (fields.additionalNotes.trim()) {
    lines.push('*Additional Notes*')
    lines.push(fields.additionalNotes.trim())
    lines.push('')
  }

  return lines.join('\n').trim()
}

// ── Selector component ──────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  const t = useTheme()
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{label}</label>
        {hint && <span style={{ fontSize: 11, color: t.text3 }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }) {
  const t = useTheme()
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 13, color: t.text, background: t.inputBg, fontFamily: 'inherit', width: '100%', outline: 'none', cursor: 'pointer' }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function CheckRow({ label, desc, checked, onChange }) {
  const t = useTheme()
  return (
    <div onClick={() => onChange(!checked)}
      style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 8, background: checked ? t.accentBg : t.surface2, border: `1px solid ${checked ? t.accent + '55' : t.border}`, cursor: 'pointer', transition: 'all .15s' }}>
      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? t.accent : t.border}`, background: checked ? t.accent : 'transparent', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: t.text2, marginTop: 2 }}>{desc}</div>}
      </div>
    </div>
  )
}

export function ApprovalTab({ vendor, onUpdate }) {
  const t = useTheme()
  const { currentUser, canWrite } = useAuth()

  const saved = vendor.approval || {}
  const [fields,   setFields]   = useState({ ...FIELD_DEFAULTS, ...saved })
  const [saving,   setSaving]   = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSection, setAiSection] = useState('notes') // which field to AI-suggest

  const set = (k, v) => setFields(p => ({ ...p, [k]: v }))

  // Auto-generate text whenever fields change
  useEffect(() => {
    const text = generateText(fields, vendor.name, vendor.jiraTicket)
    setFields(p => ({ ...p, generatedText: text }))
  }, [fields.status, fields.mfa, fields.dpa, fields.sso, fields.soc2, fields.cdk, fields.passwordHygiene, fields.whitelist, fields.whitelistExcept, fields.vlan, fields.pilot, fields.additionalNotes])

  const handleSave = async () => {
    setSaving(true)
    try {
      const approvalData = { ...fields, savedAt: new Date().toISOString(), savedBy: currentUser?.name }
      const updates = { approval: approvalData, status: 'Completed' }
      await supabase.from('vendors').update(updates).eq('id', vendor.id)
      onUpdate({ ...vendor, approval: approvalData, status: 'Completed' })
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(fields.generatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAISuggest = async () => {
    setAiLoading(true)
    try {
      const prompt = `You are a security analyst writing additional notes for a vendor risk assessment approval.

Vendor: ${vendor.name}
Current status: ${fields.status}
Risk score: ${vendor.riskScore}
Category: ${vendor.category}
MFA: ${fields.mfa}
VLAN: ${fields.vlan}

Based on the vendor's profile and risk posture, suggest 2-3 concise, specific additional notes that a security team would include in a Jira ticket approval post. Be practical and specific. Write in plain text, no headers, use bullet points starting with •.`

      const res  = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages:   [{ role: 'user', content: prompt }],
        }),
      })
      // This goes through the API directly from browser — won't work without CORS
      // Use the /api/suggest-notes serverless function instead
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      set('additionalNotes', fields.additionalNotes ? fields.additionalNotes + '\n' + text : text)
    } catch {}
    setAiLoading(false)
  }

  const handleAISuggestViaAPI = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/suggest-notes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName:  vendor.name,
          riskScore:   vendor.riskScore,
          category:    vendor.category,
          status:      fields.status,
          mfa:         fields.mfa,
          vlan:        fields.vlan,
          researchSummary: vendor.research?.summary || '',
        }),
      })
      const data = await res.json()
      if (data.suggestion) {
        set('additionalNotes', fields.additionalNotes
          ? fields.additionalNotes + '\n' + data.suggestion
          : data.suggestion)
      }
    } catch (err) {
      console.error('AI suggest failed', err)
    }
    setAiLoading(false)
  }

  const statusColor = {
    'Approved':                     t.successText,
    'Approved with Conditions':     t.warnText,
    'Approved with Recommendations':t.warnText,
    'Denied':                       t.dangerText,
    'N/A':                          t.text3,
  }[fields.status] || t.text3

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 20, alignItems: 'start' }}>

      {/* ── LEFT: Form ── */}
      <div>
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 2 }}>Approval Decision</div>
          <div style={{ fontSize: 12, color: t.text2, marginBottom: 20 }}>
            Configure the approval decision. The Jira post text is generated automatically on the right.
          </div>

          {/* 1. Status */}
          <Field label="1. Decision Status">
            <Select value={fields.status} onChange={v => set('status', v)} options={STATUSES} />
            {fields.status !== 'N/A' && (
              <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6, background: statusColor + '18', border: `1px solid ${statusColor}44`, fontSize: 11, color: statusColor, fontWeight: 600 }}>
                {fields.status === 'Approved' && '✅ Cleared to proceed'}
                {fields.status === 'Approved with Conditions' && '⚠️ Proceed — conditions must be met'}
                {fields.status === 'Approved with Recommendations' && '💡 Proceed — recommendations noted'}
                {fields.status === 'Denied' && '🚫 Cannot proceed'}
              </div>
            )}
          </Field>

          <div style={{ height: 1, background: t.border, margin: '16px 0' }} />

          {/* 2. MFA */}
          <Field label="2. Multi-Factor Authentication" hint="(MFA)">
            <Select value={fields.mfa} onChange={v => set('mfa', v)} options={MFA_OPTS} />
          </Field>

          {/* 2b. DPA */}
          <Field label="3. Data Processing Agreement" hint="(DPA)">
            <Select value={fields.dpa} onChange={v => set('dpa', v)} options={DPA_OPTS} />
          </Field>

          {/* SSO */}
          <Field label="4. Single Sign-On" hint="(SSO)">
            <Select value={fields.sso} onChange={v => set('sso', v)} options={SSO_OPTS} />
          </Field>

          {/* SOC2 */}
          <Field label="5. SOC 2 Report">
            <CheckRow
              label="SOC 2 Report Required"
              desc="Vendor must provide a current SOC 2 Type II report before intake can proceed"
              checked={fields.soc2}
              onChange={v => set('soc2', v)}
            />
          </Field>

          {/* 3. Password Hygiene */}
          <Field label="6. Password Hygiene">
            <CheckRow
              label="Include Password Hygiene Requirements"
              desc="Adds passphrase policy, no reuse, and individual account requirements"
              checked={fields.passwordHygiene}
              onChange={v => set('passwordHygiene', v)}
            />
          </Field>

          <div style={{ height: 1, background: t.border, margin: '16px 0' }} />

          {/* 4. Whitelist */}
          <Field label="7. URL / Link Whitelist Approval">
            <Select value={fields.whitelist} onChange={v => set('whitelist', v)} options={WHITELIST} />
            {fields.whitelist === 'Approved Except' && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: t.text2, marginBottom: 4 }}>Enter rejected URLs (one per line):</div>
                <textarea value={fields.whitelistExcept} onChange={e => set('whitelistExcept', e.target.value)}
                  placeholder="https://example.com/tracking&#10;https://example.com/ads"
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text, background: t.inputBg, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
          </Field>

          {/* 5. VLAN */}
          <Field label="8. Network / VLAN Assignment">
            <Select value={fields.vlan} onChange={v => set('vlan', v)} options={VLANS} />
            {fields.vlan === 'VLAN 203' && (
              <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 6, background: t.warnBg, border: `1px solid ${t.warnText}44`, fontSize: 11, color: t.warnText }}>
                ⚠️ AV content guidelines apply — reminder will be included in the post
              </div>
            )}
          </Field>

          <div style={{ height: 1, background: t.border, margin: '16px 0' }} />

          {/* 7. Pilot */}
          <Field label="9. Pilot Deployment">
            <CheckRow
              label="This is a Pilot Deployment"
              desc="Marks as pilot only — full deployment requires resubmission"
              checked={fields.pilot}
              onChange={v => set('pilot', v)}
            />
          </Field>

          {/* CDK */}
          <Field label="10. CDK 3PA Certification">
            <CheckRow
              label="CDK 3PA Certification Required"
              desc="Vendor must be CDK Third-Party Access certified before CDK system integration is permitted"
              checked={fields.cdk}
              onChange={v => set('cdk', v)}
            />
          </Field>

          {/* 6. Additional Notes */}
          <Field label="11. Additional Notes" hint="(optional)">
            <textarea
              value={fields.additionalNotes}
              onChange={e => set('additionalNotes', e.target.value)}
              placeholder="Add any additional context, requirements, or follow-up items..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.text, background: t.inputBg, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={handleAISuggestViaAPI} disabled={aiLoading || fields.status === 'N/A'}
              style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: t.accentText, background: t.accentBg, border: `1px solid ${t.accent}44`, borderRadius: 6, padding: '4px 12px', cursor: aiLoading || fields.status === 'N/A' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: fields.status === 'N/A' ? .5 : 1 }}>
              {aiLoading ? '⏳ Generating...' : '✨ AI Suggest Notes'}
            </button>
          </Field>

          {/* Save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="accent" onClick={handleSave} disabled={saving || !canWrite}>
              {saving ? 'Saving...' : '💾 Save Approval'}
            </Btn>
          </div>
          {fields.savedAt && (
            <div style={{ fontSize: 11, color: t.text3, textAlign: 'right', marginTop: 6 }}>
              Last saved {new Date(fields.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {fields.savedBy ? ` by ${fields.savedBy}` : ''}
            </div>
          )}
        </Card>
      </div>

      {/* ── RIGHT: Generated Text ── */}
      <div>
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>Generated Jira Post</div>
              <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>Edit freely before copying to Jira{vendor.jiraTicket ? ` (NPW-${vendor.jiraTicket.replace(/^NPW-?/i,'')})` : ''}</div>
            </div>
            <button onClick={handleCopy} disabled={!fields.generatedText}
              style={{ fontSize: 12, fontWeight: 700, color: copied ? t.successText : t.accentText, background: copied ? t.successBg : t.accentBg, border: `1px solid ${copied ? t.successText : t.accent}44`, borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
              {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
            </button>
          </div>

          {fields.generatedText
            ? <textarea
                value={fields.generatedText}
                onChange={e => set('generatedText', e.target.value)}
                style={{ width: '100%', minHeight: 480, padding: '14px 16px', border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 13, color: t.text, background: t.surface2, fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", monospace', lineHeight: 1.75, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            : <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text3, fontSize: 13, background: t.surface2, borderRadius: 10, border: `1px dashed ${t.border}` }}>
                Select a Decision Status to generate the Jira post text
              </div>
          }

          {fields.generatedText && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => set('generatedText', generateText(fields, vendor.name, vendor.jiraTicket))}
                style={{ fontSize: 11, color: t.text3, background: 'none', border: `1px solid ${t.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                ↺ Reset to auto-generated
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
