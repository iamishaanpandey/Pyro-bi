import React, { useState } from 'react'
import AnalysisSidebar from './AnalysisSidebar'
import ReportPanel, { useReportStore } from './ReportPanel'

/**
 * RightSidebar — tabbed panel containing AI Analysis Ideas + Report
 * Replaces the separate floating Report button and standalone AnalysisSidebar
 */
export default function RightSidebar({ onQuerySelect }) {
  const [activeTab, setActiveTab] = useState('ideas') // 'ideas' | 'report'
  const { items } = useReportStore()

  const tabStyle = (id) => ({
    flex: 1, padding: '11px 0',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700, fontSize: 10,
    letterSpacing: '0.07em', textTransform: 'uppercase',
    background: activeTab === id ? (id === 'ideas' ? 'var(--bauhaus-yellow)' : 'var(--bauhaus-red)') : 'transparent',
    color: activeTab === id ? (id === 'ideas' ? 'var(--bauhaus-black)' : '#fff') : 'rgba(245,240,232,0.5)',
    border: 'none', cursor: 'pointer',
    borderBottom: activeTab === id ? 'none' : '1px solid rgba(255,255,255,0.08)',
    transition: 'all 0.2s',
  })

  return (
    <div style={{
      width: 300, flexShrink: 0,
      borderLeft: 'var(--bauhaus-border)',
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', background: 'var(--bauhaus-black)', flexShrink: 0 }}>
        <button style={tabStyle('ideas')} onClick={() => setActiveTab('ideas')}>
          💡 Ideas
        </button>
        <button style={tabStyle('report')} onClick={() => setActiveTab('report')}>
          📋 Report {items.length > 0 && `(${items.length})`}
        </button>
      </div>

      {/* Content — only one panel visible at a time */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* AI Ideas — always mounted, toggled via display */}
        <div style={{ flex: 1, overflowY: 'auto', display: activeTab === 'ideas' ? 'flex' : 'none', flexDirection: 'column' }}>
          <AnalysisSidebar onQuerySelect={onQuerySelect} hideHeader />
        </div>

        {/* Report panel */}
        {activeTab === 'report' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ReportPanel inline />
          </div>
        )}
      </div>
    </div>
  )
}
