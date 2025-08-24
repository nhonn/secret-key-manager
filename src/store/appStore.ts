import { create } from 'zustand'
import type { 
  Secret, 
  CredentialFolder, 
  ApiKey, 
  EnvironmentVariable, 
  DashboardStats,
  SearchFilters 
} from '../types'

interface AppState {
  // Data state
  secrets: Secret[]
  folders: CredentialFolder[]
  apiKeys: ApiKey[]
  envVars: EnvironmentVariable[]
  dashboardStats: DashboardStats | null
  
  // UI state
  isLoading: boolean
  searchFilters: SearchFilters
  selectedFolder: string | null
  
  // Actions - Secrets
  setSecrets: (secrets: Secret[]) => void
  addSecret: (secret: Secret) => void
  updateSecret: (id: string, secret: Partial<Secret>) => void
  removeSecret: (id: string) => void
  
  // Actions - Folders
  setFolders: (folders: CredentialFolder[]) => void
  addFolder: (folder: CredentialFolder) => void
  updateFolder: (id: string, folder: Partial<CredentialFolder>) => void
  removeFolder: (id: string) => void
  
  // Actions - API Keys
  setApiKeys: (apiKeys: ApiKey[]) => void
  addApiKey: (apiKey: ApiKey) => void
  updateApiKey: (id: string, apiKey: Partial<ApiKey>) => void
  removeApiKey: (id: string) => void
  
  // Actions - Environment Variables
  setEnvVars: (envVars: EnvironmentVariable[]) => void
  addEnvVar: (envVar: EnvironmentVariable) => void
  updateEnvVar: (id: string, envVar: Partial<EnvironmentVariable>) => void
  removeEnvVar: (id: string) => void
  
  // Actions - Dashboard
  setDashboardStats: (stats: DashboardStats) => void
  
  // Actions - UI
  setLoading: (loading: boolean) => void
  setSearchFilters: (filters: SearchFilters) => void
  setSelectedFolder: (folderId: string | null) => void
  
  // Utility actions
  clearAllData: () => void
  getFilteredSecrets: () => Secret[]
  getFilteredApiKeys: () => ApiKey[]
  getFilteredEnvVars: () => EnvironmentVariable[]
}

export const useAppStore = create<AppState>()((set, get) => ({
  // Initial state
  secrets: [],
  folders: [],
  apiKeys: [],
  envVars: [],
  dashboardStats: null,
  isLoading: false,
  searchFilters: {
    query: '',
    tags: []
  },
  selectedFolder: null,

  // Secret actions
  setSecrets: (secrets) => set({ secrets }),
  
  addSecret: (secret) => set((state) => ({
    secrets: [...state.secrets, secret]
  })),
  
  updateSecret: (id, updatedSecret) => set((state) => ({
    secrets: state.secrets.map(secret => 
      secret.id === id ? { ...secret, ...updatedSecret } : secret
    )
  })),
  
  removeSecret: (id) => set((state) => ({
    secrets: state.secrets.filter(secret => secret.id !== id)
  })),

  // Folder actions
  setFolders: (folders) => set({ folders }),
  
  addFolder: (folder) => set((state) => ({
    folders: [...state.folders, folder]
  })),
  
  updateFolder: (id, updatedFolder) => set((state) => ({
    folders: state.folders.map(folder => 
      folder.id === id ? { ...folder, ...updatedFolder } : folder
    )
  })),
  
  removeFolder: (id) => set((state) => ({
    folders: state.folders.filter(folder => folder.id !== id)
  })),

  // API Key actions
  setApiKeys: (apiKeys) => set({ apiKeys }),
  
  addApiKey: (apiKey) => set((state) => ({
    apiKeys: [...state.apiKeys, apiKey]
  })),
  
  updateApiKey: (id, updatedApiKey) => set((state) => ({
    apiKeys: state.apiKeys.map(apiKey => 
      apiKey.id === id ? { ...apiKey, ...updatedApiKey } : apiKey
    )
  })),
  
  removeApiKey: (id) => set((state) => ({
    apiKeys: state.apiKeys.filter(apiKey => apiKey.id !== id)
  })),

  // Environment Variable actions
  setEnvVars: (envVars) => set({ envVars }),
  
  addEnvVar: (envVar) => set((state) => ({
    envVars: [...state.envVars, envVar]
  })),
  
  updateEnvVar: (id, updatedEnvVar) => set((state) => ({
    envVars: state.envVars.map(envVar => 
      envVar.id === id ? { ...envVar, ...updatedEnvVar } : envVar
    )
  })),
  
  removeEnvVar: (id) => set((state) => ({
    envVars: state.envVars.filter(envVar => envVar.id !== id)
  })),

  // Dashboard actions
  setDashboardStats: (stats) => set({ dashboardStats: stats }),

  // UI actions
  setLoading: (loading) => set({ isLoading: loading }),
  
  setSearchFilters: (filters) => set({ searchFilters: filters }),
  
  setSelectedFolder: (folderId) => set({ selectedFolder: folderId }),

  // Utility actions
  clearAllData: () => set({
    secrets: [],
    folders: [],
    apiKeys: [],
    envVars: [],
    dashboardStats: null,
    searchFilters: { query: '', tags: [] },
    selectedFolder: null
  }),

  getFilteredSecrets: () => {
    const { secrets, searchFilters, selectedFolder } = get()
    let filtered = secrets

    // Filter by folder
    if (selectedFolder) {
      // For secrets, we don't have folder_id, so this might need adjustment based on your schema
      // filtered = filtered.filter(secret => secret.folder_id === selectedFolder)
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
    const { apiKeys, searchFilters, selectedFolder } = get()
    let filtered = apiKeys

    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter(apiKey => apiKey.folder_id === selectedFolder)
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
    const { envVars, searchFilters, selectedFolder } = get()
    let filtered = envVars

    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter(envVar => envVar.folder_id === selectedFolder)
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