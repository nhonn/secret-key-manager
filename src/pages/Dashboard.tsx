import {
  ClockIcon,
  CogIcon,
  EyeIcon,
  KeyIcon,
  PlusIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ServerIcon
} from '@heroicons/react/24/outline'
import { AlertCircle, RefreshCw } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AddApiKeyForm } from '../components/AddApiKeyForm'
import { AddEnvironmentVariableForm } from '../components/AddEnvironmentVariableForm'
import { AddSecretForm } from '../components/AddSecretForm'
import { CreateProjectForm } from '../components/CreateProjectForm'
import { DashboardService } from '../services/dashboard'
import { dashboardEvents, useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import type { DashboardStats } from '../types'

const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  const { 
    dashboardStats, 
    setDashboardStats, 
    secrets, 
    apiKeys, 
    envVars, 
    projects,
    setSecrets,
    setApiKeys,
    setEnvVars
  } = useAppStore()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)
  
  // Quick action states
  const [quickActionLoading, setQuickActionLoading] = useState<Record<string, boolean>>({})
  const [quickActionSuccess, setQuickActionSuccess] = useState<Record<string, boolean>>({})
  
  // Modal states
  const [showAddSecretModal, setShowAddSecretModal] = useState(false)
  const [showAddApiKeyModal, setShowAddApiKeyModal] = useState(false)
  const [showAddEnvVarModal, setShowAddEnvVarModal] = useState(false)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  
  // Performance optimization: debouncing and caching
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<number>(0)
  const DEBOUNCE_DELAY = 1000 // 1 second
  const MIN_FETCH_INTERVAL = 5000 // 5 seconds minimum between fetches

  // Fetch real-time data using optimized dashboard service
  const fetchDashboardData = useCallback(async (showToast = false, force = false) => {
    const now = Date.now()
    
    // Performance optimization: prevent excessive API calls
    if (!force && (isRefreshing || (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL))) {
      console.log('Skipping fetch due to rate limiting')
      return
    }
    
    try {
      setIsRefreshing(true)
      setError(null)
      lastFetchTimeRef.current = now
      
      // Use optimized dashboard service for single API call
      const dashboardData = await DashboardService.getDashboardData()
      const dashboardSummary = await DashboardService.getDashboardSummary()

      // Update store with fresh data
      setSecrets(dashboardData.secrets)
      setApiKeys(dashboardData.apiKeys)
      setEnvVars(dashboardData.environmentVariables)

      // Convert recent items to AccessLog format for recent activity
      const recentActivity = dashboardSummary.recentItems.map(item => ({
        id: `${item.type}_${item.id}`,
        user_id: user?.id || '',
        resource_type: item.type === 'secret' ? 'secrets' : item.type === 'api_key' ? 'api_keys' : 'environment_variables',
        resource_id: item.id,
        action: 'created',
        created_at: item.created_at
      }))

      // Update dashboard statistics
      const stats: DashboardStats = {
        totalSecrets: dashboardData.stats.totalSecrets,
        totalApiKeys: dashboardData.stats.totalApiKeys,
        totalEnvVars: dashboardData.stats.totalEnvironmentVariables,
        totalProjects: dashboardData.stats.totalProjects,
        recentActivity
      }
      setDashboardStats(stats)
      setLastRefresh(new Date())

      if (showToast) {
        toast.success('Dashboard data refreshed successfully')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      if (showToast) {
        toast.error('Failed to refresh dashboard data')
      }
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }, [setSecrets, setApiKeys, setEnvVars, setDashboardStats, projects.length, isRefreshing])

  // Auto-refresh mechanism
  useEffect(() => {
    // Initial data fetch
    fetchDashboardData()

    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchDashboardData()
    }, 30000)

    // Listen to dashboard events for real-time updates with debouncing
    const unsubscribe = dashboardEvents.subscribe((event) => {
      console.log('Dashboard event received:', event)
      
      // Clear existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      
      // Debounce the refresh to prevent excessive API calls
      debounceTimeoutRef.current = setTimeout(() => {
        fetchDashboardData()
      }, DEBOUNCE_DELAY)
    })

    return () => {
      clearInterval(refreshInterval)
      unsubscribe()
    }
  }, [fetchDashboardData])

  // Manual refresh handler with cache invalidation
   const handleManualRefresh = useCallback(async () => {
     try {
       setIsRefreshing(true)
       setError(null)
       
       // Force refresh by bypassing cache
       const data = await DashboardService.refreshDashboardData()
       const dashboardSummary = await DashboardService.getDashboardSummary()
       
       // Update store with fresh data
       setSecrets(data.secrets)
       setApiKeys(data.apiKeys)
       setEnvVars(data.environmentVariables)
 
       // Convert recent items to AccessLog format for recent activity
       const recentActivity = dashboardSummary.recentItems.map(item => ({
         id: `${item.type}_${item.id}`,
         user_id: user?.id || '',
         resource_type: item.type === 'secret' ? 'secrets' : item.type === 'api_key' ? 'api_keys' : 'environment_variables',
         resource_id: item.id,
         action: 'created',
         created_at: item.created_at
       }))
 
       // Update dashboard statistics
       const stats: DashboardStats = {
         totalSecrets: data.stats.totalSecrets,
         totalApiKeys: data.stats.totalApiKeys,
         totalEnvVars: data.stats.totalEnvironmentVariables,
         totalProjects: data.stats.totalProjects,
         recentActivity
       }
       setDashboardStats(stats)
       setLastRefresh(new Date())
       
       toast.success('Dashboard refreshed successfully')
     } catch (err) {
       console.error('Failed to refresh dashboard data:', err)
       const errorMessage = err instanceof Error ? err.message : 'Failed to refresh dashboard data'
       setError(errorMessage)
       toast.error('Failed to refresh dashboard')
     } finally {
       setIsRefreshing(false)
     }
   }, [setSecrets, setApiKeys, setEnvVars, setDashboardStats])

  // Quick action handlers
  const handleQuickAction = useCallback(async (actionId: string, actionFn: () => Promise<void>) => {
    setQuickActionLoading(prev => ({ ...prev, [actionId]: true }))
    setQuickActionSuccess(prev => ({ ...prev, [actionId]: false }))
    
    try {
      await actionFn()
      setQuickActionSuccess(prev => ({ ...prev, [actionId]: true }))
      
      // Clear success state after 2 seconds
      setTimeout(() => {
        setQuickActionSuccess(prev => ({ ...prev, [actionId]: false }))
      }, 2000)
      
      // Refresh dashboard stats
      fetchDashboardData()
    } catch (err) {
      console.error(`Quick action ${actionId} failed:`, err)
      toast.error(`Failed to ${actionId.replace('-', ' ')}`)
    } finally {
      setQuickActionLoading(prev => ({ ...prev, [actionId]: false }))
    }
  }, [fetchDashboardData])

  const openAddSecretModal = useCallback(() => {
    setShowAddSecretModal(true)
  }, [])

  const openAddApiKeyModal = useCallback(() => {
    setShowAddApiKeyModal(true)
  }, [])

  const openAddEnvVarModal = useCallback(() => {
    setShowAddEnvVarModal(true)
  }, [])

  const openCreateProjectModal = useCallback(() => {
    setShowCreateProjectModal(true)
  }, [])

  const handleModalSuccess = useCallback(() => {
    fetchDashboardData()
  }, [fetchDashboardData])
  
  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const quickActions = [
    {
      id: 'add-secret',
      name: 'Add Secret',
      description: 'Store a new secret securely',
      icon: ShieldCheckIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: openAddSecretModal
    },
    {
      id: 'add-api-key',
      name: 'Add API Key',
      description: 'Save a new API key',
      icon: KeyIcon,
      color: 'bg-green-500 hover:bg-green-600',
      action: openAddApiKeyModal
    },
    {
      id: 'add-env-var',
      name: 'Add Environment Variable',
      description: 'Store environment configuration',
      icon: CogIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: openAddEnvVarModal
    },
    {
      id: 'create-project',
      name: 'Create Project',
      description: 'Organize your credentials',
      icon: RectangleStackIcon,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: openCreateProjectModal
    }
  ]

  const statCards = [
    {
      name: 'Total Secrets',
      value: dashboardStats?.totalSecrets || 0,
      icon: ShieldCheckIcon,
      color: 'text-blue-600 bg-blue-100',
      href: '/secrets'
    },
    {
      name: 'API Keys',
      value: dashboardStats?.totalApiKeys || 0,
      icon: KeyIcon,
      color: 'text-green-600 bg-green-100',
      href: '/credentials/api-keys'
    },
    {
      name: 'Environment Variables',
      value: dashboardStats?.totalEnvVars || 0,
      icon: CogIcon,
      color: 'text-purple-600 bg-purple-100',
      href: '/credentials/env-vars'
    },
    {
      name: 'Projects',
      value: dashboardStats?.totalProjects || 0,
      icon: RectangleStackIcon,
      color: 'text-orange-600 bg-orange-100',
      href: '/projects'
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}!
              </h1>
              <p className="mt-2 text-gray-600">
                Here&apos;s an overview of your secure credential management.
              </p>
              {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {lastRefresh ? (
                  <>
                    Last updated: {lastRefresh.toLocaleTimeString()}
                    {isRefreshing && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-blue-600">Updating...</span>
                      </div>
                    )}
                  </>
                ) : (
                  'Loading...' 
                )}
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.name}
                to={card.href}
                className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200 relative"
              >
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{card.name}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                <p className="text-sm text-gray-600">Get started with common tasks</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickActions.map((action) => {
                     const Icon = action.icon
                     return (
                       <button
                         key={action.name}
                         onClick={action.action}
                         className="group relative bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left w-full"
                       >
                         <div className="flex items-center space-x-4">
                           <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${action.color} transition-colors duration-200`}>
                             <Icon className="w-6 h-6" />
                           </div>
                           <div className="flex-1">
                             <h3 className="text-lg font-semibold text-gray-900">{action.name}</h3>
                             <p className="text-sm text-gray-600">{action.description}</p>
                           </div>
                           <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                         </div>
                       </button>
                     )
                   })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-600">Your latest actions</p>
              </div>
              <div className="p-6">
                {dashboardStats?.recentActivity && dashboardStats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardStats.recentActivity.slice(0, 5).map((activity, index) => {
                      // Get activity-specific icon and color
                      const getActivityIcon = (resourceType: string) => {
                        switch (resourceType) {
                          case 'secrets':
                            return { icon: ShieldCheckIcon, color: 'bg-blue-100 text-blue-600' }
                          case 'api_keys':
                            return { icon: KeyIcon, color: 'bg-green-100 text-green-600' }
                          case 'environment_variables':
                            return { icon: ServerIcon, color: 'bg-purple-100 text-purple-600' }
                          default:
                            return { icon: DocumentTextIcon, color: 'bg-gray-100 text-gray-600' }
                        }
                      }

                      // Get human-readable resource name
                      const getResourceName = (resourceType: string) => {
                        switch (resourceType) {
                          case 'secrets':
                            return 'Secret'
                          case 'api_keys':
                            return 'API Key'
                          case 'environment_variables':
                            return 'Environment Variable'
                          default:
                            return 'Item'
                        }
                      }

                      // Format timestamp with relative time
                      const getRelativeTime = (dateString: string) => {
                        const date = new Date(dateString)
                        const now = new Date()
                        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
                        
                        if (diffInMinutes < 1) return 'Just now'
                        if (diffInMinutes < 60) return `${diffInMinutes}m ago`
                        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
                        if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
                        return date.toLocaleDateString()
                      }

                      const { icon: ActivityIcon, color } = getActivityIcon(activity.resource_type)
                      const resourceName = getResourceName(activity.resource_type)
                      const relativeTime = getRelativeTime(activity.created_at)

                      return (
                        <div key={activity.id || index} className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
                            <ActivityIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">
                              Created new {resourceName}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {relativeTime}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-sm font-medium text-gray-900">No recent activity</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Start by creating secrets, API keys, or environment variables to see your activity here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <ShieldCheckIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Your Data is Secure</h3>
              <p className="text-sm text-blue-700 mt-1">
                All your secrets are encrypted client-side using AES-256-GCM encryption before being stored. 
                We use zero-knowledge architecture, which means we never have access to your unencrypted data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Modals */}
      <AddSecretForm
        isOpen={showAddSecretModal}
        onClose={() => setShowAddSecretModal(false)}
        onSuccess={handleModalSuccess}
      />
      
      <AddApiKeyForm
        isOpen={showAddApiKeyModal}
        onClose={() => setShowAddApiKeyModal(false)}
        onSuccess={handleModalSuccess}
      />
      
      <AddEnvironmentVariableForm
        isOpen={showAddEnvVarModal}
        onClose={() => setShowAddEnvVarModal(false)}
        onSuccess={handleModalSuccess}
      />
      
      <CreateProjectForm
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}

export default Dashboard