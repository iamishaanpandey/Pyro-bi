import React, { useState } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import axios from 'axios'
import useDashboardStore from '../store/dashboardStore'
import DynamicChart from './DynamicChart'
import KpiCard from './KpiCard'
import DataMatrix from './DataMatrix'

const DashboardChat = () => {
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const { dashboardLayout, updateDashboardItem, activeSessionId } = useDashboardStore()

  const handleChat = async (e) => {
    e.preventDefault()
    if (!msg.trim() || dashboardLayout.length === 0) return
    const currentMsg = msg.trim()
    setMsg('')
    setLoading(true)

    try {
      await Promise.all(dashboardLayout.map(async (item) => {
         const payload = {
           query: currentMsg,
           session_id: activeSessionId || "",
           last_query: item.query || "",
           last_sql: item.sql || ""
         }
         try {
           const res = await axios.post((import.meta.env.VITE_API_BASE_URL || '') + '/query', payload, {
             headers: { 'X-User-ID': localStorage.getItem('pyro-uid') || '' }
           })
           const newResult = res.data
           if (!newResult.error) {
             updateDashboardItem(item.id, {
               data: newResult.data,
               echartsConfig: newResult.echarts_config,
               chartType: newResult.chart_type,
               query: currentMsg,
               sql: newResult.sql_executed
             })
           }
         } catch (err) {
           console.error("Failed to update widget:", item.id, err)
         }
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleChat} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--bauhaus-black)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Filter or Modify Visuals
      </p>
      <div style={{ display: 'flex', border: 'var(--bauhaus-border)', boxShadow: 'var(--shadow-hard-sm)' }}>
        <div style={{ background: 'var(--bauhaus-yellow)', width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: 'var(--bauhaus-border)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bauhaus-black)" strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill="var(--bauhaus-black)" />
            <circle cx="15" cy="10" r="1" fill="var(--bauhaus-black)" />
          </svg>
        </div>
        <input 
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder={loading ? "Updating..." : "e.g., 'filter to East Coast'"}
          disabled={loading}
          style={{ 
            flex: 1, padding: '10px 12px', border: 'none', outline: 'none',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 
          }}
        />
      </div>
      <button 
        type="submit" 
        disabled={loading || !msg.trim()}
        className="btn-primary" 
        style={{ padding: '10px 0', width: '100%', opacity: loading ? 0.7 : 1, textAlign: 'center', display: 'block' }}
      >
        {loading ? "APPLYING..." : "APPLY CONTEXT"}
      </button>
    </form>
  )
}

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function DashboardTab() {
  const { dashboardLayout, updateDashboardLayout, removeDashboardItem } = useDashboardStore()
  
  const handleLayoutChange = (layout) => {
    updateDashboardLayout(layout)
  }

  if (dashboardLayout.length === 0) {
    return (
      <div style={{ maxWidth: 960, margin: '48px auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
          Your Dashboard is Empty
        </h2>
        <p style={{ color: 'rgba(13,13,13,0.6)', maxWidth: 400, margin: '0 auto', lineHeight: 1.5 }}>
          Go to the Query tab and click "Add to Dashboard" on any chart or metric to start building your custom grid view.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 120px)', width: '100%', overflow: 'hidden' }}>
      
      {/* Grid Container */}
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--bauhaus-black)' }}>
              Interactive Dashboard
            </h2>
        </div>
        
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: dashboardLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          margin={[16, 16]}
        >
          {dashboardLayout.map(item => (
            <div key={item.id} data-grid={{ x: item.x || 0, y: item.y || 0, w: item.w || 6, h: item.h || 4, minW: 3, minH: 3, i: item.id }} style={{ 
              background: '#fff', border: 'var(--bauhaus-border)', 
              boxShadow: 'var(--shadow-hard-md)', display: 'flex', flexDirection: 'column' 
            }}>
              <div className="drag-handle" style={{ 
                background: 'var(--bauhaus-black)', color: '#fff', padding: '6px 10px', 
                cursor: 'grab', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.echartsConfig?.title?.text || 'Widget'}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeDashboardItem(item.id) }} 
                  style={{ background: 'none', border: 'none', color: 'var(--bauhaus-red)', cursor: 'pointer', padding: '0 4px', fontSize: 16, lineHeight: 1 }}
                  title="Remove Widget"
                >×</button>
              </div>
              <div style={{ flex: 1, padding: 10, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {(() => {
                  if (!item.data || item.data.length === 0) {
                    return (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bauhaus-red)', marginBottom: 8 }}>NO DATA</p>
                        <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)' }}>The visual could not be generated with the applied context.</p>
                      </div>
                    )
                  }

                  if (item.chartType === 'kpi' || (!item.chartType && item.data?.length === 1 && Object.keys(item.data[0]).length <= 4)) {
                    return <KpiCard data={item.data} />
                  } else if (item.chartType === 'matrix' || (!item.chartType && item.data?.length > 50)) {
                    return <DataMatrix data={item.data} compact={true} />
                  } else {
                     // Strip the original title, toolbox, and dataZoom for cleaner dashboard widgets
                     const config = item.echartsConfig ? JSON.parse(JSON.stringify(item.echartsConfig)) : {}
                     config.title = { show: false }
                     config.toolbox = { show: false }
                     config.dataZoom = undefined
                     if (!config.legend) config.legend = {}
                     config.legend.show = true
                     config.legend.bottom = 0
                     
                     return <DynamicChart echartsConfig={config} colors={['#D62828', '#1B4FCC', '#F7B731', '#16A34A', '#7C3AED', '#0891B2']} />
                  }
                })()}
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Right Sidebar */}
      <div style={{ width: 340, background: '#fafafa', borderLeft: 'var(--bauhaus-border)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(0,0,0,0.1)', background: '#fff' }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dashboard Chat
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)', marginTop: 4, lineHeight: 1.5 }}>
              Apply global filters or change the context for all widgets.
            </p>
        </div>
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <DashboardChat />
        </div>
      </div>

    </div>
  )
}
