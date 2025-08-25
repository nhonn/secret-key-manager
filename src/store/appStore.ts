import { create } from 'zustand'
import type { Database } from '../types/database'
import type { DashboardStats } from '../types'

type Secret = Database['public']['Tables']['secrets']['Row']
type ApiKey = Database['public']['Tables']['api_keys']['Row']
type EnvironmentVariable = Database['public']['Tables']['environment_variables']['Row']
type Project = Database['public']['Tables']['projects']['Row']

// Event system for real-time updates
type DashboardUpdateEvent = {
  type: 'data_changed'
  entity: 'secrets' | 'apiKeys' | 'envVars' | 'projects'
  action: 'add' | 'update' | 'delete'
  data?: any
}

type EventListener = (event: DashboardUpdateEvent) => void

class DashboardEventEmitter {
  private listeners: EventListener[] = []

  subscribe(listener: EventListener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  emit(event: DashboardUpdateEvent) {
    this.listeners.forEach(listener => listener(event))
  }
}

export const dashboardEvents = new DashboardEventEmitter()

interface AppState {
  // Data state
  secrets: Secret[]
  projects: Project[]
  apiKeys: ApiKey[]
  envVars: EnvironmentVariable[]
  dashboardStats: DashboardStats | null
  
  // UI state
  isLoading: boolean
  searchFilters: { query: string; tags: string[] }
  selectedProject: string | null
  
  // Actions for secrets
  setSecrets: (secrets: Secret[]) => void
  addSecret: (secret: Secret) => void
  updateSecret: (id: string, secret: Partial<Secret>) => void
  removeSecret: (id: string) => void
  
  // Actions for projects
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, project: Partial<Project>) => void
  removeProject: (id: string) => void
  
  // Actions for API keys
  setApiKeys: (apiKeys: ApiKey[]) => void
  addApiKey: (apiKey: ApiKey) => void
  updateApiKey: (id: string, apiKey: Partial<ApiKey>) => void
  removeApiKey: (id: string) => void
  
  // Actions for environment variables
  setEnvVars: (envVars: EnvironmentVariable[]) => void
  addEnvVar: (envVar: EnvironmentVariable) => void
  updateEnvVar: (id: string, envVar: Partial<EnvironmentVariable>) => void
  removeEnvVar: (id: string) => void
  
  // Actions for dashboard
  setDashboardStats: (stats: DashboardStats) => void
  
  // Actions for UI
  setLoading: (loading: boolean) => void
  setSearchFilters: (filters: { query: string; tags: string[] }) => void
  setSelectedProject: (projectId: string | null) => void
  
  // Utility actions
  clearAllData: () => void
  getFilteredSecrets: () => Secret[]
  getFilteredApiKeys: () => ApiKey[]
  getFilteredEnvVars: () => EnvironmentVariable[]
}

