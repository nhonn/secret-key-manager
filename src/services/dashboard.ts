import { supabase } from '../lib/supabase'
import { queryCache, CacheKeys, withCache } from '../lib/cache'
import { withPerformanceMonitoring, performanceMonitor } from '../lib/performance'
import type { Database } from '../types/database'

type Project = Database['public']['Tables']['projects']['Row']
type Secret = Database['public']['Tables']['secrets']['Row']
type ApiKey = Database['public']['Tables']['api_keys']['Row']
type EnvironmentVariable = Database['public']['Tables']['environment_variables']['Row']

export interface DashboardData {
  projects: Project[]
  secrets: Secret[]
  apiKeys: ApiKey[]
  environmentVariables: EnvironmentVariable[]
  stats: {
    totalProjects: number
    totalSecrets: number
    totalApiKeys: number
    totalEnvironmentVariables: number
    recentActivity: number
  }
}

export interface DashboardSummary {
  projects: Array<{
    id: string
    name: string
    color: string
    secretCount: number
    apiKeyCount: number
    envVarCount: number
  }>
  recentItems: Array<{
    id: string
    name: string
    type: 'secret' | 'api_key' | 'env_var'
    project_id: string
    created_at: string
  }>
  stats: {
    totalProjects: number
    totalSecrets: number
    totalApiKeys: number
    totalEnvironmentVariables: number
    recentActivity: number
  }
}

export class DashboardService {
  /**
   * Fetches all dashboard data in a single optimized call with caching
   */
  static async getDashboardData(): Promise<DashboardData> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const userId = user.user.id
    const cacheKey = CacheKeys.dashboardData(userId)
    
    // Try to get from cache first
    const cached = queryCache.get<DashboardData>(cacheKey)
    if (cached) {
      // Record cache hit
      performanceMonitor.recordQuery({
        queryName: 'getDashboardData',
        duration: 0,
        userId,
        cacheHit: true
      })
      return cached
    }

    // Fetch fresh data with performance monitoring
    const result = await withPerformanceMonitoring(
      'getDashboardData',
      () => this._fetchDashboardDataUncached(),
      { trackParameters: false, trackResultCount: true }
    )()
    
    // Cache the result for 2 minutes
    queryCache.set(cacheKey, result, 2 * 60 * 1000)
    
