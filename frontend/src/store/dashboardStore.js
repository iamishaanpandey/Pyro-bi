import { create } from 'zustand'
import axios from 'axios'

const useDashboardStore = create((set) => ({
  // Active view state
  activeTab: 'data',       // 'data' | 'query'
  sidebarOpen: false,

  // Table Data State
  tableMeta: null,         // { tableName, columns: [{name, type, description}], rowCount }

  // Query Result State
  chartData: null,
  echartsConfig: null,
  chartType: null,
  insightSummary: null,
  sqlExecuted: null,
  lastQuery: '',    // The user's original NL query text

  // UI State
  isLoading: false,
  error: null,
  
  // Sessions
  sessions: [],
  activeSessionId: null,

  // Dashboard Grid State
  dashboardLayout: [],

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setTableMeta: (meta) => set({ tableMeta: meta }),

  setQueryResult: (result) => set({
    chartData: result.data,
    echartsConfig: result.echarts_config,
    chartType: result.chart_type,
    insightSummary: result.insight_summary,
    sqlExecuted: result.sql_executed,
    error: result.error || null,
    isLoading: false,
  }),

  setLastQuery: (q) => set({ lastQuery: q }),

  addToDashboard: (item) => set((state) => ({
    dashboardLayout: [...state.dashboardLayout, {
      ...item,
      id: crypto.randomUUID(),
      x: (state.dashboardLayout.length * 6) % 12,
      y: Infinity, 
      w: 6,
      h: 4,
    }]
  })),

  removeDashboardItem: (id) => set((state) => ({
    dashboardLayout: state.dashboardLayout.filter(i => i.id !== id)
  })),

  updateDashboardItem: (id, updates) => set((state) => ({
    dashboardLayout: state.dashboardLayout.map(item => 
      item.id === id ? { ...item, ...updates } : item
    )
  })),

  updateDashboardLayout: (layout) => set((state) => {
    const newLayout = state.dashboardLayout.map(item => {
      const l = layout.find(L => L.i === item.id);
      return l ? { ...item, x: l.x, y: l.y, w: l.w, h: l.h } : item;
    });
    return { dashboardLayout: newLayout };
  }),

  setSessions: (sessions) => set({ sessions }),
  fetchSessions: async () => {
    try {
      const res = await axios.get((import.meta.env.VITE_API_BASE_URL || '') + '/sessions')
      set({ sessions: res.data.sessions || [] })
    } catch (e) {
      console.error(e)
    }
  },
  setActiveSession: (id) => set({ activeSessionId: id, activeTab: 'query' }),

  setLoading: (isLoading) => set({ isLoading, error: null }),
  setError: (error) => set({ error, isLoading: false }),

  // Full reset (e.g. on new upload or "Clear Data")
  resetAll: () => set({
    activeTab: 'data',
    tableMeta: null,
    chartData: null,
    echartsConfig: null,
    chartType: null,
    insightSummary: null,
    sqlExecuted: null,
    lastQuery: '',
    dashboardLayout: [],
    error: null,
    isLoading: false,
    activeSessionId: null,
  }),
}))

export default useDashboardStore
