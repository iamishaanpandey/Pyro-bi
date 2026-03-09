import React, { useState, useRef } from 'react'
import axios from 'axios'
import useDashboardStore from '../store/dashboardStore'

const EXAMPLE_QUERIES = [
  'Monthly revenue by region',
  'Top 5 product categories by revenue',
  'Customer count by tier and state',
]

export default function QueryInput() {
  const [input, setInput] = useState('')
  const { isLoading, setLoading, setQueryResult, setError, setLastQuery, tableMeta, activeSessionId } = useDashboardStore()
  const inputRef = useRef(null)

  // E.g., dynamic queries based on columns (could be fetched from AI, but for speed we infer)
  const getDynamicSuggestions = () => {
    if (!tableMeta || !tableMeta.columns.length) return []
    const cols = tableMeta.columns.map(c => c.name)
    
    // Humanize snake_case or camelCase to Title Case
    const humanize = (str) => {
      return str
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, l => l.toUpperCase())
    }

    const cleanTableName = (str) => str.replace(/^tbl_[a-f0-9]{8}_[a-f0-9]{4}_[a-f0-9]{4}_[a-f0-9]{4}_[a-f0-9]{12}_/i, '')
    const tName = humanize(cleanTableName(tableMeta.tableName))
    const c0 = humanize(cols[0])
    const c1 = cols[1] ? humanize(cols[1]) : 'Date'
    const cLast = humanize(cols[cols.length-1])

    return [
      `Show me total rows in ${tName}`,
      `Break down ${c0} by ${c1}`,
      `Top 5 ${cLast} in ${tName}`
    ]
  }

  const handleQuery = async (overrideQuery = null) => {
    const q = (overrideQuery || input).trim()
    if (!q || isLoading || !tableMeta) return
    setInput(q)
    setLastQuery(q)  // persist for DetailedAnalysisPanel
    setLoading(true)
    try {
      const res = await axios.post((import.meta.env.VITE_API_BASE_URL || '') + '/query', { query: q, session_id: activeSessionId || 'default' })
      setQueryResult({ ...res.data, _query: q })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect to backend.')
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuery()
    }
  }

  if (!tableMeta) {
    return null // Don't render if tableMeta is not loaded
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>

      {/* ── Main input bar ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        border: 'var(--bauhaus-border)',
        boxShadow: 'var(--shadow-hard-lg)',
        background: '#fff',
        overflow: 'hidden',
      }}>
        {/* Left accent: three color blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, background: 'var(--bauhaus-red)' }} />
          <div style={{ flex: 1, background: 'var(--bauhaus-blue)' }} />
          <div style={{ flex: 1, background: 'var(--bauhaus-yellow)' }} />
        </div>

        {/* Search icon */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="var(--bauhaus-black)" strokeWidth={2.5} opacity={0.4}>
            <circle cx="11" cy="11" r="8"/>
            <path strokeLinecap="round" d="m21 21-4.35-4.35"/>
          </svg>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          id="query-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="query-input"
          style={{ flex: 1, padding: '16px 0', fontSize: 16 }}
          placeholder="Ask anything about your data…"
          disabled={isLoading || !tableMeta}
          autoComplete="off"
        />

        {/* Submit */}
        <button
          id="query-submit-btn"
          onClick={() => handleQuery()}
          disabled={isLoading || !input.trim() || !tableMeta}
          className="btn-primary"
          style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderRight: 'none' }}
        >
          {isLoading ? (
            <>
              <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16"
                viewBox="0 0 24 24" fill="none">
                <circle opacity={0.25} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path opacity={0.75} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Thinking…
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Analyze
            </>
          )}
        </button>
      </div>

      {/* ── Example chips ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif",
          color: 'rgba(13,13,13,0.4)',
        }}>
          Try:
        </span>
        {getDynamicSuggestions().map((q, i) => {
          const colors = ['var(--bauhaus-red)', 'var(--bauhaus-blue)', 'var(--bauhaus-yellow)']
          return (
            <button
              key={i}
              id={`example-query-${i}`}
              onClick={() => { setInput(q); handleQuery(q) }}
              disabled={isLoading || !tableMeta}
              style={{
                fontSize: 12, padding: '5px 12px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600, letterSpacing: '0.02em',
                background: '#fff',
                border: `2px solid var(--bauhaus-black)`,
                boxShadow: '2px 2px 0 var(--bauhaus-black)',
                cursor: 'pointer',
                transition: 'transform 0.1s, box-shadow 0.1s, background 0.1s',
                opacity: isLoading ? 0.4 : 1,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = colors[i]
                e.currentTarget.style.color = i === 2 ? '#0D0D0D' : '#fff'
                e.currentTarget.style.transform = 'translate(-2px,-2px)'
                e.currentTarget.style.boxShadow = '4px 4px 0 var(--bauhaus-black)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.color = 'var(--bauhaus-black)'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '2px 2px 0 var(--bauhaus-black)'
              }}
            >
              {q}
            </button>
          )
        })}
      </div>
    </div>
  )
}