    return result
  }

  /**
   * Internal method to fetch dashboard data without caching
   */
  private static async _fetchDashboardDataUncached(): Promise<DashboardData> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const userId = user.user.id

      // Execute all queries in parallel for better performance
      const [projectsResult, secretsResult, apiKeysResult, envVarsResult] = await Promise.all([
        // Projects with all fields
        supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),

        // Secrets with all fields
        supabase
          .from('secrets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),

        // API Keys with all fields
        supabase
          .from('api_keys')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),

        // Environment Variables with all fields
        supabase
          .from('environment_variables')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ])

      // Check for errors
      if (projectsResult.error) {
        console.error('Error fetching projects:', projectsResult.error)
        throw new Error(`Failed to fetch projects: ${projectsResult.error.message}`)
      }
      if (secretsResult.error) {
        console.error('Error fetching secrets:', secretsResult.error)
        throw new Error(`Failed to fetch secrets: ${secretsResult.error.message}`)
      }
      if (apiKeysResult.error) {
        console.error('Error fetching API keys:', apiKeysResult.error)
        throw new Error(`Failed to fetch API keys: ${apiKeysResult.error.message}`)
      }
      if (envVarsResult.error) {
        console.error('Error fetching environment variables:', envVarsResult.error)
        throw new Error(`Failed to fetch environment variables: ${envVarsResult.error.message}`)
      }

      const projects = projectsResult.data || []
      const secrets = secretsResult.data || []
      const apiKeys = apiKeysResult.data || []
      const environmentVariables = envVarsResult.data || []

      // Calculate recent activity (items created in last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentThreshold = sevenDaysAgo.toISOString()

      const recentActivity = [
        ...secrets.filter(s => s.created_at >= recentThreshold),
        ...apiKeys.filter(k => k.created_at >= recentThreshold),
        ...environmentVariables.filter(v => v.created_at >= recentThreshold)
      ].length

      return {
        projects,
        secrets,
        apiKeys,
        environmentVariables,
        stats: {
          totalProjects: projects.length,
          totalSecrets: secrets.length,
          totalApiKeys: apiKeys.length,
          totalEnvironmentVariables: environmentVariables.length,
          recentActivity
        }
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error)
      throw error
    }
  }

  /**
   * Fetches optimized dashboard summary with aggregated counts and caching
   */
  static async getDashboardSummary(): Promise<DashboardSummary> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const userId = user.user.id
    const cacheKey = CacheKeys.dashboardSummary(userId)
    
    // Try to get from cache first
    const cached = queryCache.get<DashboardSummary>(cacheKey)
    if (cached) {
      // Record cache hit
      performanceMonitor.recordQuery({
        queryName: 'getDashboardSummary',
        duration: 0,
        userId,
        cacheHit: true
      })
      return cached
    }

    // Fetch fresh data with performance monitoring
    const result = await withPerformanceMonitoring(
      'getDashboardSummary',
      () => this._fetchDashboardSummaryUncached(userId),
      { trackParameters: false, trackResultCount: true }
    )()
    
    // Cache the result for 3 minutes
    queryCache.set(cacheKey, result, 3 * 60 * 1000)
    
    return result
  }

  /**
   * Internal method to fetch dashboard summary without caching
   */
  private static async _fetchDashboardSummaryUncached(userId: string): Promise<DashboardSummary> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      // Use the passed userId parameter instead of redeclaring

      // Fallback to individual queries since RPC functions don't exist
      return this.getDashboardSummaryFallback(userId)


    } catch (error) {
      console.error('Dashboard summary fetch error:', error)
      throw error
    }
  }

  /**
   * Invalidate dashboard cache for a user
   */
  static invalidateCache(userId: string): void {
    queryCache.invalidate(CacheKeys.dashboardData(userId))
    queryCache.invalidate(CacheKeys.dashboardSummary(userId))
  }

  /**
   * Force refresh dashboard data (bypasses cache)
   */
  static async refreshDashboardData(): Promise<DashboardData> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const userId = user.user.id
    
    // Invalidate cache first
    this.invalidateCache(userId)
    
    // Fetch fresh data
    return this.getDashboardData()
  }

  /**
   * Fallback method for dashboard summary when RPC functions are not available
   */
  private static async getDashboardSummaryFallback(userId: string): Promise<DashboardSummary> {
    const [projectsResult, secretsResult, apiKeysResult, envVarsResult] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, color')
        .eq('user_id', userId),
      
      supabase
        .from('secrets')
        .select('id, name, encrypted_value, project_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('api_keys')
        .select('id, name, project_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('environment_variables')
        .select('id, name, encrypted_value, project_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    const projects = projectsResult.data || []
    const secrets = secretsResult.data || []
    const apiKeys = apiKeysResult.data || []
    const environmentVariables = envVarsResult.data || []

    // Calculate counts per project
    const projectsWithCounts = projects.map(project => {
      const secretCount = secrets.filter(s => s.project_id === project.id).length
      const apiKeyCount = apiKeys.filter(k => k.project_id === project.id).length
      const envVarCount = environmentVariables.filter(v => v.project_id === project.id).length
      
      return {
        id: project.id,
        name: project.name,
        color: project.color,
        secretCount,
        apiKeyCount,
        envVarCount
      }
    })

    // Combine and sort recent items
    const recentItems = [
      ...secrets.map(s => ({ ...s, type: 'secret' as const })),
      ...apiKeys.map(k => ({ ...k, type: 'api_key' as const })),
      ...environmentVariables.map(v => ({ ...v, type: 'env_var' as const }))
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    // Calculate recent activity
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentThreshold = sevenDaysAgo.toISOString()
    const recentActivity = recentItems.filter(item => item.created_at >= recentThreshold).length

    return {
      projects: projectsWithCounts,
      recentItems,
      stats: {
        totalProjects: projects.length,
        totalSecrets: secrets.length,
        totalApiKeys: apiKeys.length,
        totalEnvironmentVariables: environmentVariables.length,
        recentActivity
      }
    }
  }
}