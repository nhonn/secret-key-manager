import React, { useState, useEffect } from 'react'
import { Plus, Search, Eye, EyeOff, Copy, Edit, Trash2, Key, ExternalLink, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { ApiKeysService, DecryptedApiKey } from '../services/apiKeys'
import { AddApiKeyForm } from '../components/AddApiKeyForm'
import { EditApiKeyForm } from '../components/EditApiKeyForm'
import type { Database } from '../types/database'

type ApiKey = Database['public']['Tables']['api_keys']['Row']
type ApiKeyWithDecrypted = ApiKey & { decrypted_key?: string }

interface ApiKeysPageProps {}

export default function ApiKeys({}: ApiKeysPageProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyWithDecrypted[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingKey, setEditingKey] = useState<DecryptedApiKey | null>(null)
  



  // Load API keys
  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      setLoading(true)
      const apiKeysData = await ApiKeysService.getAll()
      setApiKeys(apiKeysData)
    } catch (error) {
      console.error('Error loading API keys:', error)
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  // Filter API keys based on search
  const filteredApiKeys = apiKeys.filter(apiKey => {
    if (!searchQuery) return true
    return (
      apiKey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apiKey.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const toggleKeyVisibility = async (keyId: string) => {
    if (visibleKeys.has(keyId)) {
      // Hide the key
      setVisibleKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(keyId)
        return newSet
      })
      // Remove decrypted key from state
      setApiKeys(prev => prev.map(key => 
        key.id === keyId ? { ...key, decrypted_key: undefined } : key
      ))
    } else {
      // Decrypt and show the key directly
      try {
        const decryptedApiKey = await ApiKeysService.getById(keyId)
        
        // Update the key in state with decrypted value
        setApiKeys(prev => prev.map(key => 
          key.id === keyId ? { ...key, decrypted_key: decryptedApiKey.decrypted_key } : key
        ))
        
        // Mark as visible
        setVisibleKeys(prev => new Set([...prev, keyId]))
      } catch (error) {
        console.error('Error decrypting API key:', error)
        toast.error('Failed to decrypt API key. Please ensure you are authenticated.')
      }
    }
  }



  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard`)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleDeleteKey = async (apiKey: ApiKeyWithDecrypted) => {
    if (!confirm(`Are you sure you want to delete the API key "${apiKey.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await ApiKeysService.delete(apiKey.id)
      setApiKeys(prev => prev.filter(k => k.id !== apiKey.id))
      toast.success('API key deleted successfully')
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error('Failed to delete API key')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
            <p className="text-gray-600 mt-1">
              Manage your encrypted API keys and service credentials
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add API Key
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search API keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredApiKeys.length} of {apiKeys.length} API keys
          </p>
        </div>

        {/* API Keys List */}
        <div className="space-y-4">
          {filteredApiKeys.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {apiKeys.length === 0 ? 'No API keys yet' : 'No API keys found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {apiKeys.length === 0
                  ? 'Add your first API key to get started'
                  : 'Try adjusting your search query'}
              </p>
              {apiKeys.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Add First API Key
                </button>
              )}
            </div>
          ) : (
            filteredApiKeys.map(apiKey => {
              const expired = isExpired(apiKey.expires_at)
              const status = expired ? 'expired' : 'active'
              
              return (
                <div key={apiKey.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {apiKey.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        {expired && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Expired
                          </span>
                        )}
                      </div>
                      


                      {apiKey.description && (
                        <p className="text-gray-600 mb-3">{apiKey.description}</p>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500 w-16">API Key:</span>
                          <span className="text-sm text-gray-900 font-mono">
                            {visibleKeys.has(apiKey.id) && apiKey.decrypted_key
                              ? apiKey.decrypted_key
                              : '••••••••••••••••••••••••••••••••••••••••'
                            }
                          </span>
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                          {visibleKeys.has(apiKey.id) && apiKey.decrypted_key && (
                            <button
                              onClick={() => copyToClipboard(apiKey.decrypted_key!, 'API key')}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>



                        {apiKey.expires_at && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500">Expires:</span>
                            <span className={`text-sm ${expired ? 'text-red-600' : 'text-gray-900'}`}>
                              {new Date(apiKey.expires_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        Created {new Date(apiKey.created_at).toLocaleDateString()}
                        {apiKey.updated_at !== apiKey.created_at && (
                          <span> • Updated {new Date(apiKey.updated_at).toLocaleDateString()}</span>
                        )}

                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={async () => {
                          try {
                            const decryptedKey = apiKey.decrypted_key || await ApiKeysService.decryptApiKey(apiKey.id)
                            const decryptedApiKey: DecryptedApiKey = {
                              ...apiKey,
                              key: decryptedKey
                            }
                            setEditingKey(decryptedApiKey)
                            setShowEditModal(true)
                          } catch (error) {
                            console.error('Error decrypting API key:', error)
                            toast.error('Failed to decrypt API key for editing')
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit API Key"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteKey(apiKey)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete API Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Add API Key Modal */}
      <AddApiKeyForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          loadApiKeys()
          toast.success('API key created successfully')
        }}
      />

      {/* Edit API Key Modal */}
      <EditApiKeyForm
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingKey(null)
        }}
        onSuccess={() => {
          loadApiKeys()
          setShowEditModal(false)
          setEditingKey(null)
        }}
        apiKey={editingKey}
      />




    </div>
  )
}