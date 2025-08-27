import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { DashboardService } from '../services/dashboard'
import type { DashboardData } from '../services/dashboard'

interface UseDataLoaderOptions {
  /** Whether to show loading state during initial load */
  showLoading?: boolean
  /** Whether to force refresh data even if already loaded */
  forceRefresh?: boolean
  /** Callback when data loading completes */
  onLoadComplete?: (data: DashboardData) => void
  /** Callback when data loading fails */
  onLoadError?: (error: Error) => void
}

interface UseDataLoaderReturn {
  /** Whether data is currently being loaded */
  isLoading: boolean
  /** Any error that occurred during loading */
  error: string | null
  /** Whether data has been loaded at least once */
  isDataLoaded: boolean
  /** Function to manually refresh data */
  refreshData: () => Promise<void>
  /** Whether data is currently being refreshed */
  isRefreshing: boolean
}

/**
 * Custom hook that ensures all necessary data is loaded into the store
 * before components try to access it. This prevents the empty state issue
 * when navigating directly to pages that depend on store data.
 */
export const useDataLoader = (options: UseDataLoaderOptions = {}): UseDataLoaderReturn => {
  const {
    showLoading = true,
    forceRefresh = false,
    onLoadComplete,
    onLoadError
  } = options

  const { user } = useAuthStore()
  const {
    projects,
    secrets,
    apiKeys,
    envVars,
    setProjects,
    setSecrets,
    setApiKeys,
    setEnvVars,
    setDashboardStats
  } = useAppStore()

  const [isLoading, setIsLoading] = useState(showLoading)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Check if data is already loaded
  const isDataLoaded = projects.length > 0 || secrets.length > 0 || apiKeys.length > 0 || envVars.length > 0 || hasLoadedOnce

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) {
      setError('User not authenticated')
      setIsLoading(false)
      return
    }

    // Skip loading if data is already loaded and not forcing refresh
    if (!forceRefresh && !isRefresh && isDataLoaded) {
      setIsLoading(false)
      return
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      // Load all dashboard data
      const dashboardData = await DashboardService.getDashboardData()
      const dashboardSummary = await DashboardService.getDashboardSummary()

      // Update store with fresh data
      setProjects(dashboardData.projects)
      setSecrets(dashboardData.secrets)
      setApiKeys(dashboardData.apiKeys)
      setEnvVars(dashboardData.environmentVariables)

      // Convert recent items to AccessLog format for recent activity
      const recentActivity = dashboardSummary.recentItems.map(item => ({
        id: `${item.type}_${item.id}`,
        user_id: user.id,
        resource_type: item.type === 'secret' ? 'secrets' : item.type === 'api_key' ? 'api_keys' : 'environment_variables',
        resource_id: item.id,
        action: 'created',
        created_at: item.created_at
      }))

      // Update dashboard statistics
      setDashboardStats({
        totalSecrets: dashboardData.stats.totalSecrets,
        totalApiKeys: dashboardData.stats.totalApiKeys,
        totalEnvVars: dashboardData.stats.totalEnvironmentVariables,
        totalProjects: dashboardData.stats.totalProjects,
        recentActivity
      })

      setHasLoadedOnce(true)
      onLoadComplete?.(dashboardData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      console.error('Data loading error:', err)
      setError(errorMessage)
      onLoadError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user, forceRefresh, isDataLoaded, setProjects, setSecrets, setApiKeys, setEnvVars, setDashboardStats, onLoadComplete, onLoadError])

  const refreshData = useCallback(async () => {
    await loadData(true)
  }, [loadData])

  // Load data on mount or when user changes
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, loadData])

  return {
    isLoading,
    error,
    isDataLoaded: isDataLoaded || hasLoadedOnce,
    refreshData,
    isRefreshing
  }
}

/**
 * Hook specifically for components that need to ensure data is loaded
 * before rendering. This will show a loading state until data is available.
 */
export const useEnsureDataLoaded = (options: Omit<UseDataLoaderOptions, 'showLoading'> = {}) => {
  return useDataLoader({ ...options, showLoading: true })
}

/**
 * Hook for components that want to load data in the background
 * without showing a loading state.
 */
export const useBackgroundDataLoader = (options: Omit<UseDataLoaderOptions, 'showLoading'> = {}) => {
  return useDataLoader({ ...options, showLoading: false })
}