import React, { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import useDashboardStore from '../store/dashboardStore'
import NormalizationPanel from './NormalizationPanel'

// ── Background Shapes ──────────────────────────────────────────────────────
function PremiumShapes() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Circle */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%', width: 300, height: 300,
        borderRadius: '50%', background: 'var(--bauhaus-red)', opacity: 0.1,
        animation: 'float 12s ease-in-out infinite'
      }} />
      {/* Square */}
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%', width: 200, height: 200,
        background: 'var(--bauhaus-blue)', opacity: 0.1,
        animation: 'float 18s ease-in-out infinite reverse', transform: 'rotate(15deg)'
      }} />
      <div style={{
        position: 'absolute', top: '20%', right: '15%',
        width: 0, height: 0, borderLeft: '100px solid transparent', borderRight: '100px solid transparent', borderBottom: '170px solid var(--bauhaus-yellow)',
        opacity: 0.1, animation: 'float 15s ease-in-out infinite', transform: 'rotate(-25deg)'
      }} />
    </div>
  )
}

// ── Sliding Container Wrapper ──────────────────────────────────────────────
function SlideStep({ active, direction, children }) {
  // TranslateX basis: Left = -30%, Right = 30%, Center = 0
  const isPast = direction < 0
  const isFuture = direction > 0
  
  if (!active && !isPast && !isFuture) return null

  return (
    <div style={{
      position: active ? 'relative' : 'absolute',
      top: 0, left: 0, width: '100%',
      opacity: active ? 1 : 0,
      visibility: active ? 'visible' : 'hidden',
      transform: active ? 'translateX(0)' : isPast ? 'translateX(-40px)' : 'translateX(40px)',
      transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      pointerEvents: active ? 'auto' : 'none'
    }}>
      {children}
    </div>
  )
}

