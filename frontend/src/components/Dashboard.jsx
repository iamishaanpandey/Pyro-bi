import React, { useState, useRef } from 'react'
import useDashboardStore from '../store/dashboardStore'
import DynamicChart from './DynamicChart'
import KpiCard from './KpiCard'
import DataMatrix from './DataMatrix'
import InsightPanel from './InsightPanel'
import DetailedAnalysisPanel from './DetailedAnalysisPanel'
import LoadingSkeleton from './LoadingSkeleton'
import { SaveToReportButton } from './ReportPanel'

const CHART_TYPE_COLORS = {
  bar:     'var(--bauhaus-red)',
  line:    'var(--bauhaus-blue)',
  pie:     'var(--bauhaus-yellow)',
  scatter: 'var(--bauhaus-red)',
  kpi:     'var(--bauhaus-blue)',
  echarts: 'var(--bauhaus-black)',
}

const PALETTES = {
  bauhaus:    ['#D62828', '#1B4FCC', '#F7B731', '#16A34A', '#7C3AED', '#0891B2', '#EA580C'],
  monochrome: ['#1A1A1A', '#333',     '#4D4D4D', '#666',    '#808080', '#999',    '#B3B3B3'],
  pastel:     ['#FFB5E8', '#B28DFF',  '#6EB5FF', '#AFF8DB', '#FFF5BA', '#FFABAB', '#85E3FF'],
  corporate:  ['#003580', '#0066CC',  '#0099FF', '#33B5FF', '#99D6FF', '#CCE8FF', '#E6F4FF'],
}

// Helper: detect if the result should be shown as a KPI (single row, all numbers <= 4 cols)
const isKpiResult = (data) => {
  if (!data || data.length === 0) return false
  if (data.length === 1) {
    const cols = Object.keys(data[0])
    if (cols.length <= 4) {
      return Object.values(data[0]).every(v => v === null || typeof v === 'number' || !isNaN(parseFloat(v)))
    }
  }
  return false
}

// Helper: detect if result should be a matrix (many rows OR many columns)
const isMatrixResult = (data) => {
  if (!data || data.length === 0) return false
  const cols = Object.keys(data[0])
  // Matrix: >5 columns, or > 50 rows, or has mix of text+number columns (pivot-like)
  if (cols.length > 5) return true
  if (data.length > 50) return true
  const hasText = cols.some(c => typeof data[0][c] === 'string' && isNaN(parseFloat(data[0][c])))
  const hasNums = cols.some(c => !isNaN(parseFloat(data[0][c])))
  // If a mix of text + numbers and reasonable size, prefer matrix
  if (hasText && hasNums && cols.length >= 3 && data.length >= 5) return true
  return false
}

