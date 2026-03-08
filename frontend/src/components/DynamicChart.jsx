import React, { useRef, useImperativeHandle, forwardRef } from 'react'
import ReactECharts from 'echarts-for-react'

// Map Bauhaus palette to ECharts color array (default if none provided)
const DEFAULT_COLORS = ['#D62828', '#1B4FCC', '#F7B731', '#16A34A', '#7C3AED', '#0891B2', '#EA580C', '#0D0D0D']

const DynamicChart = forwardRef(function DynamicChart({ echartsConfig, colors }, ref) {
  const chartRef = useRef(null)

  // Expose getDataURL so ReportPanel can capture chart as image
  useImperativeHandle(ref, () => ({
    getDataURL: () => {
      const instance = chartRef.current?.getEchartsInstance()
      if (instance) {
        return instance.getDataURL({ type: 'png', backgroundColor: '#fff', pixelRatio: 2 })
      }
      return null
    }
  }))

  if (!echartsConfig) return null

  // Ensure our Bauhaus colors are applied globally to the chart
  const finalConfig = {
    color: colors || DEFAULT_COLORS,
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif"
    },
    ...echartsConfig
  }

  // Fix grid padding to prevent legend/slicer overlap
  // dataZoom slider takes ~60px at bottom, legend needs ~40px
  const hasDataZoom = !!finalConfig.dataZoom
  const hasLegend   = !!finalConfig.legend
  const gridBottom  = hasDataZoom && hasLegend ? 110 : hasDataZoom ? 70 : hasLegend ? 50 : 30
  finalConfig.grid = { ...finalConfig.grid, bottom: gridBottom, left: 60, right: 20, containLabel: false }

  // Push legend above dataZoom if both present
  if (hasLegend && hasDataZoom) {
    finalConfig.legend = {
      ...finalConfig.legend,
      bottom: 70,     // sits above dataZoom
      left: 'center',
    }
  }

  // Force sharp corners for Bauhaus style on bar charts and strip hardcoded colors
  if (finalConfig.series) {
    // Standardize to array
    const seriesArr = Array.isArray(finalConfig.series) ? finalConfig.series : [finalConfig.series]
    
    finalConfig.series = seriesArr.map(s => {
      // Strip out hardcoded itemStyle color so the palette works
      if (s.itemStyle && s.itemStyle.color) {
        delete s.itemStyle.color
      }
      
      if (s.type === 'bar') {
        return {
          ...s,
          itemStyle: {
            ...s.itemStyle,
            borderRadius: 0, 
            borderColor: '#0D0D0D',
            borderWidth: 1
          }
        }
      }
      return s
    })
  }

  return (
    <div className="w-full relative animate-fade-in">
      <ReactECharts
        ref={chartRef}
        option={finalConfig}
        notMerge={true}
        lazyUpdate={true}
        style={{ height: 420, width: '100%' }}
        opts={{ renderer: 'canvas' }}  // canvas needed for getDataURL screenshot
      />
    </div>
  )
})

export default DynamicChart
