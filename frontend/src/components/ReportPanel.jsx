import React, { useRef } from 'react'
import { create } from 'zustand'

// ─── Store ────────────────────────────────────────────────────────────────────
export const useReportStore = create((set) => ({
  items: [],

  addToReport: (item) => set(state => ({
    items: [...state.items, {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      ...item
    }]
  })),

  removeFromReport: (id) => set(state => ({
    items: state.items.filter(i => i.id !== id)
  })),

  clearReport: () => set({ items: [] }),
}))

// ─── Save to Report Button (used in Dashboard) ─────────────────────────────
export function SaveToReportButton({ query, insight, detailedAnalysis, echartsConfig, data, chartRef, matrixRef }) {
  const { addToReport, items } = useReportStore()
  const [saved, setSaved] = React.useState(false)

  const handleSave = async () => {
    let chartImageUrl = null

    // 1. Try ECharts canvas getDataURL (for line/bar/pie charts)
    try {
      if (chartRef?.current?.getDataURL) {
        chartImageUrl = chartRef.current.getDataURL()
      }
    } catch (e) {
      console.warn('ECharts capture failed:', e)
    }

    // 2. If no ECharts capture, try html2canvas on the matrix DOM element
    if (!chartImageUrl && matrixRef?.current) {
      try {
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(matrixRef.current, {
          backgroundColor: '#ffffff',
          scale: 1.5,
          useCORS: true,
          logging: false,
        })
        chartImageUrl = canvas.toDataURL('image/png')
      } catch (e) {
        console.warn('html2canvas matrix capture failed:', e)
      }
    }

    addToReport({ query, insight, detailedAnalysis, echartsConfig, data, chartImageUrl })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <button
      onClick={handleSave}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700, fontSize: 10,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        background: saved ? '#16A34A' : 'var(--bauhaus-yellow)',
        color: 'var(--bauhaus-black)',
        border: 'var(--bauhaus-border)',
        boxShadow: '2px 2px 0 var(--bauhaus-black)',
        cursor: 'pointer',
        transition: 'background 0.3s',
      }}
    >
      {saved ? '✓ Added!' : `📋 Save to Report (${items.length})`}
    </button>
  )
}

