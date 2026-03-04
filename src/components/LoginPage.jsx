import { useState } from 'react'
import { useTheme } from '../context'
import { supabase } from '../supabase'

export function LoginPage({ onLogin }) {
  const t = useTheme()
  const [mode,     setMode]     = useState('login')   // 'login' | 'signup' | 'reset'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [message,  setMessage]  = useState(null)

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true); setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    onLogin(data.user)
  }

  const handleSignup = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    setMessage('Account created! Check your email to confirm, then log in.')
    setMode('login'); setLoading(false)
  }

  const handleReset = async () => {
    if (!email) { setError('Enter your email address'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError(error.message) }
    else { setMessage('Password reset email sent — check your inbox.') }
    setLoading(false)
  }

  const submit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleReset

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.jpg" alt="Sonic Automotive" style={{ height: 44, objectFit: 'contain', marginBottom: 16 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text, letterSpacing: '-.025em' }}>TPRM Platform</div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 4 }}>Third-Party Risk Management</div>
        </div>

        {/* Card */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 32, boxShadow: `0 8px 32px rgba(0,0,0,${t.dark ? .4 : .08})` }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 20 }}>
            {{ login: 'Sign In', signup: 'Create Account', reset: 'Reset Password' }[mode]}
          </div>

          {message && (
            <div style={{ padding: '10px 14px', background: t.successBg, border: `1px solid ${t.successText}44`, borderRadius: 8, fontSize: 13, color: t.successText, marginBottom: 16 }}>
              ✅ {message}
            </div>
          )}
          {error && (
            <div style={{ padding: '10px 14px', background: t.dangerBg, border: `1px solid ${t.dangerText}44`, borderRadius: 8, fontSize: 13, color: t.dangerText, marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 5 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="you@company.com"
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 13, outline: 'none', color: t.text, background: t.inputBg, boxSizing: 'border-box' }}
            />
          </div>

          {/* Password */}
          {mode !== 'reset' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 5 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 13, outline: 'none', color: t.text, background: t.inputBg, boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Submit */}
          <button onClick={submit} disabled={loading}
            style={{ width: '100%', padding: '11px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, fontFamily: 'inherit' }}>
            {loading ? 'Please wait...' : { login: 'Sign In', signup: 'Create Account', reset: 'Send Reset Email' }[mode]}
          </button>

          {/* Mode switchers */}
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            {mode === 'login' && <>
              <button onClick={() => { setMode('reset'); setError(null); setMessage(null) }} style={{ fontSize: 12, color: t.text3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Forgot your password?
              </button>
              <button onClick={() => { setMode('signup'); setError(null); setMessage(null) }} style={{ fontSize: 12, color: t.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Don't have an account? Sign up
              </button>
            </>}
            {mode !== 'login' && (
              <button onClick={() => { setMode('login'); setError(null); setMessage(null) }} style={{ fontSize: 12, color: t.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: t.text3 }}>
          Sonic Automotive · TPRM Platform · Confidential
        </div>
      </div>
    </div>
  )
}
