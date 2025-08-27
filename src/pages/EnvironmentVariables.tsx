import React, { useState, useEffect } from 'react'
import { Plus, Search, Eye, EyeOff, Copy, Edit, Trash2, Settings, Download, Upload, Filter } from 'lucide-react'
import SensitiveDataDisplay, { SecurityLevel, DataType } from '../components/ui/SensitiveDataDisplay'
import { toast } from 'sonner'
import { EnvironmentVariablesService, DecryptedEnvironmentVariable } from '../services/environmentVariables'
import { AddEnvironmentVariableForm } from '../components/AddEnvironmentVariableForm'
import { EditEnvironmentVariableForm } from '../components/EditEnvironmentVariableForm'
import type { Database } from '../types/database'

type EnvironmentVariable = Database['public']['Tables']['environment_variables']['Row']

interface DecryptedEnvVar extends EnvironmentVariable {
  decrypted_value?: string
}

interface EnvironmentVariablesPageProps {}

export default function EnvironmentVariables({}: EnvironmentVariablesPageProps) {
  const [envVars, setEnvVars] = useState<DecryptedEnvVar[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [visibleVars, setVisibleVars] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingVar, setEditingVar] = useState<DecryptedEnvironmentVariable | null>(null)
  


  // Load environment variables
  useEffect(() => {
    loadEnvironmentVariables()
  }, [])

  const loadEnvironmentVariables = async () => {
    try {
      setLoading(true)
      const envVarsData = await EnvironmentVariablesService.getAll()
      setEnvVars(envVarsData)
    } catch (error) {
      console.error('Error loading environment variables:', error)
      toast.error('Failed to load environment variables')
    } finally {
      setLoading(false)
    }
  }

  // Get unique environments
  const environments = Array.from(new Set(envVars.map(v => v.environment))).sort()

  // Filter environment variables
  const filteredEnvVars = envVars.filter(envVar => {
    const matchesSearch = !searchQuery || 
      envVar.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      envVar.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesEnvironment = !selectedEnvironment || envVar.environment === selectedEnvironment
    
    return matchesSearch && matchesEnvironment
  })

  const toggleVarVisibility = async (varId: string) => {
    if (visibleVars.has(varId)) {
      // Hide the variable
      setVisibleVars(prev => {
        const newSet = new Set(prev)
        newSet.delete(varId)
        return newSet
      })
      // Remove decrypted value from state
      setEnvVars(prev => prev.map(envVar => 
        envVar.id === varId ? { ...envVar, decrypted_value: undefined } : envVar
      ))
    } else {
      // Directly decrypt and show the variable
      try {
        const decryptedEnvVar = await EnvironmentVariablesService.getById(varId)
        
        // Update the variable in state with decrypted value
        setEnvVars(prev => prev.map(envVar => 
          envVar.id === varId ? { ...envVar, decrypted_value: decryptedEnvVar.decrypted_value } : envVar
        ))
        
        // Mark as visible
        setVisibleVars(prev => new Set([...prev, varId]))
      } catch (error) {
        console.error('Error decrypting environment variable:', error)
        toast.error('Failed to decrypt environment variable')
      }
    }
  }

  // Map security levels from string to SecurityLevel type
  const mapSecurityLevel = (level: string): SecurityLevel => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'medium': return 'medium'
      case 'low': return 'low'
      default: return 'medium' // Environment variables default to medium security
    }
  }

  // Audit logging for sensitive data reveals
  const logSensitiveDataReveal = (varId: string, varName: string) => {
    console.log(`[AUDIT] Environment Variable revealed: ${varName} (ID: ${varId}) at ${new Date().toISOString()}`)
    // In production, this should send to a secure audit logging service
  }

  const logSensitiveDataCopy = (varId: string, varName: string) => {
    console.log(`[AUDIT] Environment Variable copied: ${varName} (ID: ${varId}) at ${new Date().toISOString()}`)
    // In production, this should send to a secure audit logging service
  }



  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard`)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleDeleteVar = async (envVar: DecryptedEnvVar) => {
    if (!confirm(`Are you sure you want to delete the environment variable "${envVar.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await EnvironmentVariablesService.delete(envVar.id)
      setEnvVars(prev => prev.filter(v => v.id !== envVar.id))
      toast.success('Environment variable deleted successfully')
    } catch (error) {
      console.error('Error deleting environment variable:', error)
      toast.error('Failed to delete environment variable')
    }
  }

  const exportEnvFile = async (environment: string) => {
    try {
      const envVarsForEnvironment = envVars.filter(v => v.environment === environment)
      
      const envFileContent = await Promise.all(
        envVarsForEnvironment.map(async (envVar) => {
          try {
            const decryptedEnvVar = await EnvironmentVariablesService.getById(envVar.id)
            return `${envVar.name}=${decryptedEnvVar.value}`
          } catch (error) {
            console.warn(`Failed to decrypt ${envVar.name}:`, error)
            return `# ${envVar.name}=<FAILED_TO_DECRYPT>`
          }
        })
      )

      const content = [
        `# Environment variables for ${environment}`,
        `# Generated on ${new Date().toISOString()}`,
        '',
        ...envFileContent
      ].join('\n')

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `.env.${environment.toLowerCase()}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Environment file exported for ${environment}`)
    } catch (error) {
      console.error('Error exporting environment file:', error)
      toast.error('Failed to export environment file')
    }
  }

  const getEnvironmentColor = (environment: string) => {
    switch (environment?.toLowerCase()) {
      case 'production': return 'bg-red-100 text-red-800'
      case 'staging': return 'bg-yellow-100 text-yellow-800'
      case 'development': return 'bg-green-100 text-green-800'
      case 'testing': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Environment Variables</h1>
            <p className="text-gray-600 mt-1">
              Manage your encrypted environment variables and configurations
            </p>
          </div>
          <div className="flex items-center gap-3">
            {environments.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => e.target.value && exportEnvFile(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue=""
                >
                  <option value="" disabled>Export .env</option>
                  {environments.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search environment variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                showFilters
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Environments</option>
                  {environments.map(env => (
                    <option key={env} value={env}>
                      {env}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedEnvironment || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedEnvironment('')
                    setSearchQuery('')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredEnvVars.length} of {envVars.length} environment variables
          </p>
        </div>

        {/* Environment Variables List */}
        <div className="space-y-4">
          {filteredEnvVars.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {envVars.length === 0 ? 'No environment variables yet' : 'No variables found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {envVars.length === 0
                  ? 'Add your first environment variable to get started'
                  : 'Try adjusting your search or filters'}
              </p>
              {envVars.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Add First Variable
                </button>
              )}
            </div>
          ) : (
            filteredEnvVars.map(envVar => (
              <div key={envVar.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 font-mono">
                        {envVar.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnvironmentColor(envVar.environment)}`}>
                        {envVar.environment}
                      </span>
                    </div>
                    
                    {envVar.description && (
                      <p className="text-gray-600 mb-3">{envVar.description}</p>
                    )}

                    <div className="space-y-2">
                      <SensitiveDataDisplay
                        value={envVar.decrypted_value || ''}
                        label="Value"
                        dataType="envVar"
                        securityLevel={mapSecurityLevel('medium')}
                        isVisible={visibleVars.has(envVar.id)}
                        onVisibilityChange={(visible) => {
                          if (visible) {
                            toggleVarVisibility(envVar.id)
                          } else {
                            setVisibleVars(prev => {
                              const newSet = new Set(prev)
                              newSet.delete(envVar.id)
                              return newSet
                            })
                            setEnvVars(prev => prev.map(v => 
                              v.id === envVar.id ? { ...v, decrypted_value: undefined } : v
                            ))
                          }
                        }}
                        onReveal={() => logSensitiveDataReveal(envVar.id, envVar.name)}
                        onCopy={() => logSensitiveDataCopy(envVar.id, envVar.name)}
                      />
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Created {new Date(envVar.created_at).toLocaleDateString()}
                      {envVar.updated_at !== envVar.created_at && (
                        <span> • Updated {new Date(envVar.updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={async () => {
                        try {
                          const decryptedValue = await EnvironmentVariablesService.decryptEnvironmentVariable(envVar.id)
                          setEditingVar({
                            ...envVar,
                            value: decryptedValue
                          } as DecryptedEnvironmentVariable)
                          setShowEditModal(true)
                        } catch (error) {
                          console.error('Error decrypting environment variable for editing:', error)
                          toast.error('Failed to decrypt environment variable')
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Environment Variable"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVar(envVar)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Environment Variable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>



      {/* Add Environment Variable Modal */}
      <AddEnvironmentVariableForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          loadEnvironmentVariables()
        }}
      />

      {/* Edit Environment Variable Modal */}
      <EditEnvironmentVariableForm
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingVar(null)
        }}
        onSuccess={() => {
          loadEnvironmentVariables()
          setShowEditModal(false)
          setEditingVar(null)
        }}
        environmentVariable={editingVar}
      />
    </div>
  )
}