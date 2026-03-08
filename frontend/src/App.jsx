import React, { useEffect, useRef, useState } from 'react'

import useDashboardStore from './store/dashboardStore'
import QueryInput from './components/QueryInput'
import Dashboard from './components/Dashboard'
import DataTab from './components/DataTab'
import Sidebar from './components/Sidebar'
import RightSidebar from './components/RightSidebar'

export default function App() {
  const {
    activeTab, setActiveTab, sidebarOpen, toggleSidebar,
    tableMeta, resetAll, fetchSessions, setQueryResult, setLoading, setError, setLastQuery
  } = useDashboardStore()

  const queryInputRef = useRef(null)

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const [showClearModal, setShowClearModal] = useState(false)

  const executeClearData = async () => {
    try {
      await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/clear-data', { method: 'POST' })
      resetAll()
      setShowClearModal(false)
    } catch {
      alert('Failed to clear data.')
    }
  }

  const handleSuggestionSelect = async (query) => {
    if (!tableMeta) return
    setLastQuery(query)
    setActiveTab('query')   // ← switch to Query tab so Dashboard is visible
    setLoading(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: '' }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setQueryResult(data)
      }
    } catch (e) {
      setError(e.message || 'Query failed')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bauhaus-cream)' }}>
      {/* ── Left Sidebar ── */}
      <Sidebar />

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">

        {/* Nav Header */}
        <nav style={{
          background: 'var(--bauhaus-black)',
          borderBottom: '4px solid var(--bauhaus-yellow)',
          position: 'sticky', top: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 56,
        }}>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--bauhaus-yellow)', padding: '4px',
                display: sidebarOpen ? 'none' : 'block'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center gap-1">
              <div style={{ width: 16, height: 16, background: 'var(--bauhaus-red)', border: '2px solid var(--bauhaus-yellow)' }} />
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--bauhaus-blue)', border: '2px solid var(--bauhaus-yellow)' }} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--bauhaus-yellow)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Pyro<span style={{ color: 'var(--bauhaus-red)', marginLeft: 4 }}>BI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="clear-data-btn"
              onClick={() => setShowClearModal(true)}
              className="btn-ghost"
              style={{ color: 'var(--bauhaus-red)', borderColor: 'var(--bauhaus-red)' }}
              title="Delete all data and start fresh"
            >
              Clear Data
            </button>
          </div>
        </nav>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: 'var(--bauhaus-border)', background: '#fff' }}>
          <button
            onClick={() => setActiveTab('data')}
            style={{
              flex: 1, padding: '16px 0',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: activeTab === 'data' ? 'var(--bauhaus-red)' : 'transparent',
              color: activeTab === 'data' ? '#fff' : 'var(--bauhaus-black)',
              borderRight: 'var(--bauhaus-border)', borderBottom: 'none', borderTop: 'none', borderLeft: 'none',
              cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            1. DATA (Schema)
          </button>
          <button
            onClick={() => tableMeta && setActiveTab('query')}
            disabled={!tableMeta}
            style={{
              flex: 1, padding: '16px 0',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: activeTab === 'query' ? 'var(--bauhaus-blue)' : 'transparent',
              color: activeTab === 'query' ? '#fff' : 'rgba(13,13,13,0.3)',
              border: 'none',
              cursor: tableMeta ? 'pointer' : 'not-allowed', transition: 'background 0.2s',
            }}
            title={!tableMeta ? 'Upload data first' : ''}
          >
            2. QUERY (Chat)
          </button>
        </div>

        {/* Main Content — flex row, right sidebar only on query tab */}
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeTab === 'data' ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <DataTab />
            </div>
          ) : (
            <>
              {/* Query + Charts column */}
              <div style={{ flex: 1, padding: '40px 24px 80px', overflowY: 'auto' }}>
                <QueryInput />
                <Dashboard />
              </div>

              {/* Right sidebar — AI Ideas + Report tabs */}
              {tableMeta && (
                <RightSidebar onQuerySelect={handleSuggestionSelect} />
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '4px solid var(--bauhaus-black)', background: 'var(--bauhaus-black)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)' }}>
            Pyro BI · Conversational Intelligence · Built with Groq, DuckDB &amp; ECharts
          </span>
        </footer>
      </div>

      {/* ── Custom Clear Data Modal ── */}
      {showClearModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 20 }}>
          <div className="animate-slide-up" style={{ 
            background: '#fff', border: '4px solid var(--bauhaus-black)', boxShadow: '8px 8px 0 var(--bauhaus-black)', 
            width: '100%', maxWidth: 460, padding: 32, position: 'relative' 
          }}>
            <div style={{ position: 'absolute', top: -16, left: 32, width: 32, height: 32, background: 'var(--bauhaus-red)', border: '4px solid var(--bauhaus-black)', borderRadius: '50%' }} />
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--bauhaus-black)', marginBottom: 16, marginTop: 12 }}>
              CLEAR ALL DATA?
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(13,13,13,0.7)', fontFamily: 'Inter, sans-serif', lineHeight: 1.5, marginBottom: 32 }}>
              This action will permanently delete all uploaded tables, chat history, and visualization reports from your current session.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowClearModal(false)}
                style={{ padding: '12px 24px', background: 'transparent', border: '2px solid rgba(13,13,13,0.2)', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, cursor: 'pointer' }}
              >
                CANCEL
              </button>
              <button 
                onClick={executeClearData}
                style={{ padding: '12px 24px', background: 'var(--bauhaus-red)', color: '#fff', border: '4px solid var(--bauhaus-black)', boxShadow: '4px 4px 0 var(--bauhaus-black)', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, letterSpacing: '0.05em', cursor: 'pointer' }}
              >
                YES, NUKE IT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