// ─── Premium PDF generator ─────────────────────────────────────────────────────
async function generatePremiumPDF(items, setDownloading) {
  if (items.length === 0) return
  setDownloading(true)
  try {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
    const PW = doc.internal.pageSize.getWidth()   // 595
    const PH = doc.internal.pageSize.getHeight()  // 842
    const M = 48        // margin
    const CONTENT_W = PW - M * 2
    const NAVY   = [15,  30,  80]
    const GOLD   = [203, 155,  50]
    const RED    = [180,  30,  30]
    const LIGHT  = [245, 247, 250]
    const DARK   = [20,  20,  30]
    const GRAY   = [130, 130, 145]

    // Helper: draw full bleed rect
    const rect = (x, y, w, h, r, g, b) => {
      doc.setFillColor(r, g, b)
      doc.rect(x, y, w, h, 'F')
    }

    // ── COVER PAGE ─────────────────────────────────────────────────────────
    // Full navy background
    rect(0, 0, PW, PH, ...NAVY)

    // Gold vertical accent bar (left)
    rect(0, 0, 6, PH, ...GOLD)

    // Large geometric circle - Bauhaus accent
    doc.setFillColor(255, 255, 255)
    doc.setGState(doc.GState({ opacity: 0.04 }))
    doc.circle(PW - 80, 140, 180, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))

    // Logo area (top-left)
    rect(M, 80, 36, 36, ...GOLD)
    rect(M + 44, 80, 36, 36, ...RED)
    doc.setFillColor(255, 255, 255)
    doc.circle(M + 44 + 18, 80 + 18, 9, 'F')

    // Company / app name
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GOLD)
    doc.text('PYRO BI', M + 90, 103)

    // Horizontal rule
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(1.5)
    doc.line(M, 135, PW - M, 135)

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(36)
    doc.setTextColor(255, 255, 255)
    doc.text('ANALYSIS', M, 215)
    doc.setFontSize(36)
    doc.setTextColor(...GOLD)
    doc.text('REPORT', M, 258)

    // Subtitle line
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...GRAY)
    doc.text('Conversational Business Intelligence', M, 290)

    // Meta block
    rect(M, 350, CONTENT_W, 90, 25, 40, 100)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GOLD)
    doc.text('REPORT DETAILS', M + 20, 377)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 210, 240)
    doc.text(`Generated:  ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`, M + 20, 397)
    doc.text(`Sections:   ${items.length} analysis section${items.length !== 1 ? 's' : ''}`, M + 20, 413)
    doc.text(`Prepared by: PyroBI Analytical Engine`, M + 20, 429)

    // Bottom strip
    rect(0, PH - 40, PW, 40, 10, 18, 50)
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text('CONFIDENTIAL — INTERNAL USE ONLY', PW / 2, PH - 18, { align: 'center' })

    // Page number
    doc.setTextColor(...GOLD)
    doc.text('pg. 1', PW - M, PH - 18, { align: 'right' })

    // ── CONTENT PAGES ──────────────────────────────────────────────────────
    for (let idx = 0; idx < items.length; idx++) {
      doc.addPage()
      const item = items[idx]
      let y = 0

      // Page background
      rect(0, 0, PW, PH, 250, 252, 255)
      // Gold top stripe
      rect(0, 0, PW, 5, ...GOLD)
      // Navy left sidebar
      rect(0, 0, 6, PH, ...NAVY)

      // ── Top header band ──────────────────────────────────────────────
      rect(0, 5, PW, 64, ...NAVY)
      // Section badge
      rect(M, 18, 28, 28, ...GOLD)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(...NAVY)
      doc.text(`${idx + 1}`, M + 14, 18 + 19, { align: 'center' })

      // Title
      const title = item.echartsConfig?.title?.text || item.query || `Analysis ${idx + 1}`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(255, 255, 255)
      const titleLines = doc.splitTextToSize(title.toUpperCase(), CONTENT_W - 50)
      doc.text(titleLines, M + 38, 35)

      // Query sub-label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(170, 185, 215)
      doc.text(`"${item.query}"`, M + 38, 57, { maxWidth: CONTENT_W - 50 })

      y = 92

      // ── Meta strip (rows, columns, time) ─────────────────────────────
      rect(M, y, CONTENT_W, 32, 230, 235, 248)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...NAVY)
      const cols = item.data ? Object.keys(item.data[0] || {}).length : 0
      const metaText = `${item.data?.length || 0} rows  ·  ${cols} columns  ·  Captured at ${item.timestamp}  ·  ${item.date}`
      doc.text(metaText, M + 12, y + 20)
      y += 44

      // ── Chart / Visual ────────────────────────────────────────────────
      if (item.chartImageUrl) {
        try {
          const props = doc.getImageProperties(item.chartImageUrl)
          const imgRatio = props.height / props.width
          const maxImgW = CONTENT_W - 8
          const maxImgH = 400 // Allow taller charts
          
          let finalW = maxImgW
          let finalH = finalW * imgRatio
          
          if (finalH > maxImgH) {
             finalH = maxImgH
             finalW = finalH / imgRatio
          }
          
          const boxH = finalH + 16

          // Check page boundary
          if (y + boxH > PH - 40) { doc.addPage(); y = 30 }

          // White panel with shadow-like border
          rect(M, y, CONTENT_W, boxH, 255, 255, 255)
          doc.setDrawColor(...NAVY)
          doc.setLineWidth(1)
          doc.rect(M, y, CONTENT_W, boxH)
          // 4px top accent
          rect(M, y, CONTENT_W, 4, ...GOLD)

          const xOffset = M + 4 + (maxImgW - finalW)/2
          doc.addImage(item.chartImageUrl, 'PNG', xOffset, y + 8, finalW, finalH)
          y += boxH + 12
        } catch (e) { 
          console.warn('PDF image error', e)
        }
      } else {
        // Placeholder panel
        rect(M, y, CONTENT_W, 60, 235, 235, 245)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(160, 160, 180)
        doc.text('Visual not available for this analysis', M + CONTENT_W / 2, y + 35, { align: 'center' })
        y += 72
      }

      y += 12

      // ── AI Insight block ──────────────────────────────────────────────
      if (item.insight) {
        if (y > PH - 100) { doc.addPage(); y = 30 }
        // Label
        rect(M, y, 80, 18, ...NAVY)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(255, 255, 255)
        doc.text('AI INSIGHT', M + 8, y + 12)

        y += 22
        rect(M, y, CONTENT_W, 1, ...GOLD)
        y += 8

        // SET FONT FIRST before calculating split lengths!
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        
        const insightLines = doc.splitTextToSize(item.insight, CONTENT_W - 24)
        const insightH = insightLines.length * 13 + 24
        
        if (y + insightH > PH - 40) { doc.addPage(); y = 30 }

        rect(M, y, CONTENT_W, insightH, 250, 248, 235)
        doc.setFillColor(...GOLD)
        doc.rect(M, y, 3, insightH, 'F')
        doc.setTextColor(50, 40, 0)
        doc.text(insightLines, M + 14, y + 15)
        y += insightH + 10
      }

      // ── Detailed Analysis block ───────────────────────────────────────
      if (item.detailedAnalysis && !item.detailedAnalysis.error) {
        const da = item.detailedAnalysis
        
        if (y > PH - 80) { doc.addPage(); y = 30 }
        rect(M, y, 120, 18, ...NAVY)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(255, 255, 255)
        doc.text('DETAILED ANALYSIS', M + 8, y + 12)
        y += 26
        
        const renderSection = (title, content, isList) => {
           if (!content || (isList && content.length === 0)) return
           
           if (y > PH - 60) { doc.addPage(); y = 30 }
           
           doc.setFont('helvetica', 'bold')
           doc.setFontSize(9)
           doc.setTextColor(...NAVY)
           doc.text(title.toUpperCase(), M, y)
           y += 14
           
           doc.setFont('helvetica', 'normal')
           doc.setFontSize(8.5)
           doc.setTextColor(50, 50, 60)
           
           if (isList) {
             content.forEach(bullet => {
                const lines = doc.splitTextToSize(`• ${bullet}`, CONTENT_W - 10)
                if (y + lines.length * 12 > PH - 40) { doc.addPage(); y = 30 }
                doc.text(lines, M, y)
                y += lines.length * 12 + 4
             })
           } else {
             const lines = doc.splitTextToSize(content, CONTENT_W)
             if (y + lines.length * 12 > PH - 40) { doc.addPage(); y = 30 }
             doc.text(lines, M, y)
             y += lines.length * 12 + 4
           }
           y += 8
        }
        
        renderSection('Executive Summary', da.executive_summary, false)
        renderSection('Key Findings', da.key_findings, true)
        renderSection('Trends & Patterns', da.trends, true)
        if (da.anomalies && da.anomalies.length > 0 && da.anomalies[0] !== 'None identified') {
           renderSection('Anomalies', da.anomalies, true)
        }
        renderSection('Recommendations', da.recommendations, true)
        renderSection('Data Quality Notes', da.data_quality_notes, false)
      }

      // ── Data summary table (column names + types) ─────────────────────
      if (item.data?.length > 0) {
        if (y > PH - 100) { doc.addPage(); y = 30 }
        const colKeys = Object.keys(item.data[0])

        // Label
        rect(M, y, 100, 18, ...NAVY)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(255, 255, 255)
        doc.text('DATA SUMMARY', M + 8, y + 12)
        y += 22

        // Top 5 data rows as mini table
        const colW = Math.min(120, CONTENT_W / colKeys.length)
        const rowsToShow = Math.min(5, item.data.length)

        // Header row
        rect(M, y, CONTENT_W, 20, ...NAVY)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(255, 255, 255)
        colKeys.forEach((k, ci) => {
          doc.text(String(k).substring(0, 14).toUpperCase(), M + ci * colW + 6, y + 13, { maxWidth: colW - 8 })
        })
        y += 20

        // Data rows
        for (let ri = 0; ri < rowsToShow; ri++) {
          const rowBg = ri % 2 === 0 ? [255, 255, 255] : [238, 242, 252]
          rect(M, y, CONTENT_W, 18, ...rowBg)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(30, 30, 50)
          colKeys.forEach((k, ci) => {
            const val = String(item.data[ri][k] ?? '').substring(0, 16)
            doc.text(val, M + ci * colW + 6, y + 12, { maxWidth: colW - 8 })
          })
          y += 18
        }
        if (item.data.length > 5) {
          doc.setFontSize(7.5)
          doc.setTextColor(...GRAY)
          doc.text(`+${item.data.length - 5} more rows not shown`, M, y + 10)
          y += 16
        }
        y += 16
      }

      // ── Page footer ───────────────────────────────────────────────────
      rect(0, PH - 36, PW, 36, ...NAVY)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      doc.text('PyroBI · Conversational Business Intelligence', M, PH - 16)
      doc.setTextColor(...GOLD)
      doc.text(`pg. ${idx + 2}`, PW - M, PH - 16, { align: 'right' })
    }

    doc.save(`PyroBI_Report_${new Date().toISOString().slice(0,10)}.pdf`)
  } catch (e) {
    alert('PDF export failed: ' + e.message)
    console.error(e)
  } finally {
    setDownloading(false)
  }
}

