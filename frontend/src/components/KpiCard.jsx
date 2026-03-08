import React from 'react'

export default function KpiCard({ data }) {
  if (!data || !data.length) return null

  const row = data[0]
  const entries = Object.entries(row)

  // If single value
  if (entries.length === 1) {
    const [label, value] = entries[0]
    const numVal = typeof value === 'number' ? value : parseFloat(value)
    const formatted = isNaN(numVal)
      ? value
      : numVal > 1000000
        ? `${(numVal / 1000000).toFixed(2)}M`
        : numVal > 1000
          ? `${(numVal / 1000).toFixed(1)}K`
          : numVal.toLocaleString()
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
        <div style={{
          border: 'var(--bauhaus-border)',
          boxShadow: 'var(--shadow-hard-lg)',
          background: '#fff',
          padding: '40px 60px',
          textAlign: 'center',
          minWidth: 280,
        }}>
          <div style={{ display: 'flex', height: 6, marginBottom: 24, marginLeft: -60, marginRight: -60, marginTop: -40 }}>
            <div style={{ flex: 1, background: 'var(--bauhaus-red)' }} />
            <div style={{ flex: 1, background: 'var(--bauhaus-blue)' }} />
            <div style={{ flex: 1, background: 'var(--bauhaus-yellow)' }} />
          </div>
          <p style={{ fontSize: 64, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bauhaus-black)', lineHeight: 1, marginBottom: 12 }}>
            {formatted}
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(13,13,13,0.45)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label.replace(/_/g, ' ')}
          </p>
        </div>
      </div>
    )
  }

  // Multiple KPIs in a row
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', padding: '24px 0' }}>
      {entries.map(([label, value], i) => {
        const numVal = typeof value === 'number' ? value : parseFloat(value)
        const formatted = isNaN(numVal)
          ? String(value)
          : numVal > 1000000 ? `${(numVal / 1000000).toFixed(2)}M`
          : numVal > 1000 ? `${(numVal / 1000).toFixed(1)}K`
          : numVal.toLocaleString()
        const colors = ['var(--bauhaus-red)', 'var(--bauhaus-blue)', 'var(--bauhaus-yellow)', '#16A34A']
        return (
          <div key={i} style={{
            border: 'var(--bauhaus-border)',
            boxShadow: '4px 4px 0 var(--bauhaus-black)',
            background: '#fff',
            padding: '24px 32px',
            textAlign: 'center',
            minWidth: 160,
            borderTop: `4px solid ${colors[i % 4]}`,
          }}>
            <p style={{ fontSize: 40, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: colors[i % 4], lineHeight: 1, marginBottom: 8 }}>
              {formatted}
            </p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,13,13,0.5)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label.replace(/_/g, ' ')}
            </p>
          </div>
        )
      })}
    </div>
  )
}
