import React, { useState } from 'react'
import axios from 'axios'

/**
 * NormalizationPanel
 * Shown after CSV upload in the DataTab.
 * - Auto-merged items (score >= 93) applied silently and shown as chips
 * - Review items (80-92) shown with Approve / Skip buttons
 */
export default function NormalizationPanel({ suggestions, onApplied }) {
  const { auto = [], review = [] } = suggestions

  // Local state: track which review items user has approved/skipped
  const [decisions, setDecisions] = useState(() =>
    Object.fromEntries(review.map((_, i) => [i, null]))  // null | 'approve' | 'skip'
  )
  const [applying, setApplying] = useState(false)
  const [done, setDone]         = useState(false)
  const [result, setResult]     = useState(null)

  const decide = (i, val) =>
    setDecisions(prev => ({ ...prev, [i]: val }))

  const handleApply = async () => {
    setApplying(true)
    try {
      // Combine auto mappings + approved review mappings
      const approved = review.filter((_, i) => decisions[i] === 'approve')
      const mappings  = [...auto, ...approved].map(({ column, from, to }) => ({ column, from, to }))

      const res = await axios.post('/apply-normalization', { mappings })
      setResult(res.data)
      setDone(true)
      onApplied?.()
    } catch (e) {
      setResult({ error: e.message })
    } finally {
      setApplying(false)
    }
  }

  if (auto.length === 0 && review.length === 0) return null

  return (
    <div style={{
      margin: '20px 0',
      border: 'var(--bauhaus-border)',
      boxShadow: '4px 4px 0 var(--bauhaus-black)',
      background: '#fff',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bauhaus-black)',
        padding: '12px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
            fontSize: 12, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: 'var(--bauhaus-yellow)',
          }}>
            Entity Normalization
          </span>
          <span style={{
            padding: '2px 8px', background: 'var(--bauhaus-red)',
            color: '#fff', fontSize: 10, fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {auto.length + review.length} found
          </span>
        </div>

        {done ? (
          <span style={{ color: '#4ade80', fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 700 }}>
            ✓ Applied
          </span>
        ) : (
          <button
            onClick={handleApply}
            disabled={applying}
            style={{
              padding: '6px 14px',
              background: 'var(--bauhaus-yellow)', color: 'var(--bauhaus-black)',
              border: '2px solid var(--bauhaus-yellow)',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10,
              letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {applying ? 'Applying...' : 'Apply & Clean Data'}
          </button>
        )}
      </div>

      <div style={{ padding: '14px 18px' }}>
        {/* Auto-merge tier */}
        {auto.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: '#16A34A', marginBottom: 8,
            }}>
              ✓ Auto-merge ({auto.length}) — high confidence typos / spacing
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {auto.map((s, i) => (
                <div key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px',
                  background: 'rgba(22,163,74,0.08)',
                  border: '1px solid rgba(22,163,74,0.3)',
                  fontSize: 11, fontFamily: 'Inter, sans-serif',
                }}>
                  <span style={{ color: '#666', textDecoration: 'line-through' }}>{s.from}</span>
                  <span style={{ color: '#999' }}>→</span>
                  <span style={{ color: '#16A34A', fontWeight: 600 }}>{s.to}</span>
                  <span style={{ fontSize: 9, color: '#16A34A', opacity: 0.7 }}>({s.score}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review tier */}
        {review.length > 0 && (
          <div>
            <p style={{
              fontSize: 10, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: 'var(--bauhaus-red)', marginBottom: 8,
            }}>
              ⚠ Review needed ({review.length}) — possible same entity, please confirm
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {review.map((s, i) => {
                const dec = decisions[i]
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px',
                    background: dec === 'approve' ? 'rgba(22,163,74,0.06)'
                                : dec === 'skip'   ? 'rgba(13,13,13,0.03)'
                                : '#fff',
                    border: `1px solid ${dec === 'approve' ? 'rgba(22,163,74,0.3)' : dec === 'skip' ? 'rgba(13,13,13,0.08)' : 'rgba(13,13,13,0.12)'}`,
                    opacity: dec === 'skip' ? 0.45 : 1,
                    transition: 'all 0.15s',
                  }}>
                    {/* Column badge */}
                    <span style={{
                      padding: '2px 6px', background: 'var(--bauhaus-blue)',
                      color: '#fff', fontSize: 9, fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700, whiteSpace: 'nowrap',
                    }}>
                      {s.column}
                    </span>

                    {/* Mapping */}
                    <span style={{ fontSize: 12, color: '#666', fontFamily: 'Inter, sans-serif', flex: 1 }}>
                      <span style={{ textDecoration: dec === 'approve' ? 'line-through' : 'none', color: '#888' }}>{s.from}</span>
                      <span style={{ margin: '0 6px', color: '#ccc' }}>→</span>
                      <strong style={{ color: 'var(--bauhaus-black)' }}>{s.to}</strong>
                    </span>

                    {/* Score */}
                    <span style={{ fontSize: 10, color: '#aaa', whiteSpace: 'nowrap' }}>{s.score}% match</span>

                    {/* Buttons */}
                    {dec === null ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => decide(i, 'approve')}
                          style={{
                            padding: '3px 10px', fontSize: 10,
                            background: '#16A34A', color: '#fff', border: 'none',
                            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >Merge</button>
                        <button
                          onClick={() => decide(i, 'skip')}
                          style={{
                            padding: '3px 10px', fontSize: 10,
                            background: 'transparent', color: '#999',
                            border: '1px solid #ddd',
                            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >Keep Separate</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => decide(i, null)}
                        style={{ fontSize: 10, background: 'none', border: 'none',
                          color: '#aaa', cursor: 'pointer' }}
                      >Undo</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Result message */}
        {result && (
          <div style={{ marginTop: 12, fontSize: 11, color: result.error ? 'var(--bauhaus-red)' : '#16A34A', fontFamily: 'Inter, sans-serif' }}>
            {result.error
              ? `Error: ${result.error}`
              : `✓ ${result.applied} mapping(s) applied. Data is now clean — re-run your queries.`}
          </div>
        )}
      </div>
    </div>
  )
}
