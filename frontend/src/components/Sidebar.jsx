import React, { useState } from 'react'
import axios from 'axios'
import useDashboardStore from '../store/dashboardStore'

export default function Sidebar() {
  const { 
    sessions, activeSessionId, sidebarOpen, toggleSidebar,
    setActiveSession, setQueryResult, fetchSessions, resetAll 
  } = useDashboardStore()

  const [deleteTarget, setDeleteTarget] = useState(null) // {id, title}

  const loadSession = async (id) => {
    try {
      const res = await axios.get(`/sessions/${id}`)
      setQueryResult(res.data.state)
      setActiveSession(id)
      if (window.innerWidth < 768) toggleSidebar() // close on mobile after pick
    } catch {
      alert("Failed to load session")
    }
  }

  const deleteSession = async (id) => {
    try {
      await axios.delete(`/sessions/${id}`)
      await fetchSessions()
      setDeleteTarget(null)
    } catch {
      alert('Failed to delete session.')
    }
  }

  const handleNewChat = () => {
    resetAll()
    if (window.innerWidth < 768) toggleSidebar()
  }

  // Sidebar hidden state via translation
  const w = 260
  const transform = sidebarOpen ? 'translateX(0)' : `translateX(-${w}px)`

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Actual Sidebar */}
      <aside style={{
        width: w, transform,
        position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
        background: '#fff', borderRight: 'var(--bauhaus-border)',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header */}
        <div style={{
          padding: 16, borderBottom: 'var(--bauhaus-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bauhaus-black)',
        }}>
          <span style={{ 
            color: 'var(--bauhaus-yellow)', fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, letterSpacing: '0.05em' 
          }}>
            SESSIONS
          </span>
          <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div style={{ padding: 16, borderBottom: '2px solid rgba(13,13,13,0.1)' }}>
          <button 
            onClick={handleNewChat}
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }}
          >
            + New Chat
          </button>
        </div>

        {/* History List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 8px' }}>
          {sessions.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(13,13,13,0.4)', fontSize: 13, marginTop: 24, fontWeight: 500 }}>
              No saved sessions.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map(s => (
                <div 
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  style={{
                    padding: '12px 14px',
                    background: activeSessionId === s.id ? 'var(--bauhaus-yellow)' : 'transparent',
                    border: activeSessionId === s.id ? 'var(--bauhaus-border)' : '2px solid transparent',
                    boxShadow: activeSessionId === s.id ? '2px 2px 0 var(--bauhaus-black)' : 'none',
                    borderRadius: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.1s'
                  }}
                  onMouseEnter={e => {
                    if (activeSessionId !== s.id) {
                      e.currentTarget.style.background = 'rgba(13,13,13,0.04)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeSessionId !== s.id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      fontSize: 13, fontWeight: 600, color: 'var(--bauhaus-black)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {s.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(13,13,13,0.5)', marginTop: 4 }}>
                      {new Date(s.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: s.id, title: s.title }) }}
                    style={{ background: 'none', border: 'none', color: 'var(--bauhaus-red)', padding: 4, cursor: 'pointer', opacity: 0.6, fontSize: 18 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                    title="Delete session"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Content push margin for desktop */}
      <div 
        className="hidden md:block transition-all duration-300"
        style={{ width: sidebarOpen ? w : 0, flexShrink: 0 }} 
      />

      {/* In-app delete confirm overlay */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setDeleteTarget(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{
            position: 'relative', background: '#fff',
            border: 'var(--bauhaus-border)', boxShadow: '6px 6px 0 var(--bauhaus-black)',
            padding: '28px 32px', minWidth: 320,
          }}>
            {/* Red accent top */}
            <div style={{ height: 4, background: 'var(--bauhaus-red)', margin: '-28px -32px 24px' }} />
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Delete Session?</p>
            <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)', marginBottom: 24, lineHeight: 1.5 }}>
              <strong>{deleteTarget.title}</strong> will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => deleteSession(deleteTarget.id)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'var(--bauhaus-red)', color: '#fff',
                  border: 'var(--bauhaus-border)', boxShadow: '2px 2px 0 var(--bauhaus-black)',
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
                  letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'transparent', color: 'var(--bauhaus-black)',
                  border: '2px solid rgba(13,13,13,0.2)',
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
                  letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