export const useAppStore = create<AppState>()((set, get) => ({
  // Initial state
  secrets: [],
  projects: [],
  apiKeys: [],
  envVars: [],
  dashboardStats: null,
  isLoading: false,
  searchFilters: {
    query: '',
    tags: []
  },
  selectedProject: null,

  // Actions for secrets
  setSecrets: (secrets) => set({ secrets }),
  addSecret: (secret) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'secrets', action: 'add', data: secret })
    return { secrets: [secret, ...state.secrets] }
  }),
  updateSecret: (id, secret) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'secrets', action: 'update', data: { id, ...secret } })
    return { secrets: state.secrets.map(s => s.id === id ? { ...s, ...secret } : s) }
  }),
  removeSecret: (id) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'secrets', action: 'delete', data: { id } })
    return { secrets: state.secrets.filter(secret => secret.id !== id) }
  }),

  // Actions for projects
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'projects', action: 'add', data: project })
    return { projects: [project, ...state.projects] }
  }),
  updateProject: (id, project) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'projects', action: 'update', data: { id, ...project } })
    return { projects: state.projects.map(p => p.id === id ? { ...p, ...project } : p) }
  }),
  removeProject: (id) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'projects', action: 'delete', data: { id } })
    return { projects: state.projects.filter(project => project.id !== id) }
  }),

  // Actions for API keys
  setApiKeys: (apiKeys) => set({ apiKeys }),
  addApiKey: (apiKey) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'apiKeys', action: 'add', data: apiKey })
    return { apiKeys: [apiKey, ...state.apiKeys] }
  }),
  updateApiKey: (id, apiKey) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'apiKeys', action: 'update', data: { id, ...apiKey } })
    return { apiKeys: state.apiKeys.map(key => key.id === id ? { ...key, ...apiKey } : key) }
  }),
  removeApiKey: (id) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'apiKeys', action: 'delete', data: { id } })
    return { apiKeys: state.apiKeys.filter(apiKey => apiKey.id !== id) }
  }),

  // Actions for environment variables
  setEnvVars: (envVars) => set({ envVars }),
  addEnvVar: (envVar) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'envVars', action: 'add', data: envVar })
    return { envVars: [envVar, ...state.envVars] }
  }),
  updateEnvVar: (id, envVar) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'envVars', action: 'update', data: { id, ...envVar } })
    return { envVars: state.envVars.map(env => env.id === id ? { ...env, ...envVar } : env) }
  }),
  removeEnvVar: (id) => set((state) => {
    dashboardEvents.emit({ type: 'data_changed', entity: 'envVars', action: 'delete', data: { id } })
    return { envVars: state.envVars.filter(envVar => envVar.id !== id) }
  }),

  // Dashboard actions
  setDashboardStats: (stats) => set({ dashboardStats: stats }),

  // UI actions
  setLoading: (loading) => set({ isLoading: loading }),
  
  setSearchFilters: (filters) => set({ searchFilters: filters }),
  
  setSelectedProject: (projectId) => set({ selectedProject: projectId }),

  // Utility actions
  clearAllData: () => set({
    secrets: [],
    projects: [],
    apiKeys: [],
    envVars: [],
    dashboardStats: null,
    searchFilters: { query: '', tags: [] },
    selectedProject: null
  }),

  getFilteredSecrets: () => {
    const { secrets, searchFilters, selectedProject } = get()
    let filtered = secrets

    // Filter by project
    if (selectedProject) {
      // For secrets, we don't have project_id, so this might need adjustment based on your schema
      // filtered = filtered.filter(secret => secret.project_id === selectedProject)
    }

    // Filter by search query
    if (searchFilters.query) {
      const query = searchFilters.query.toLowerCase()
      filtered = filtered.filter(secret => 
        secret.name.toLowerCase().includes(query) ||
        secret.description?.toLowerCase().includes(query) ||
        secret.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Filter by tags
    if (searchFilters.tags.length > 0) {
      filtered = filtered.filter(secret => 
        secret.tags?.some(tag => searchFilters.tags.includes(tag))
      )
    }

    return filtered
  },

  getFilteredApiKeys: () => {
    const { apiKeys, searchFilters, selectedProject } = get()
    let filtered = apiKeys

    // Filter by project
    if (selectedProject) {
      filtered = filtered.filter(apiKey => apiKey.project_id === selectedProject)
    }

    // Filter by search query
    if (searchFilters.query) {
      const query = searchFilters.query.toLowerCase()
      filtered = filtered.filter(apiKey => 
        apiKey.name.toLowerCase().includes(query) ||
        apiKey.service?.toLowerCase().includes(query) ||
        apiKey.description?.toLowerCase().includes(query)
      )
    }

    return filtered
  },

  getFilteredEnvVars: () => {
    const { envVars, searchFilters, selectedProject } = get()
    let filtered = envVars

    // Filter by project
    if (selectedProject) {
      filtered = filtered.filter(envVar => envVar.project_id === selectedProject)
    }

    // Filter by search query
    if (searchFilters.query) {
      const query = searchFilters.query.toLowerCase()
      filtered = filtered.filter(envVar => 
        envVar.name.toLowerCase().includes(query) ||
        envVar.environment?.toLowerCase().includes(query) ||
        envVar.description?.toLowerCase().includes(query)
      )
    }

    return filtered
  }
}))