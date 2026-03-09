import React from 'react'

const HEIGHTS = [65, 85, 50, 95, 70, 80, 55, 90]
const COLORS  = ['var(--bauhaus-red)', 'var(--bauhaus-blue)', 'var(--bauhaus-yellow)',
                  'var(--bauhaus-red)', 'var(--bauhaus-blue)', 'var(--bauhaus-yellow)',
                  'var(--bauhaus-red)', 'var(--bauhaus-blue)']

export default function LoadingSkeleton() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Chart skeleton */}
      <div style={{
        background: '#fff',
        border: 'var(--bauhaus-border)',
        boxShadow: 'var(--shadow-hard-lg)',
        padding: '24px 20px 16px',
        overflow: 'hidden',
      }}>
        {/* Tri-color top strip */}
        <div style={{ display: 'flex', height: 4, margin: '-24px -20px 20px' }}>
          {['var(--bauhaus-red)', 'var(--bauhaus-blue)', 'var(--bauhaus-yellow)'].map((c, i) => (
            <div key={i} style={{ flex: 1, background: c, opacity: 0.35 }} />
          ))}
        </div>
        {/* Title skeleton */}
        <div className="skeleton" style={{ height: 16, width: 180, marginBottom: 24, borderRadius: 0 }} />
        {/* Bar skeletons */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200 }}>
          {HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                background: COLORS[i],
                opacity: 0.18,
                animationDelay: `${i * 80}ms`,
                border: '2px solid transparent',
              }}
              className="skeleton"
            />
          ))}
        </div>
        <div className="skeleton" style={{ height: 10, width: '100%', marginTop: 12, borderRadius: 0 }} />
      </div>

      {/* Insight skeleton */}
      <div style={{
        background: '#fff',
        border: 'var(--bauhaus-border)',
        boxShadow: 'var(--shadow-hard-lg)',
        display: 'flex', overflow: 'hidden',
      }}>
        <div style={{ width: 8, background: 'var(--bauhaus-blue)', opacity: 0.3 }} />
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 0 }} />
            <div className="skeleton" style={{ height: 12, width: 80, borderRadius: 0 }} />
          </div>
          {[100, 80, 60].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 10, width: `${w}%`, borderRadius: 0 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
