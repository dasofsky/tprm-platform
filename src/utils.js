import { AVATAR_GRADS } from './data'

export const riskColor  = s => s >= 75 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626'
export const riskLabel  = s => s >= 75 ? 'Low' : s >= 50 ? 'Medium' : 'High'
export const tierDot    = t => ({ Critical: '#f43f5e', High: '#fb923c', Medium: '#fbbf24', Low: '#94a3b8' }[t] || '#94a3b8')
export const alertStyle = tp => tp === 'critical'
  ? { bar: '#ef4444', bg: '#fef2f2', text: '#b91c1c', icon: '⛔' }
  : tp === 'warning'
  ? { bar: '#f59e0b', bg: '#fffbeb', text: '#b45309', icon: '⚠️' }
  : { bar: '#38bdf8', bg: '#f0f9ff', text: '#0369a1', icon: 'ℹ️' }
export const roleStyle  = r => r === 'admin'
  ? { bg: '#fdf4ff', c: '#9333ea', b: '#e9d5ff' }
  : r === 'analyst'
  ? { bg: '#eef2ff', c: '#4338ca', b: '#c7d2fe' }
  : { bg: '#f8fafc', c: '#475569', b: '#e2e8f0' }
export const fmtDate    = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'
export const avatarGrad = u => AVATAR_GRADS[(u.avatarIdx || 0) % AVATAR_GRADS.length]
export const avg        = obj => Math.round(Object.values(obj).reduce((a, b) => a + b, 0) / Object.values(obj).length)
