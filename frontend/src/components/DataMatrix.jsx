import React, { useState, forwardRef } from 'react'

/**
 * DataMatrix — renders tabular data as a styled matrix/pivot table
 * Uses forwardRef so html2canvas can screenshot it for PDF export
 */
const DataMatrix = forwardRef(function DataMatrix({ data }, ref) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [filter, setFilter] = useState('')

  if (!data || data.length === 0) return null

  const columns = Object.keys(data[0])
  const isNumeric = (val) => val !== null && val !== '' && !isNaN(parseFloat(val))

  // Sort logic
  const sorted = [...data].sort((a, b) => {
    if (!sortCol) return 0
    const av = a[sortCol], bv = b[sortCol]
    const num = isNumeric(av) && isNumeric(bv)
    const cmp = num ? parseFloat(av) - parseFloat(bv) : String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  // Filter logic (searches across all string columns)
  const filtered = filter
    ? sorted.filter(row => columns.some(c => String(row[c] ?? '').toLowerCase().includes(filter.toLowerCase())))
    : sorted

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // Color scale for numeric columns
  const colMax = {}
  columns.forEach(c => {
    const vals = data.map(r => parseFloat(r[c])).filter(v => !isNaN(v))
    if (vals.length === data.length) colMax[c] = Math.max(...vals)
  })

  const HEADER_COLORS = ['var(--bauhaus-red)', 'var(--bauhaus-blue)', '#16A34A', '#7C3AED', '#0891B2', 'var(--bauhaus-yellow)']

  return (
    <div ref={ref} style={{ margin: '8px 0' }}>
      {/* Filter bar */}
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'var(--bauhaus-border)', padding: '6px 12px', background: '#fff', flex: 1, maxWidth: 280 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(13,13,13,0.4)" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter rows..."
            style={{ border: 'none', outline: 'none', fontSize: 12, fontFamily: 'Inter, sans-serif', width: '100%', background: 'transparent' }}
          />
        </div>
        <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.4)', fontFamily: "'Space Grotesk', sans-serif" }}>
          {filtered.length} / {data.length} rows
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: 'var(--bauhaus-border)', boxShadow: '4px 4px 0 var(--bauhaus-black)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 36, background: 'var(--bauhaus-black)', padding: '10px 8px', color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                #
              </th>
              {columns.map((col, i) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700, fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: '#fff',
                    background: HEADER_COLORS[i % HEADER_COLORS.length],
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {col.replace(/_/g, ' ')}
                    {sortCol === col && (
                      <span style={{ fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                    {sortCol !== col && <span style={{ fontSize: 10, opacity: 0.3 }}>⇅</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, ri) => (
              <tr
                key={ri}
                style={{ background: ri % 2 === 0 ? '#fff' : 'rgba(13,13,13,0.025)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(27,79,204,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? '#fff' : 'rgba(13,13,13,0.025)'}
              >
                <td style={{ padding: '8px 8px', textAlign: 'center', color: 'rgba(13,13,13,0.3)', fontSize: 10, borderRight: '1px solid rgba(13,13,13,0.06)', borderBottom: '1px solid rgba(13,13,13,0.06)' }}>
                  {ri + 1}
                </td>
                {columns.map((col) => {
                  const val = row[col]
                  const numVal = parseFloat(val)
                  const pct = colMax[col] && !isNaN(numVal) ? (numVal / colMax[col]) * 100 : 0
                  const isNum = colMax[col] && !isNaN(numVal)

                  return (
                    <td
                      key={col}
                      style={{
                        padding: '8px 14px',
                        borderRight: '1px solid rgba(13,13,13,0.06)',
                        borderBottom: '1px solid rgba(13,13,13,0.06)',
                        position: 'relative',
                        whiteSpace: 'nowrap',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {isNum && (
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${pct}%`, background: 'rgba(27,79,204,0.08)',
                          pointerEvents: 'none',
                        }} />
                      )}
                      <span style={{ position: 'relative', color: 'rgba(13,13,13,0.8)', fontWeight: isNum ? 600 : 400 }}>
                        {isNum ? numVal.toLocaleString() : String(val ?? '—')}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})

export default DataMatrix