// ── Editable Schema Row ────────────────────────────────────────────────────
function SchemaRow({ col, index, tableName, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const handleSave = async (newType) => {
    if (newType === col.type) return setEditing(false)
    setSaving(true)
    try {
      const res = await axios.post((import.meta.env.VITE_API_BASE_URL || '') + '/update-column', { table_name: tableName, column_name: col.name, new_type: newType })
      onUpdated(res.data) // updates the whole table meta
      setEditing(false)
    } catch (e) {
      alert("Failed to update type: " + (e.response?.data?.detail || e.message))
    } finally {
      setSaving(false)
    }
  }

  const SQL_TYPES = ['VARCHAR', 'INTEGER', 'BIGINT', 'DOUBLE', 'BOOLEAN', 'DATE', 'TIMESTAMP']

  return (
    <tr style={{ borderBottom: '2px solid rgba(13,13,13,0.1)', background: index % 2 === 0 ? '#fff' : 'rgba(13,13,13,0.02)' }}>
      <td style={{ padding: '14px 24px', fontSize: 12, color: 'rgba(13,13,13,0.4)', fontFamily: 'monospace', fontWeight: 600 }}>
        {index + 1}
      </td>
      <td style={{ padding: '14px 24px', fontWeight: 700, fontSize: 15, color: 'var(--bauhaus-black)' }}>
        {col.name}
      </td>
      <td style={{ padding: '14px 24px' }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select 
              autoFocus 
              disabled={saving}
              defaultValue={col.type} 
              onChange={e => handleSave(e.target.value)}
              onBlur={() => setEditing(false)}
              style={{ padding: '6px 10px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, border: '2px solid var(--bauhaus-black)' }}
            >
              {SQL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {saving && <span style={{ fontSize: 10, color: 'var(--bauhaus-red)' }}>saving...</span>}
          </div>
        ) : (
          <div 
            onClick={() => setEditing(true)} 
            style={{ 
              display: 'inline-flex', cursor: 'pointer', alignItems: 'center', gap: 6,
              background: 'var(--bauhaus-cream)', border: '2px solid rgba(13,13,13,0.2)', padding: '4px 10px', 
              transition: 'border 0.2s, background 0.2s',
            }}
            title="Click to edit type"
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--bauhaus-blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(13,13,13,0.2)'}
          >
            <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--bauhaus-blue)' }}>
              {col.type}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(13,13,13,0.4)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Main Tab ───────────────────────────────────────────────────────────────
export default function DataTab() {
  const { tableMeta, setTableMeta, setActiveTab } = useDashboardStore()
  const [dragging, setDragging] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0) // 0: off, 1: upload, 2: schema, 3: matching
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1) // 1: schema, 2: norm, 3: preview
  
  const [previewData, setPreviewData] = useState([])
  const [normSuggestions, setNormSuggestions] = useState(null)

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) return alert('Only CSV files are supported.')
    
    setLoadingStep(1)
    const form = new FormData()
    form.append('file', file)
    let meta = null
    
    try {
      const res = await axios.post((import.meta.env.VITE_API_BASE_URL || '') + '/upload-csv', form)
      meta = {
        tableName: res.data.table_name,
        columns: res.data.column_types
          ? Object.keys(res.data.column_types).map(k => ({ name: k, type: res.data.column_types[k] }))
          : [],
        rowCount: res.data.row_count
      }

      setLoadingStep(2)
      // Use preview rows and normalization suggestions bundled in the upload response
      if (res.data.preview?.length > 0) {
        setPreviewData(res.data.preview)
      }

      setLoadingStep(3)
      const norm = res.data.normalization_suggestions
      if (norm && ((norm.auto?.length || 0) + (norm.review?.length || 0) > 0)) {
        setNormSuggestions(norm)
      }

      setTimeout(() => {
        setTableMeta(meta)
        setLoadingStep(0)
        setWizardStep(1) // Start wizard on Upload success
      }, 800)
    } catch {
      alert('Upload failed. Please try again.')
      setLoadingStep(0)
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])
  const onDragOver = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  // ── LOADING SEQUENCE ──
  if (loadingStep > 0) {
    const steps = {
      1: { title: 'UPLOADING', detail: 'Ingesting CSV securely into DuckDB engine...' },
      2: { title: 'ANALYZING', detail: 'Extracting column schemas and type coercion...' },
      3: { title: 'PROFILING', detail: 'Running fuzzy-matching on text fields to hunt for duplicate entities...' }
    }
    const current = steps[loadingStep]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', gap: 32, minHeight: '60vh' }}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <div style={{ position: 'absolute', inset: 0, border: '6px solid var(--bauhaus-black)', borderRadius: '50%', borderTopColor: 'var(--bauhaus-red)', animation: 'spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite' }} />
          <div style={{ position: 'absolute', inset: 12, border: '6px solid rgba(13,13,13,0.1)', borderRadius: '50%', borderLeftColor: 'var(--bauhaus-blue)', animation: 'spin 1.5s linear infinite reverse' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 key={current.title} style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 12 }} className="animate-fade-in">
            {current.title}
          </h2>
          <p key={current.detail} style={{ fontSize: 15, color: 'rgba(13,13,13,0.6)', maxWidth: 400, margin: '0 auto', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }} className="animate-fade-in">
            {current.detail}
          </p>
        </div>
      </div>
    )
  }

  // ── WELCOME EMPTY STATE ──
  if (!tableMeta) {
    return (
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <style>
          {`
            @keyframes float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-20px) rotate(5deg); } }
            @keyframes pulseShadow { 0%, 100% { box-shadow: 0 0 0 0 rgba(27, 79, 204, 0.2); } 50% { box-shadow: 0 0 0 20px rgba(27, 79, 204, 0); } }
          `}
        </style>
        <PremiumShapes />
        
        <div style={{ zIndex: 1, textAlign: 'center', marginBottom: 48 }} className="animate-slide-up">
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--bauhaus-black)', marginBottom: 16, lineHeight: 1.1 }}>
            Unlock the hidden <span style={{ color: 'var(--bauhaus-red)' }}>narrative</span>
            <br />inside your data.
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(13,13,13,0.6)', maxWidth: 500, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            Ingest, normalize, and query your datasets effortlessly using natural language. No SQL required.
          </p>
        </div>

        <label
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          className="animate-fade-in"
          style={{
            zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: '100%', maxWidth: 640, height: 260, cursor: 'pointer',
            background: dragging ? 'rgba(27, 79, 204, 0.05)' : '#fff',
            border: dragging ? '4px dashed var(--bauhaus-blue)' : '4px solid var(--bauhaus-black)',
            boxShadow: dragging ? 'none' : '8px 8px 0 var(--bauhaus-black)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: dragging ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          <div style={{ 
            width: 72, height: 72, borderRadius: '50%', background: 'var(--bauhaus-yellow)', 
            border: '4px solid var(--bauhaus-black)', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '4px 4px 0 var(--bauhaus-black)',
            animation: dragging ? 'pulseShadow 1.5s infinite' : 'none'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bauhaus-black)" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" />
            </svg>
          </div>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '0.02em', color: 'var(--bauhaus-black)' }}>
            {dragging ? 'DROP IT LIKE IT’S HOT' : 'DRAG & DROP YOUR CSV DATA'}
          </p>
          <p style={{ fontSize: 14, color: 'rgba(13,13,13,0.5)', marginTop: 8, fontWeight: 500 }}>
            or click to browse from your computer
          </p>
          <input type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        </label>
      </div>
    )
  }

  // ── WIZARD LAYOUT ──
  const WIZARD_STEPS = [
    { id: 1, title: 'SCHEMA OVERVIEW', label: 'Step 1' },
    { id: 2, title: 'NORMALIZATION', label: 'Step 2' },
    { id: 3, title: 'DATA PREVIEW', label: 'Step 3' }
  ]

  const totalSteps = WIZARD_STEPS.length
  
  const handleNext = () => setWizardStep(prev => Math.min(prev + 1, totalSteps))
  const handlePrev = () => setWizardStep(prev => Math.max(prev - 1, 1))

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 20px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 32, paddingBottom: 24, borderBottom: '6px solid var(--bauhaus-black)'
      }}>
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
            Dataset: <span style={{ color: 'var(--bauhaus-red)' }}>{
              tableMeta.tableName 
                ? (tableMeta.tableName.match(/^tbl_[a-f0-9_]+_(.+)$/i) ? tableMeta.tableName.match(/^tbl_[a-f0-9_]+_(.+)$/i)[1].replace(/_/g, ' ') : tableMeta.tableName)
                : ''
            }</span>
          </h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', background: 'var(--bauhaus-yellow)', border: '2px solid var(--bauhaus-black)', boxShadow: '2px 2px 0 var(--bauhaus-black)', fontSize: 12, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
              {tableMeta.rowCount?.toLocaleString()} ROWS
            </span>
            <span style={{ padding: '4px 12px', background: 'var(--bauhaus-blue)', color: '#fff', border: '2px solid var(--bauhaus-black)', boxShadow: '2px 2px 0 var(--bauhaus-black)', fontSize: 12, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
              {tableMeta.columns?.length || 0} COLUMNS
            </span>
          </div>
        </div>
      </div>

      {/* Progress Tracker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid rgba(13,13,13,0.1)', paddingBottom: 16, position: 'relative' }}>
          {/* Active progress bar indicator */}
          <div style={{
            position: 'absolute', bottom: -4, left: 0, height: 4, background: 'var(--bauhaus-red)',
            width: `${((wizardStep - 1) / (totalSteps - 1)) * 100}%`,
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} />

          {WIZARD_STEPS.map((s, idx) => {
            const isActive = wizardStep === s.id
            const isDone = wizardStep > s.id
            return (
              <div 
                key={s.id} 
                onClick={() => setWizardStep(s.id)}
                style={{ 
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: idx === 0 ? 'flex-start' : idx === totalSteps - 1 ? 'flex-end' : 'center',
                  opacity: isActive || isDone ? 1 : 0.4, cursor: 'pointer', transition: 'opacity 0.2s'
                }}
              >
                <span style={{ fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, letterSpacing: '0.04em', color: isActive ? 'var(--bauhaus-blue)' : 'var(--bauhaus-black)', marginBottom: 4 }}>
                  {s.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bauhaus-black)' }}>
                  {s.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Viewport for Sliding Steps */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: 400 }}>
        
        {/* Step 1: SCHEMA */}
        <SlideStep active={wizardStep === 1} direction={1 - wizardStep}>
          <div style={{ background: '#fff', border: '4px solid var(--bauhaus-black)', boxShadow: '8px 8px 0 var(--bauhaus-black)', borderRadius: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: 'rgba(13,13,13,0.03)', borderBottom: '2px solid rgba(13,13,13,0.1)' }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(13,13,13,0.6)', fontFamily: 'Inter, sans-serif' }}>
                Review detected column types. Click the highlighted type to automatically cast numeric texts.
              </p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bauhaus-black)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.05em' }}>
                  <th style={{ padding: '16px 24px', fontSize: 11 }}>#</th>
                  <th style={{ padding: '16px 24px', fontSize: 11 }}>COLUMN NAME</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, width: 200 }}>DATA TYPE</th>
                </tr>
              </thead>
              <tbody>
                {tableMeta.columns?.map((col, i) => (
                  <SchemaRow key={col.name + i} col={col} index={i} tableName={tableMeta.tableName} onUpdated={(newMeta) => setTableMeta(newMeta)} />
                ))}
              </tbody>
            </table>
          </div>
        </SlideStep>

        {/* Step 2: NORMALIZATION */}
        <SlideStep active={wizardStep === 2} direction={2 - wizardStep}>
          {!normSuggestions || (normSuggestions.auto.length === 0 && normSuggestions.review.length === 0) ? (
            <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '4px solid var(--bauhaus-black)', boxShadow: '8px 8px 0 var(--bauhaus-black)' }}>
              <p style={{ color: 'rgba(13,13,13,0.6)', fontSize: 16, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>No entity normalization needed. Your text columns look clean.</p>
            </div>
          ) : (
            <NormalizationPanel
              suggestions={normSuggestions}
              onApplied={() => { /* Could refetch preview */ }}
            />
          )}
        </SlideStep>

        {/* Step 3: PREVIEW */}
        <SlideStep active={wizardStep === 3} direction={3 - wizardStep}>
          {previewData.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '4px solid var(--bauhaus-black)', boxShadow: '8px 8px 0 var(--bauhaus-black)' }}>
              <p style={{ color: 'rgba(13,13,13,0.6)', fontSize: 15, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>Preview not available.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '4px solid var(--bauhaus-black)', boxShadow: '8px 8px 0 var(--bauhaus-black)', background: '#fff' }}>
              <div style={{ padding: '16px 24px', background: 'rgba(13,13,13,0.03)', borderBottom: '2px solid rgba(13,13,13,0.1)' }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(13,13,13,0.6)', fontFamily: 'Inter, sans-serif' }}>
                  First 50 rows of your dataset. It's ready to be queried.
                </p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 14px', background: 'var(--bauhaus-black)', color: 'rgba(255,255,255,0.4)', fontSize: 11, whiteSpace: 'nowrap', textAlign: 'center', minWidth: 40, borderBottom: '4px solid var(--bauhaus-black)' }}>#</th>
                    {Object.keys(previewData[0]).map((col, i) => (
                      <th key={col} style={{
                        padding: '14px 18px', textAlign: 'left',
                        whiteSpace: 'nowrap',
                        background: 'var(--bauhaus-cream)',
                        color: 'var(--bauhaus-black)',
                        fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800,
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                        borderRight: '2px solid rgba(13,13,13,0.1)',
                        borderBottom: '4px solid var(--bauhaus-black)',
                      }}>
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, ri) => (
                    <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : 'rgba(13,13,13,0.02)' }}>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: 'rgba(13,13,13,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(13,13,13,0.08)', borderRight: '2px solid rgba(13,13,13,0.1)' }}>{ri + 1}</td>
                      {Object.values(row).map((val, vi) => (
                        <td key={vi} style={{ padding: '10px 18px', borderBottom: '1px solid rgba(13,13,13,0.08)', borderRight: '2px solid rgba(13,13,13,0.1)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--bauhaus-black)' }}>
                          {String(val ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SlideStep>
      </div>

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24 }}>
        <button
          onClick={handlePrev}
          disabled={wizardStep === 1}
          style={{
            padding: '14px 28px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700,
            background: 'transparent', border: '2px solid rgba(13,13,13,0.2)', color: 'var(--bauhaus-black)',
            cursor: wizardStep === 1 ? 'not-allowed' : 'pointer', opacity: wizardStep === 1 ? 0 : 1, transition: 'opacity 0.2s'
          }}
        >
          ← PREVIOUS
        </button>

        {wizardStep < totalSteps ? (
          <button
            onClick={handleNext}
            className="btn-primary"
            style={{ fontSize: 16, padding: '14px 36px', border: '4px solid var(--bauhaus-black)', boxShadow: '6px 6px 0 var(--bauhaus-black)' }}
          >
            NEXT STEP →
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('query')}
            className="btn-primary"
            style={{ fontSize: 16, padding: '14px 36px', background: 'var(--bauhaus-red)', color: '#fff', border: '4px solid var(--bauhaus-black)', boxShadow: '6px 6px 0 var(--bauhaus-black)' }}
          >
            START QUERYING →
          </button>
        )}
      </div>

    </div>
  )
}
