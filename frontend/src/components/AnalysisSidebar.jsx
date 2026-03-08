import React, { useState, useEffect } from 'react'
import axios from 'axios'

const ICONS = {
  bar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <rect x="3" y="3" width="4" height="18" /><rect x="9.5" y="9" width="4" height="12" /><rect x="16" y="6" width="4" height="15" />
    </svg>
  ),
  trend: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  list: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
}

const CATEGORY_COLORS = ['var(--bauhaus-red)', 'var(--bauhaus-blue)', 'var(--bauhaus-yellow)', '#16A34A']

export default function AnalysisSidebar({ onQuerySelect, hideHeader = false }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [openCategory, setOpenCategory] = useState(0)

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/analysis-suggestions')
      setSuggestions(res.data.suggestions || [])
      if (res.data.suggestions?.length) setOpenCategory(0)
    } catch (e) {
      console.error('Failed to load suggestions', e)
    } finally {
      setLoading(false)
    }
  }

  // When embedded in RightSidebar (hideHeader=true), skip the aside wrapper
  const Wrapper = hideHeader
    ? ({ children }) => <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    : ({ children }) => (
        <aside style={{
          width: 280, flexShrink: 0,
          borderLeft: 'var(--bauhaus-border)',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 56px)',
          overflowY: 'auto',
        }}>{children}</aside>
      )
  return (
    <Wrapper>
      {/* Header — only when not embedded */}
      {!hideHeader && (
        <div style={{
          padding: '16px 20px',
          borderBottom: 'var(--bauhaus-border)',
          background: 'var(--bauhaus-black)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              color: 'var(--bauhaus-yellow)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              AI Analysis Ideas
            </span>
            <button
              onClick={fetchSuggestions}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 2 }}
              title="Refresh suggestions"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
            Based on your dataset schema
          </p>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, padding: '8px 0' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div style={{
              width: 32, height: 32, margin: '0 auto 12px',
              border: '3px solid var(--bauhaus-yellow)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', fontFamily: "'Space Grotesk', sans-serif" }}>
              GENERATING IDEAS...
            </p>
          </div>
        ) : suggestions.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'rgba(13,13,13,0.3)' }}>
            No ideas yet. Upload a CSV to generate.
          </p>
        ) : (
          suggestions.map((group, gi) => (
            <div key={gi} style={{ borderBottom: '2px solid rgba(13,13,13,0.06)' }}>
              {/* Category header */}
              <button
                onClick={() => setOpenCategory(openCategory === gi ? -1 : gi)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '12px 16px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                <div style={{
                  width: 24, height: 24, flexShrink: 0,
                  background: CATEGORY_COLORS[gi % 4],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: gi === 2 ? 'var(--bauhaus-black)' : '#fff',
                  border: '2px solid var(--bauhaus-black)',
                }}>
                  {ICONS[group.icon] || ICONS.bar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 11, fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: 'var(--bauhaus-black)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    lineHeight: 1.3,
                  }}>
                    {group.category}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(13,13,13,0.45)', marginTop: 2 }}>
                    {group.description}
                  </p>
                </div>
                <svg
                  style={{ transition: 'transform 0.2s', transform: openCategory === gi ? 'rotate(90deg)' : 'none', flexShrink: 0, marginTop: 4 }}
                  width="10" height="10" viewBox="0 0 20 20" fill="currentColor"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                </svg>
              </button>

              {/* Queries */}
              {openCategory === gi && (
                <div style={{ paddingBottom: 8 }}>
                  {(group.queries || []).map((q, qi) => (
                    <button
                      key={qi}
                      onClick={() => onQuerySelect(q)}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '8px 16px 8px 50px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: 12, color: 'rgba(13,13,13,0.75)',
                        lineHeight: 1.5,
                        borderLeft: `2px solid ${CATEGORY_COLORS[gi % 4]}`,
                        marginLeft: 0,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(13,13,13,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      ↗ {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Wrapper>
  )
}