export default function Dashboard() {
  const {
    chartData, echartsConfig, chartType, insightSummary, detailedAnalysis, sqlExecuted,
    isLoading, error, activeSessionId, setSessions, fetchSessions, lastQuery
  } = useDashboardStore()

  const chartRef  = useRef(null) // ref to DynamicChart for screenshot capture
  const matrixRef  = useRef(null) // ref to DataMatrix DOM for html2canvas capture
  const [saving, setSaving] = useState(false)
  const [sessionTitle, setSessionTitle] = useState('')
  const [selectedPalette, setSelectedPalette] = useState('bauhaus')
  const [activeInfoTab, setActiveInfoTab] = useState('insight')
  const [matrixViewMode, setMatrixViewMode] = useState('matrix') // 'matrix' | 'bar' | 'line'

  const handleSaveSession = async () => {
    const titleToSave = sessionTitle.trim() || echartsConfig?.title?.text || `Session ${new Date().toLocaleTimeString()}`
    try {
      const payload = {
        title: titleToSave,
        query: echartsConfig?.title?.text || 'Saved Query',
        state: {
          data: chartData,
          echarts_config: echartsConfig,
          chart_type: chartType,
          insight_summary: insightSummary,
          sql_executed: sqlExecuted,
        }
      }
      const res = await axios.post((import.meta.env.VITE_API_BASE_URL || '') + '/sessions', payload)
      if (res.status === 200 || res.status === 201) {
        await fetchSessions()
        setSaving(false)
        setSessionTitle('')
      } else {
        alert('Failed to save session.')
      }
    } catch {
      alert('Failed to save.')
    }
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: 960, margin: '32px auto 0' }}>
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 960, margin: '32px auto 0' }} className="animate-fade-in">
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 16,
          border: 'var(--bauhaus-border)', boxShadow: 'var(--shadow-hard-lg)',
          background: '#fff', overflow: 'hidden',
        }}>
          <div style={{ width: 8, background: 'var(--bauhaus-red)', alignSelf: 'stretch', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '20px 20px 20px 12px' }}>
            <div style={{ width: 36, height: 36, flexShrink: 0, background: 'var(--bauhaus-red)', border: 'var(--bauhaus-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--bauhaus-red)', marginBottom: 6 }}>
                Query Error
              </p>
              <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.7)', lineHeight: 1.6 }}>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!chartData) {
    return (
      <div style={{ maxWidth: 960, margin: '48px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px' }}>
        <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 24 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 56, height: 56, borderRadius: '50%', border: '3px solid rgba(13,13,13,0.12)', background: 'transparent' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 44, height: 44, border: '3px solid rgba(13,13,13,0.12)', background: 'transparent' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(13,13,13,0.06)', border: '2px solid rgba(13,13,13,0.1)' }} />
        </div>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(13,13,13,0.3)' }}>
          Ask a question to visualize your data
        </p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div style={{ maxWidth: 960, margin: '48px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px' }} className="animate-fade-in">
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bauhaus-yellow)', border: '4px solid var(--bauhaus-black)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bauhaus-black)" strokeWidth={2.5}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--bauhaus-black)', marginBottom: 8 }}>
          No Results Found
        </p>
        <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.6)', fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>
          Your query executed successfully, but we couldn't find any data matching those conditions in the dataset.
        </p>
      </div>
    )
  }

  const typeColor = CHART_TYPE_COLORS[chartType] || 'var(--bauhaus-black)'
  const showKpi    = isKpiResult(chartData)
  const showMatrix = !showKpi && isMatrixResult(chartData)

  // ─── Chart Header Bar ────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 960, margin: '32px auto 0' }} className="animate-slide-up">

      {/* Top control bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--bauhaus-black)', letterSpacing: '-0.01em' }}>
          {echartsConfig?.title?.text || 'Query Results'}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Save to Session */}
          {!activeSessionId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    autoFocus
                    value={sessionTitle}
                    onChange={e => setSessionTitle(e.target.value)}
                    placeholder="Name session..."
                    style={{ padding: '5px 10px', fontSize: 11, border: 'var(--bauhaus-border)', fontFamily: "'Space Grotesk', sans-serif", width: 140 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveSession(); if (e.key === 'Escape') setSaving(false) }}
                  />
                  <button onClick={handleSaveSession} className="btn-primary" style={{ padding: '5px 12px', fontSize: 11 }}>
                    Save
                  </button>
                  <button onClick={() => setSaving(false)} className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11, border: 'none' }}>
                    ×
                  </button>
                </div>
              ) : (
                <button onClick={() => setSaving(true)} className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}>
                  + Save Session
                </button>
              )}
            </div>
          )}

          {/* Save to Report — passes chartRef + matrixRef for screenshot */}
          <SaveToReportButton
            query={lastQuery || echartsConfig?.title?.text || 'Query'}
            insight={insightSummary}
            detailedAnalysis={detailedAnalysis}
            echartsConfig={echartsConfig}
            data={chartData}
            chartRef={chartRef}
            matrixRef={matrixRef}
          />

          {/* Palette Switcher */}
          <div style={{ display: 'flex', gap: 6, padding: '2px 8px', border: '2px solid rgba(13,13,13,0.1)', alignItems: 'center' }}>
            <span style={{ fontSize: 9, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(13,13,13,0.35)', textTransform: 'uppercase' }}>Theme</span>
            {Object.keys(PALETTES).map(key => (
              <button
                key={key}
                onClick={() => setSelectedPalette(key)}
                title={key}
                style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: PALETTES[key][1],
                  border: selectedPalette === key ? '2px solid var(--bauhaus-black)' : '1px solid rgba(13,13,13,0.2)',
                  cursor: 'pointer',
                  transform: selectedPalette === key ? 'scale(1.3)' : 'none',
                  transition: 'transform 0.2s, border 0.2s',
                }}
              />
            ))}
          </div>

          <span style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', fontWeight: 500 }}>
            {chartData.length} rows
          </span>

          {/* Matrix view toggle — only shown for matrix-type results */}
          {showMatrix && (
            <div style={{ display: 'flex', border: 'var(--bauhaus-border)', overflow: 'hidden' }}>
              {[['matrix', '⊞ Table'], ['bar', '▐ Bar'], ['line', '〰 Line']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setMatrixViewMode(mode)}
                  style={{
                    padding: '4px 10px',
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    background: matrixViewMode === mode ? 'var(--bauhaus-black)' : '#fff',
                    color: matrixViewMode === mode ? '#fff' : 'var(--bauhaus-black)',
                    border: 'none', cursor: 'pointer',
                    borderRight: mode !== 'line' ? '2px solid var(--bauhaus-black)' : 'none',
                    transition: 'background 0.15s',
                  }}
                >{label}</button>
              ))}
            </div>
          )}

          <span style={{
            padding: '3px 10px',
            background: showKpi ? 'var(--bauhaus-blue)' : showMatrix ? '#16A34A' : typeColor,
            border: 'var(--bauhaus-border)',
            fontSize: 10, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#fff',
            boxShadow: '2px 2px 0 var(--bauhaus-black)',
          }}>
            {showKpi ? 'KPI' : showMatrix ? (matrixViewMode === 'matrix' ? 'MATRIX' : matrixViewMode.toUpperCase()) : chartType?.toUpperCase() || 'CHART'}
          </span>
        </div>
      </div>

      {/* Chart / KPI Card */}
      <div style={{ background: '#fff', border: 'var(--bauhaus-border)', boxShadow: 'var(--shadow-hard-lg)', padding: '24px 20px 16px' }}>
        {/* Top accent strip */}
        <div style={{ display: 'flex', height: 4, marginBottom: 20, marginLeft: -20, marginRight: -20, marginTop: -24 }}>
          <div style={{ flex: 1, background: 'var(--bauhaus-red)' }} />
          <div style={{ flex: 1, background: 'var(--bauhaus-blue)' }} />
          <div style={{ flex: 1, background: 'var(--bauhaus-yellow)' }} />
        </div>

        {showKpi ? (
          <KpiCard data={chartData} />
        ) : showMatrix && matrixViewMode === 'matrix' ? (
          <DataMatrix ref={matrixRef} data={chartData} />
        ) : showMatrix && (matrixViewMode === 'bar' || matrixViewMode === 'line') ? (() => {
          // Build a quick ECharts config for bar/line from the matrix data
          const cols = Object.keys(chartData[0])
          const xCol = cols.find(c => typeof chartData[0][c] === 'string') || cols[0]
          const yCols = cols.filter(c => c !== xCol && !isNaN(parseFloat(chartData[0][c])))
          const quickConfig = {
            title: { text: echartsConfig?.title?.text || 'Chart View', left: 'center', textStyle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 } },
            tooltip: { trigger: 'axis' },
            legend: { bottom: 0 },
            dataset: { source: chartData },
            xAxis: { type: 'category', encode: { x: xCol } },
            yAxis: { type: 'value' },
            series: yCols.length > 0
              ? yCols.map(yc => ({ type: matrixViewMode, encode: { x: xCol, y: yc }, name: yc }))
              : [{ type: matrixViewMode, encode: { x: cols[0], y: cols[1] } }],
            toolbox: { feature: { saveAsImage: {}, restore: {} } },
          }
          return <DynamicChart ref={chartRef} echartsConfig={quickConfig} colors={PALETTES[selectedPalette]} />
        })() : (
          <DynamicChart ref={chartRef} echartsConfig={echartsConfig} colors={PALETTES[selectedPalette]} />
        )}
      </div>

      {/* Info Panel Tabs — AI Insight | Detailed Analysis */}
      <div style={{ marginTop: 16 }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: 'var(--bauhaus-border)' }}>
          {[
            { id: 'insight', label: 'AI Insight' },
            { id: 'analysis', label: 'Detailed Analysis' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveInfoTab(tab.id)}
              style={{
                padding: '10px 20px',
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                background: activeInfoTab === tab.id ? 'var(--bauhaus-black)' : 'transparent',
                color: activeInfoTab === tab.id ? 'var(--bauhaus-yellow)' : 'rgba(13,13,13,0.4)',
                border: 'none', borderBottom: 'none',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeInfoTab === 'insight' && (
          <InsightPanel insight={insightSummary} sql={sqlExecuted} />
        )}

        <DetailedAnalysisPanel
          data={chartData}
          userQuery={lastQuery || echartsConfig?.title?.text || ''}
          sql={sqlExecuted}
          visible={activeInfoTab === 'analysis'}
        />
      </div>
    </div>
  )
}
