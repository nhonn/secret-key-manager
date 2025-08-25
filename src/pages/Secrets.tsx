import React, { useState, useEffect } from 'react'
import { Search, Plus, Eye, EyeOff, Copy, Edit, Trash2, Filter, Package, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { SecretsService } from '../services/secrets'
import { ProjectsService } from '../services/projects'
import { AddSecretForm } from '../components/AddSecretForm'
import { EditSecretForm } from '../components/EditSecretForm'
import type { Secret, Project } from '../types/database'

interface SecretsPageProps {}

interface DecryptedSecretData {
  id: string
  value: string
}

export default function Secrets({}: SecretsPageProps) {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set())
  const [decryptedSecrets, setDecryptedSecrets] = useState<Map<string, string>>(new Map())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null)

  // Load secrets and projects
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [secretsData, projectsData] = await Promise.all([
        SecretsService.getSecrets(),
        ProjectsService.getAll()
      ])
      setSecrets(secretsData)
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load secrets')
    } finally {
      setLoading(false)
    }
  }

  // Filter secrets based on search and filters
  const filteredSecrets = secrets.filter(secret => {
    const matchesSearch = !searchQuery || 
      secret.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      secret.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesProject = !selectedProject || secret.project_id === selectedProject
    
    const matchesTag = !selectedTag || 
      (secret.tags && secret.tags.includes(selectedTag))
    
    return matchesSearch && matchesProject && matchesTag
  })

  // Get unique tags from all secrets
  const allTags = Array.from(new Set(
    secrets.flatMap(secret => secret.tags || [])
  )).sort()

  const toggleSecretVisibility = async (secretId: string) => {
    if (visibleSecrets.has(secretId)) {
      // Hide the secret
      setVisibleSecrets(prev => {
        const newSet = new Set(prev)
        newSet.delete(secretId)
        return newSet
      })
      setDecryptedSecrets(prev => {
        const newMap = new Map(prev)
        newMap.delete(secretId)
        return newMap
      })
    } else {
      // Directly decrypt and show the secret
      try {
        const decryptedSecret = await SecretsService.getSecret(secretId)
        setDecryptedSecrets(prev => new Map(prev).set(secretId, decryptedSecret.password))
        setVisibleSecrets(prev => new Set(prev).add(secretId))
      } catch (error) {
        console.error('Error decrypting secret:', error)
        toast.error('Failed to decrypt secret')
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

  const copySecretPassword = async (secretId: string) => {
    if (decryptedSecrets.has(secretId)) {
      // Already decrypted, copy directly
      const decryptedValue = decryptedSecrets.get(secretId)!
      copyToClipboard(decryptedValue, 'Password')
    } else {
      // Directly decrypt and copy
      try {
        const decryptedSecret = await SecretsService.getSecret(secretId)
        copyToClipboard(decryptedSecret.password, 'Password')
      } catch (error) {
        console.error('Error decrypting secret:', error)
        toast.error('Failed to decrypt secret')
      }
    }
  }



  const handleDeleteSecret = async (secretId: string) => {
    if (!confirm('Are you sure you want to delete this secret? This action cannot be undone.')) {
      return
    }

    try {
      await SecretsService.deleteSecret(secretId)
      setSecrets(prev => prev.filter(s => s.id !== secretId))
      toast.success('Secret deleted successfully')
    } catch (error) {
      console.error('Error deleting secret:', error)
      toast.error('Failed to delete secret')
    }
  }

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'No Project'
    const project = projects.find(p => p.id === projectId)
    return project?.name || 'Unknown Project'
  }

  const getProjectColor = (projectId: string | null) => {
    if (!projectId) return '#6B7280'
    const project = projects.find(p => p.id === projectId)
    return project?.color || '#6B7280'
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
            <h1 className="text-3xl font-bold text-gray-900">Secrets</h1>
            <p className="text-gray-600 mt-1">
              Manage your encrypted secrets and credentials
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Secret
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search secrets..."
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
                <Package className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedProject || selectedTag || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedProject('')
                    setSelectedTag('')
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
            Showing {filteredSecrets.length} of {secrets.length} secrets
          </p>
        </div>

        {/* Secrets List */}
        <div className="space-y-4">
          {filteredSecrets.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {secrets.length === 0 ? 'No secrets yet' : 'No secrets found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {secrets.length === 0
                  ? 'Get started by creating your first secret'
                  : 'Try adjusting your search or filters'}
              </p>
              {secrets.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Create First Secret
                </button>
              )}
            </div>
          ) : (
            filteredSecrets.map(secret => (
              <div key={secret.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {secret.name}
                      </h3>
                      <div
                        className="px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: getProjectColor(secret.project_id) }}
                      >
                        {getProjectName(secret.project_id)}
                      </div>
                    </div>
                    
                    {secret.description && (
                      <p className="text-gray-600 mb-3">{secret.description}</p>
                    )}

                    {secret.tags && secret.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {secret.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      {secret.username && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500 w-20">Username:</span>
                          <span className="text-sm text-gray-900">{secret.username}</span>
                          <button
                            onClick={() => copyToClipboard(secret.username!, 'Username')}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500 w-20">Password:</span>
                        <span className="text-sm text-gray-900 font-mono">
                          {visibleSecrets.has(secret.id) && decryptedSecrets.has(secret.id) 
                            ? decryptedSecrets.get(secret.id) 
                            : '••••••••••••'}
                        </span>
                        <button
                          onClick={() => toggleSecretVisibility(secret.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {visibleSecrets.has(secret.id) ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => copySecretPassword(secret.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      {secret.url && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500 w-20">URL:</span>
                          <a
                            href={secret.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 underline"
                          >
                            {secret.url}
                          </a>
                          <button
                            onClick={() => copyToClipboard(secret.url!, 'URL')}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Created {new Date(secret.created_at).toLocaleDateString()}
                      {secret.updated_at !== secret.created_at && (
                        <span> • Updated {new Date(secret.updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingSecret(secret)
                        setShowEditModal(true)
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSecret(secret.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Add Secret Form */}
      <AddSecretForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadData()
        }}
        projectId={selectedProject}
      />

      {/* Edit Secret Form */}
      <EditSecretForm
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingSecret(null)
        }}
        onSuccess={() => {
          loadData()
          setShowEditModal(false)
          setEditingSecret(null)
        }}
        secret={editingSecret}
      />


    </div>
  )
}