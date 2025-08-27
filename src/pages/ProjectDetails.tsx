import {
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ServerIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { AlertCircle, Copy, Search, Shield, Clock, User, Filter } from 'lucide-react'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { useEnsureDataLoaded } from '../hooks/useDataLoader'
import { EncryptionService } from '../services/encryption'
import type { DecryptedSecret, DecryptedApiKey, DecryptedEnvironmentVariable, Project, AccessLog } from '../types'

interface ProjectDetailsProps {
  projectId?: string
}

type SecurityLevel = 'low' | 'medium' | 'high' | 'critical'
type ItemType = 'secret' | 'apiKey' | 'envVar'

interface SecurityItem {
  id: string
  name: string
  type: ItemType
  value: string
  description?: string
  tags?: string[]
  securityLevel: SecurityLevel
  lastUpdated: string
  accessCount: number
  expiresAt?: string
  environment?: string
  service?: string
  url?: string
  username?: string
  projectId?: string
}

interface SearchFilters {
  query: string
  type: ItemType | 'all'
  securityLevel: SecurityLevel | 'all'
  tags: string[]
  environment: string
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ projectId: propProjectId }) => {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>()
  const projectId = propProjectId || paramProjectId
  
  const { user } = useAuthStore()
  const { projects, secrets, apiKeys, envVars } = useAppStore()
  
  // Use data loader to ensure store data is available
  const { isLoading: dataLoading, error: dataError, isDataLoaded } = useEnsureDataLoaded({
    onLoadError: (error) => {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load project data')
    }
  })
  
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [decryptedItems, setDecryptedItems] = useState<SecurityItem[]>([])
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set())
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
    securityLevel: 'all',
    tags: [],
    environment: ''
  })
  const [expandedSections, setExpandedSections] = useState<Set<ItemType>>(new Set(['secret', 'apiKey', 'envVar']))
  const [showFilters, setShowFilters] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AccessLog[]>([])

  // Security level determination
  const getSecurityLevel = useCallback((item: DecryptedSecret | DecryptedApiKey | DecryptedEnvironmentVariable, type: ItemType): SecurityLevel => {
    // Critical: API keys with admin/root access, production secrets
    if (type === 'apiKey' && (item.name.toLowerCase().includes('admin') || item.name.toLowerCase().includes('root'))) {
      return 'critical'
    }
    if (type === 'secret' && item.tags?.some(tag => tag.toLowerCase().includes('production'))) {
      return 'critical'
    }
    if (type === 'envVar' && 'environment' in item && item.environment === 'production') {
      return 'critical'
    }
    
    // High: Database credentials, auth tokens
    if (item.name.toLowerCase().includes('password') || item.name.toLowerCase().includes('token') || item.name.toLowerCase().includes('key')) {
      return 'high'
    }
    
    // Medium: API endpoints, configuration values
    if (type === 'envVar' || item.name.toLowerCase().includes('url') || item.name.toLowerCase().includes('endpoint')) {
      return 'medium'
    }
    
    return 'low'
  }, [])

  // Load project data
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId || !user || !isDataLoaded) return
      
      try {
        setIsDecrypting(true)
        setError(null)
        
        // Find project
        const foundProject = projects.find(p => p.id === projectId)
        if (!foundProject) {
          throw new Error('Project not found')
        }
        setProject(foundProject)
        
        // Decrypt and process all items for this project
        const items: SecurityItem[] = []
        
        // Process secrets
        const projectSecrets = secrets.filter(s => s.project_id === projectId)
        for (const secret of projectSecrets) {
          try {
            const decrypted = await EncryptionService.decryptSecret(secret)
            items.push({
              id: secret.id,
              name: secret.name,
              type: 'secret',
              value: decrypted.value,
              description: secret.description,
              tags: secret.tags,
              securityLevel: getSecurityLevel(decrypted, 'secret'),
              lastUpdated: secret.updated_at,
              accessCount: secret.access_count,
              expiresAt: secret.expires_at,
              url: secret.url,
              username: secret.username,
              projectId: secret.project_id
            })
          } catch (err) {
            console.error('Failed to decrypt secret:', secret.id, err)
          }
        }
        
        // Process API keys
        const projectApiKeys = apiKeys.filter(k => k.project_id === projectId)
        for (const apiKey of projectApiKeys) {
          try {
            const decrypted = await EncryptionService.decryptApiKey(apiKey)
            items.push({
              id: apiKey.id,
              name: apiKey.name,
              type: 'apiKey',
              value: decrypted.key,
              description: apiKey.description,
              tags: apiKey.tags,
              securityLevel: getSecurityLevel(decrypted, 'apiKey'),
              lastUpdated: apiKey.updated_at,
              accessCount: apiKey.access_count,
              expiresAt: apiKey.expires_at,
              service: apiKey.service,
              url: apiKey.url,
              projectId: apiKey.project_id
            })
          } catch (err) {
            console.error('Failed to decrypt API key:', apiKey.id, err)
          }
        }
        
        // Process environment variables
        const projectEnvVars = envVars.filter(e => e.project_id === projectId)
        for (const envVar of projectEnvVars) {
          try {
            const decrypted = await EncryptionService.decryptEnvironmentVariable(envVar)
            items.push({
              id: envVar.id,
              name: envVar.name,
              type: 'envVar',
              value: decrypted.value,
              description: envVar.description,
              tags: envVar.tags,
              securityLevel: getSecurityLevel(decrypted, 'envVar'),
              lastUpdated: envVar.updated_at,
              accessCount: 0, // EnvVars don't track access count
              environment: envVar.environment,
              projectId: envVar.project_id
            })
          } catch (err) {
            console.error('Failed to decrypt environment variable:', envVar.id, err)
          }
        }
        
        setDecryptedItems(items)
        
        // Load audit logs (mock for now - would come from actual audit service)
        const mockAuditLogs: AccessLog[] = items.slice(0, 5).map(item => ({
          id: `audit_${item.id}`,
          user_id: user.id,
          resource_type: item.type === 'secret' ? 'secrets' : item.type === 'apiKey' ? 'api_keys' : 'environment_variables',
          resource_id: item.id,
          action: 'viewed',
          created_at: new Date(Date.now() - Math.random() * 86400000).toISOString()
        }))
        setAuditLogs(mockAuditLogs)
        
      } catch (err) {
        console.error('Error loading project data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load project data')
      } finally {
        setIsDecrypting(false)
      }
    }
    
    loadProjectData()
  }, [projectId, user, projects, secrets, apiKeys, envVars, getSecurityLevel, isDataLoaded])

  // Filter and search items
  const filteredItems = useMemo(() => {
    return decryptedItems.filter(item => {
      // Text search
      if (searchFilters.query) {
        const query = searchFilters.query.toLowerCase()
        const searchableText = [
          item.name,
          item.description,
          ...(item.tags || []),
          item.service,
          item.environment,
          item.username
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchableText.includes(query)) {
          return false
        }
      }
      
      // Type filter
      if (searchFilters.type !== 'all' && item.type !== searchFilters.type) {
        return false
      }
      
      // Security level filter
      if (searchFilters.securityLevel !== 'all' && item.securityLevel !== searchFilters.securityLevel) {
        return false
      }
      
      // Tags filter
      if (searchFilters.tags.length > 0) {
        const itemTags = item.tags || []
        if (!searchFilters.tags.some(tag => itemTags.includes(tag))) {
          return false
        }
      }
      
      // Environment filter
      if (searchFilters.environment && item.environment !== searchFilters.environment) {
        return false
      }
      
      return true
    })
  }, [decryptedItems, searchFilters])

  // Group items by type
  const groupedItems = useMemo(() => {
    const groups = {
      secret: filteredItems.filter(item => item.type === 'secret'),
      apiKey: filteredItems.filter(item => item.type === 'apiKey'),
      envVar: filteredItems.filter(item => item.type === 'envVar')
    }
    return groups
  }, [filteredItems])

  // Get all available tags and environments for filters
  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    decryptedItems.forEach(item => {
      item.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [decryptedItems])

  const availableEnvironments = useMemo(() => {
    const environments = new Set<string>()
    decryptedItems.forEach(item => {
      if (item.environment) {
        environments.add(item.environment)
      }
    })
    return Array.from(environments).sort()
  }, [decryptedItems])

  // Toggle value visibility
  const toggleValueVisibility = useCallback((itemId: string) => {
    setVisibleValues(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
        // Log access for audit
        console.log(`User ${user?.email} viewed sensitive value for item ${itemId}`)
      }
      return newSet
    })
  }, [user])

  // Copy value to clipboard
  const copyToClipboard = useCallback(async (item: SecurityItem) => {
    try {
      await navigator.clipboard.writeText(item.value)
      toast.success(`${item.name} copied to clipboard`, {
        description: 'Remember to clear your clipboard after use for security'
      })
      
      // Log copy action for audit
      console.log(`User ${user?.email} copied value for item ${item.id}`)
      
      // Show security warning for critical items
      if (item.securityLevel === 'critical') {
        toast.warning('Critical security item copied', {
          description: 'This is a critical security credential. Handle with extreme care.'
        })
      }
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }, [user])

  const copyAllEnvironmentVariables = useCallback(async () => {
     try {
       const envVars = groupedItems.envVar
       if (envVars.length === 0) {
         toast.error('No environment variables to copy')
         return
       }
 
       // Format environment variables in standard .env format
       const envContent = envVars
         .map(item => {
           // Get the decrypted value from decryptedItems or use the original value
           const decryptedItem = decryptedItems.find(d => d.id === item.id)
           const value = decryptedItem?.value || item.value
           
           // Handle multi-line values by wrapping in quotes
           const formattedValue = value.includes('\n') ? `"${value.replace(/"/g, '\\"')}"` : value
           
           // Add comment with description if available
           const comment = item.description ? `# ${item.description}\n` : ''
           
           return `${comment}${item.name}=${formattedValue}`
         })
         .join('\n\n')
 
       await navigator.clipboard.writeText(envContent)
       toast.success(`Copied ${envVars.length} environment variables to clipboard`)
       
       // Log copy action for audit
       console.log(`User ${user?.email} copied all environment variables for project ${projectId}`)
     } catch (error) {
       console.error('Failed to copy environment variables:', error)
       toast.error('Failed to copy environment variables to clipboard')
     }
   }, [groupedItems.envVar, decryptedItems, user, projectId])

  // Toggle section expansion
  const toggleSection = useCallback((section: ItemType) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }, [])

  // Security level styling
  const getSecurityLevelStyle = (level: SecurityLevel) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSecurityIcon = (level: SecurityLevel) => {
    switch (level) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'high':
        return <LockClosedIcon className="h-4 w-4" />
      case 'medium':
        return <ShieldCheckIcon className="h-4 w-4" />
      case 'low':
        return <Shield className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'secret':
        return <KeyIcon className="h-5 w-5" />
      case 'apiKey':
        return <ServerIcon className="h-5 w-5" />
      case 'envVar':
        return <DocumentTextIcon className="h-5 w-5" />
    }
  }

  const getTypeLabel = (type: ItemType) => {
    switch (type) {
      case 'secret':
        return 'Secrets'
      case 'apiKey':
        return 'API Keys'
      case 'envVar':
        return 'Environment Variables'
    }
  }

  // Show loading state while data is being loaded or decrypted
  const isLoading = dataLoading || isDecrypting
  const hasError = dataError || error
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {dataLoading ? 'Loading project data...' : 'Decrypting project details...'}
          </p>
        </div>
      </div>
    )
  }

  if (hasError || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Project</h2>
          <p className="text-gray-600 mb-4">{hasError || 'Project not found'}</p>
          <div className="space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-4">
                    <li>
                      <Link to="/dashboard" className="text-gray-400 hover:text-gray-500">
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <div className="flex items-center">
                        <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                        <Link to="/projects" className="ml-4 text-gray-400 hover:text-gray-500">
                          Projects
                        </Link>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center">
                        <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                        <span className="ml-4 text-sm font-medium text-gray-900">
                          {project.name}
                        </span>
                      </div>
                    </li>
                  </ol>
                </nav>
                <div className="mt-2 flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                  {project.color && (
                    <div
                      className="ml-3 w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: project.color }}
                    />
                  )}
                </div>
                {project.description && (
                  <p className="mt-1 text-sm text-gray-500">{project.description}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  {filteredItems.length} items
                </span>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    showFilters ? 'bg-gray-50' : ''
                  }`}
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-6">
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search secrets, API keys, and environment variables..."
                    value={searchFilters.query}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
                  />
                </div>
                
                {/* Advanced Filters */}
                {showFilters && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={searchFilters.type}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, type: e.target.value as ItemType | 'all' }))}
                      >
                        <option value="all">All Types</option>
                        <option value="secret">Secrets</option>
                        <option value="apiKey">API Keys</option>
                        <option value="envVar">Environment Variables</option>
                      </select>
                    </div>
                    
                    {/* Security Level Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Security Level
                      </label>
                      <select
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={searchFilters.securityLevel}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, securityLevel: e.target.value as SecurityLevel | 'all' }))}
                      >
                        <option value="all">All Levels</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    
                    {/* Environment Filter */}
                    {availableEnvironments.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Environment
                        </label>
                        <select
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={searchFilters.environment}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, environment: e.target.value }))}
                        >
                          <option value="">All Environments</option>
                          {availableEnvironments.map(env => (
                            <option key={env} value={env}>{env}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <button
                        onClick={() => setSearchFilters({
                          query: '',
                          type: 'all',
                          securityLevel: 'all',
                          tags: [],
                          environment: ''
                        })}
                        className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items by Category */}
            {(['secret', 'apiKey', 'envVar'] as ItemType[]).map(type => {
              const items = groupedItems[type]
              const isExpanded = expandedSections.has(type)
              
              if (items.length === 0) return null
              
              return (
                <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                  {/* Section Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleSection(type)}
                        className="flex items-center text-left"
                      >
                        <div className="flex items-center">
                          {getTypeIcon(type)}
                          <h3 className="ml-3 text-lg font-medium text-gray-900">
                            {getTypeLabel(type)}
                          </h3>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {items.length}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400 ml-2" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-2" />
                        )}
                      </button>
                      
                      {/* Copy All Environment Variables Button */}
                      {type === 'envVar' && items.length > 0 && (
                        <button
                          onClick={copyAllEnvironmentVariables}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                          Copy All Environment Variables
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Section Content */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-200">
                      {items.map(item => {
                        const isVisible = visibleValues.has(item.id)
                        const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date()
                        
                        return (
                          <div key={item.id} className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                {/* Item Header */}
                                <div className="flex items-center mb-2">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">
                                    {item.name}
                                  </h4>
                                  
                                  {/* Security Level Badge */}
                                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                    getSecurityLevelStyle(item.securityLevel)
                                  }`}>
                                    {getSecurityIcon(item.securityLevel)}
                                    <span className="ml-1 capitalize">{item.securityLevel}</span>
                                  </span>
                                  
                                  {/* Expiry Warning */}
                                  {isExpired && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                      Expired
                                    </span>
                                  )}
                                  
                                  {/* Tags */}
                                  {item.tags && item.tags.length > 0 && (
                                    <div className="ml-2 flex items-center space-x-1">
                                      {item.tags.slice(0, 3).map(tag => (
                                        <span
                                          key={tag}
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                          <TagIcon className="h-3 w-3 mr-1" />
                                          {tag}
                                        </span>
                                      ))}
                                      {item.tags.length > 3 && (
                                        <span className="text-xs text-gray-500">
                                          +{item.tags.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Description */}
                                {item.description && (
                                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                )}
                                
                                {/* Value Display */}
                                <div className="bg-gray-50 rounded-md p-3 mb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                      Value
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => toggleValueVisibility(item.id)}
                                        className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
                                      >
                                        {isVisible ? (
                                          <>
                                            <EyeSlashIcon className="h-4 w-4 mr-1" />
                                            Hide
                                          </>
                                        ) : (
                                          <>
                                            <EyeIcon className="h-4 w-4 mr-1" />
                                            Show
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => copyToClipboard(item)}
                                        className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
                                      >
                                        <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                                        Copy
                                      </button>
                                    </div>
                                  </div>
                                  <div className="font-mono text-sm">
                                    {isVisible ? (
                                      <span className="text-gray-900 break-all">{item.value}</span>
                                    ) : (
                                      <span className="text-gray-400">{'•'.repeat(Math.min(item.value.length, 20))}</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Additional Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                                  {item.service && (
                                    <div className="flex items-center">
                                      <ServerIcon className="h-4 w-4 mr-1" />
                                      <span>Service: {item.service}</span>
                                    </div>
                                  )}
                                  {item.environment && (
                                    <div className="flex items-center">
                                      <DocumentTextIcon className="h-4 w-4 mr-1" />
                                      <span>Env: {item.environment}</span>
                                    </div>
                                  )}
                                  {item.username && (
                                    <div className="flex items-center">
                                      <UserIcon className="h-4 w-4 mr-1" />
                                      <span>User: {item.username}</span>
                                    </div>
                                  )}
                                  {item.url && (
                                    <div className="flex items-center">
                                      <span>URL: </span>
                                      <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-1 text-blue-600 hover:text-blue-800 truncate"
                                      >
                                        {item.url}
                                      </a>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Metadata */}
                                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                      <ClockIcon className="h-4 w-4 mr-1" />
                                      <span>Updated {new Date(item.lastUpdated).toLocaleDateString()}</span>
                                    </div>
                                    {item.accessCount > 0 && (
                                      <div className="flex items-center">
                                        <EyeIcon className="h-4 w-4 mr-1" />
                                        <span>{item.accessCount} accesses</span>
                                      </div>
                                    )}
                                  </div>
                                  {item.expiresAt && (
                                    <div className={`flex items-center ${
                                      isExpired ? 'text-red-600' : 'text-gray-500'
                                    }`}>
                                      <CalendarIcon className="h-4 w-4 mr-1" />
                                      <span>
                                        Expires {new Date(item.expiresAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            
            {/* Empty State */}
            {filteredItems.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-600 mb-4">
                  {searchFilters.query || searchFilters.type !== 'all' || searchFilters.securityLevel !== 'all'
                    ? 'Try adjusting your search filters'
                    : 'This project doesn\'t have any secrets, API keys, or environment variables yet.'}
                </p>
                {(!searchFilters.query && searchFilters.type === 'all' && searchFilters.securityLevel === 'all') && (
                  <div className="flex justify-center space-x-3">
                    <Link
                      to="/secrets"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <KeyIcon className="h-4 w-4 mr-2" />
                      Add Secret
                    </Link>
                    <Link
                      to="/api-keys"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <ServerIcon className="h-4 w-4 mr-2" />
                      Add API Key
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Project Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <KeyIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Secrets</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {groupedItems.secret.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ServerIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">API Keys</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {groupedItems.apiKey.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Environment Variables</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {groupedItems.envVar.length}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Security Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Summary</h3>
              <div className="space-y-3">
                {(['critical', 'high', 'medium', 'low'] as SecurityLevel[]).map(level => {
                  const count = filteredItems.filter(item => item.securityLevel === level).length
                  if (count === 0) return null
                  
                  return (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          getSecurityLevelStyle(level)
                        }`}>
                          {getSecurityIcon(level)}
                          <span className="ml-1 capitalize">{level}</span>
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Recent Activity */}
            {auditLogs.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {auditLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-400 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">Item accessed</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Link
                    to={`/audit-logs?project=${projectId}`}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all activity →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetails