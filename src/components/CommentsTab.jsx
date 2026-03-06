import { useState, useEffect } from 'react'
import { useTheme, useAuth } from '../context'
import { Card, Btn, Avatar } from './ui'
import { fetchComments, createComment, deleteComment } from '../db'

const SECTIONS = [
  { v: 'general',      l: 'General' },
  { v: 'assessment',   l: 'Risk Assessment' },
  { v: 'dd',           l: 'Due Diligence' },
  { v: 'intelligence', l: 'Intelligence ✨' },
  { v: 'alerts',       l: 'Alerts' },
]

const fmtRelative = d => {
  const diff = Date.now() - new Date(d).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)   return 'Just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 7)   return `${days}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function CommentsTab({ vendor, onScoreUpdate }) {
  const t = useTheme()
  const { currentUser, canWrite } = useAuth()
  const [comments,   setComments]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [body,       setBody]       = useState('')
  const [section,    setSection]    = useState('general')
  const [submitting, setSubmitting]  = useState(false)
  const [filter,     setFilter]     = useState('all')
  const [scoreNotice, setScoreNotice] = useState(null)  // { summary, impacts } | null
  const [analyzing,   setAnalyzing]   = useState(false)

  useEffect(() => { loadComments() }, [vendor.id])

  async function loadComments() {
    try {
      setLoading(true)
      const data = await fetchComments(vendor.id)
      setComments(data)
    } catch (err) {
      console.error('Failed to load comments', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!body.trim()) return
    setSubmitting(true)
    try {
      const comment = await createComment({
        vendor_id:   vendor.id,
        author_name: currentUser?.name || 'Unknown',
        author_role: currentUser?.role || 'viewer',
        body:        body.trim(),
        section,
      })
      setComments(p => [comment, ...p])
      setBody('')

      // If tagged as intelligence, analyze for risk score impacts
      if (section === 'intelligence' && onScoreUpdate) {
        setAnalyzing(true)
        try {
          const res = await fetch('/api/analyze-comment', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vendorName:    vendor.name,
              category:      vendor.category,
              currentScores: vendor.raScores,
              commentBody:   comment.body,
            }),
          })
          const analysis = await res.json()

          if (analysis.relevant && analysis.scoreImpact) {
            const newScores = { ...vendor.raScores }
            let changed = false
            Object.entries(analysis.scoreImpact).forEach(([k, v]) => {
              const delta = Number(v) || 0
              if (delta !== 0 && newScores[k] !== undefined) {
                newScores[k] = Math.min(100, Math.max(0, newScores[k] + delta))
                changed = true
              }
            })
            if (changed) {
              const avg = Math.round(Object.values(newScores).reduce((a, b) => a + b, 0) / 5)
              onScoreUpdate({ ...vendor, raScores: newScores, riskScore: avg })
              setScoreNotice({ summary: analysis.summary, impacts: analysis.scoreImpact })
              setTimeout(() => setScoreNotice(null), 8000)
            } else {
              setScoreNotice({ summary: analysis.summary, impacts: null })
              setTimeout(() => setScoreNotice(null), 5000)
            }
          }
        } catch (err) {
          console.error('Comment analysis failed', err)
        } finally {
          setAnalyzing(false)
        }
      }
    } catch (err) {
      console.error('Failed to post comment', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment(id)
      setComments(p => p.filter(c => c.id !== id))
    } catch (err) {
      console.error('Failed to delete comment', err)
    }
  }

  const filtered = filter === 'all' ? comments : comments.filter(c => c.section === filter)

  const sectionColor = s => ({
    general:      t.text3,
    assessment:   '#6366f1',
    dd:           '#16a34a',
    intelligence: '#0284c7',
    alerts:       '#dc2626',
  }[s] || t.text3)

  const sectionLabel = s => SECTIONS.find(x => x.v === s)?.l || s

  return (
    <div>
      {/* Compose box */}
      {canWrite && (
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>Add a Note</div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
            placeholder="Add a note, observation or action item... (Ctrl+Enter to post)"
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 13, outline: 'none', color: t.text, background: t.inputBg, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: t.text3 }}>Section:</span>
              {SECTIONS.map(s => (
                <button key={s.v} onClick={() => setSection(s.v)}
                  style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${section === s.v ? sectionColor(s.v) : t.border}`, background: section === s.v ? sectionColor(s.v) + '18' : 'transparent', color: section === s.v ? sectionColor(s.v) : t.text3 }}>
                  {s.l}
                </button>
              ))}
            </div>
            <Btn variant="accent" onClick={handleSubmit} disabled={submitting || !body.trim()}>
              {submitting ? 'Posting...' : 'Post Note'}
            </Btn>
          </div>
        </Card>
      )}

      {/* Filter bar */}
      {comments.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.text3 }}>Filter:</span>
          {[{ v: 'all', l: `All (${comments.length})` }, ...SECTIONS].map(s => {
            const count = s.v === 'all' ? comments.length : comments.filter(c => c.section === s.v).length
            if (s.v !== 'all' && count === 0) return null
            return (
              <button key={s.v} onClick={() => setFilter(s.v)}
                style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${filter === s.v ? t.accent : t.border}`, background: filter === s.v ? t.accentBg : 'transparent', color: filter === s.v ? t.accentText : t.text3 }}>
                {s.l}{s.v !== 'all' ? ` (${count})` : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* Comment list */}
      {loading
        ? <div style={{ textAlign: 'center', padding: 40, color: t.text3 }}>Loading...</div>
        : filtered.length === 0
        ? <Card style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>No notes yet</div>
            <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>
              {canWrite ? 'Add the first note about this vendor.' : 'No notes have been added yet.'}
            </div>
          </Card>
        : filtered.map(c => {
            const isMe = c.author_name === currentUser?.name
            const fakeUser = { name: c.author_name, initials: c.author_name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2), avatarIdx: c.author_name.length % 5 }
            return (
              <Card key={c.id} style={{ padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Avatar user={fakeUser} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{c.author_name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: t.text3, textTransform: 'capitalize', background: t.surface2, padding: '1px 6px', borderRadius: 4, border: `1px solid ${t.border}` }}>{c.author_role}</span>
                        <span style={{ fontSize: 11, color: sectionColor(c.section), fontWeight: 600, background: sectionColor(c.section) + '18', padding: '1px 8px', borderRadius: 999 }}>{sectionLabel(c.section)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: t.text3 }}>{fmtRelative(c.created_at)}</span>
                        {(isMe || currentUser?.role === 'admin') && (
                          <button onClick={() => handleDelete(c.id)}
                            style={{ fontSize: 11, color: t.dangerText, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit' }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: t.text, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{c.body}</p>
                  </div>
                </div>
              </Card>
            )
          })
      }
    </div>
  )
}
