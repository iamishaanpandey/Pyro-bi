import React, { useState, useEffect } from 'react'
import axios from 'axios'

const sectionConfig = [
  { key: 'key_findings', label: 'Key Findings', color: 'var(--bauhaus-blue)', icon: '★' },
  { key: 'trends', label: 'Trends & Patterns', color: '#16A34A', icon: '↗' },
  { key: 'anomalies', label: 'Anomalies & Outliers', color: 'var(--bauhaus-red)', icon: '!' },
  { key: 'recommendations', label: 'Recommendations', color: 'var(--bauhaus-yellow)', icon: '→', textColor: 'var(--bauhaus-black)' },
]

export default function DetailedAnalysisPanel({ data, userQuery, sql, visible }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (visible && data && data.length && userQuery) {
      fetchAnalysis()
    }
  }, [visible, userQuery])

  const fetchAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post('/detailed-analysis', {
        data: data?.slice(0, 50) || [],
        user_query: userQuery,
        sql: sql || '',
      })
      setAnalysis(res.data)
    } catch (e) {
      setError('Failed to generate detailed analysis.')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  if (loading) {
    return (
      <div style={{ marginTop: 16, border: 'var(--bauhaus-border)', background: '#fff', boxShadow: 'var(--shadow-hard)', padding: 40, textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, margin: '0 auto 16px',
          border: '3px solid var(--bauhaus-blue)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(13,13,13,0.4)' }}>
          Generating Deep Analysis...
        </p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div style={{ marginTop: 16, padding: 20, border: 'var(--bauhaus-border)', background: '#fff', color: 'var(--bauhaus-red)' }}>
        {error}
      </div>
    )
  }

  if (!analysis) return null

  return (
    <div style={{ marginTop: 16, animation: 'slideUp 0.3s ease forwards' }}>
      {/* Executive Summary */}
      {analysis.executive_summary && (
        <div style={{
          border: 'var(--bauhaus-border)',
          boxShadow: 'var(--shadow-hard)',
          background: 'var(--bauhaus-black)',
          padding: '20px 24px',
          marginBottom: 12,
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: 'var(--bauhaus-yellow)',
            fontFamily: "'Space Grotesk', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            Executive Summary
          </p>
          <p style={{ color: 'rgba(245,240,232,0.9)', fontSize: 14, lineHeight: 1.7 }}>
            {analysis.executive_summary}
          </p>
        </div>
      )}

      {/* Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {sectionConfig.map(({ key, label, color, icon, textColor }) => {
          const items = analysis[key]
          if (!items || !items.length) return null
          return (
            <div key={key} style={{ border: 'var(--bauhaus-border)', boxShadow: '3px 3px 0 var(--bauhaus-black)', background: '#fff', overflow: 'hidden' }}>
              <div style={{ background: color, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: textColor || '#fff', fontWeight: 700, fontSize: 14 }}>{icon}</span>
                <span style={{
                  color: textColor || '#fff', fontSize: 10, fontWeight: 700,
                  fontFamily: "'Space Grotesk', sans-serif",
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {label}
                </span>
              </div>
              <ul style={{ padding: '12px 16px', listStyle: 'none', margin: 0 }}>
                {items.map((item, i) => (
                  <li key={i} style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    fontSize: 13, color: 'rgba(13,13,13,0.8)', lineHeight: 1.5,
                    padding: '6px 0',
                    borderBottom: i < items.length - 1 ? '1px solid rgba(13,13,13,0.06)' : 'none',
                  }}>
                    <span style={{ color, flexShrink: 0, fontWeight: 700 }}>›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Data Quality Note */}
      {analysis.data_quality_notes && (
        <div style={{ marginTop: 12, padding: '10px 16px', background: 'rgba(13,13,13,0.04)', border: '1px dashed rgba(13,13,13,0.2)', fontSize: 12, color: 'rgba(13,13,13,0.55)' }}>
          <span style={{ fontWeight: 700 }}>Data Note: </span>{analysis.data_quality_notes}
        </div>
      )}
    </div>
  )
}