// ─── Inline Report Panel (used inside RightSidebar) ────────────────────────
function InlineReportPanel() {
  const { items, removeFromReport, clearReport } = useReportStore()
  const [downloading, setDownloading] = React.useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ width: 40, height: 40, background: 'rgba(13,13,13,0.06)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📋</div>
            <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.4)', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
              No analyses saved yet.<br />
              Click <strong style={{ color: 'var(--bauhaus-black)' }}>"Save to Report"</strong> on any chart or matrix result.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, i) => (
              <div key={item.id} style={{ border: 'var(--bauhaus-border)', boxShadow: '2px 2px 0 var(--bauhaus-black)', background: '#fff', overflow: 'hidden' }}>
                {/* Thumbnail */}
                {item.chartImageUrl ? (
                  <img
                    src={item.chartImageUrl}
                    alt="Visual"
                    style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block', borderBottom: '2px solid var(--bauhaus-black)' }}
                  />
                ) : (
                  <div style={{ height: 40, background: 'rgba(13,13,13,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(13,13,13,0.06)' }}>
                    <span style={{ fontSize: 10, color: 'rgba(13,13,13,0.3)', fontFamily: "'Space Grotesk', sans-serif" }}>NO VISUAL</span>
                  </div>
                )}

                <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--bauhaus-blue)', lineHeight: 1.3 }}>
                      {i + 1}. {item.echartsConfig?.title?.text || item.query?.slice(0, 40) || 'Analysis'}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(13,13,13,0.5)', marginTop: 3, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.data?.length || 0} rows · {item.timestamp}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromReport(item.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--bauhaus-red)', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1, flexShrink: 0 }}
                    title="Remove"
                  >×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action bar at bottom */}
      <div style={{
        padding: '12px 14px', borderTop: 'var(--bauhaus-border)',
        display: 'flex', gap: 8, background: '#fff',
        position: 'sticky', bottom: 0, zIndex: 10,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
      }}>
        <button
          onClick={() => generatePremiumPDF(items, setDownloading)}
          disabled={items.length === 0 || downloading}
          style={{
            flex: 1, padding: '11px 0',
            background: items.length > 0 ? 'var(--bauhaus-red)' : 'rgba(13,13,13,0.08)',
            color: items.length > 0 ? '#fff' : 'rgba(13,13,13,0.3)',
            border: items.length > 0 ? 'var(--bauhaus-border)' : '2px solid transparent',
            boxShadow: items.length > 0 ? '2px 2px 0 var(--bauhaus-black)' : 'none',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: 10,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            cursor: items.length > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          {downloading ? '⏳ Generating...' : '⬇ Download PDF'}
        </button>
        {items.length > 0 && (
          <button
            onClick={clearReport}
            style={{ padding: '11px 12px', background: 'transparent', border: '2px solid rgba(13,13,13,0.15)', cursor: 'pointer', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Default export: NO floating button — only inline panel ────────────────
// The floating button and drawer behavior has been moved fully into RightSidebar.
export default function ReportPanel({ inline }) {
  return inline ? <InlineReportPanel /> : null
}
