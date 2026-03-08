import React, { useState } from 'react'

export default function InsightPanel({ insight, sql }) {
  const [sqlOpen, setSqlOpen] = useState(false)

  if (!insight && !sql) return null

  return (
    <div className="animate-slide-up" style={{ marginTop: 16 }}>
      {/* Bauhaus insight card — left red accent bar */}
      <div style={{
        display: 'flex',
        border: 'var(--bauhaus-border)',
        boxShadow: 'var(--shadow-hard-lg)',
        background: '#fff',
        overflow: 'hidden',
      }}>
        {/* Accent bar */}
        <div style={{ width: 8, background: 'var(--bauhaus-blue)', flexShrink: 0 }} />

        {/* Content */}
        <div style={{ flex: 1, padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {/* Geometric icon: blue circle with lightning bolt */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--bauhaus-blue)',
              border: 'var(--bauhaus-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: 13,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--bauhaus-blue)',
            }}>
              AI Insight
            </span>
            {/* Yellow tag — NO model name */}
            <div style={{
              marginLeft: 'auto',
              padding: '2px 8px',
              background: 'var(--bauhaus-yellow)',
              border: '2px solid var(--bauhaus-black)',
              fontSize: 10, fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Analysis
            </div>
          </div>

          {/* Insight text */}
          {insight && (
            <p style={{
              fontSize: 14, lineHeight: 1.7,
              color: 'rgba(13,13,13,0.8)',
            }}>
              {insight}
            </p>
          )}

          {/* SQL accordion */}
          {sql && (
            <div style={{ marginTop: 14 }}>
              <button
                id="toggle-sql-btn"
                onClick={() => setSqlOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: "'Space Grotesk', sans-serif",
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: 'rgba(13,13,13,0.45)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--bauhaus-black)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,13,13,0.45)'}
              >
                <svg
                  style={{ transition: 'transform 0.2s', transform: sqlOpen ? 'rotate(90deg)' : 'rotate(0)' }}
                  width="10" height="10" viewBox="0 0 20 20" fill="currentColor"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                </svg>
                {sqlOpen ? 'Hide SQL' : 'View generated SQL'}
              </button>
              {sqlOpen && (
                <pre style={{
                  marginTop: 10,
                  padding: '12px 16px',
                  background: 'var(--bauhaus-black)',
                  border: 'var(--bauhaus-border)',
                  fontSize: 12, color: 'var(--bauhaus-yellow)',
                  fontFamily: "'Courier New', monospace",
                  overflowX: 'auto', lineHeight: 1.6,
                  boxShadow: 'var(--shadow-hard)',
                }}>
                  {sql}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
