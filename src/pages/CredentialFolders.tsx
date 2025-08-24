import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Folder, FolderOpen, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { CredentialFoldersService, CreateFolderData, UpdateFolderData } from '../services/credentialFolders'
import type { Database } from '../types/database'

type CredentialFolder = Database['public']['Tables']['credential_folders']['Row']

interface FolderStats {
  secretCount: number
}

interface CredentialFoldersPageProps {}

export default function CredentialFolders({}: CredentialFoldersPageProps) {
  const [folders, setFolders] = useState<CredentialFolder[]>([])
  const [folderStats, setFolderStats] = useState<Record<string, FolderStats>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState<CredentialFolder | null>(null)

  // Load folders and their stats
  useEffect(() => {
    loadFolders()
  }, [])

  const loadFolders = async () => {
    try {
      setLoading(true)
      const foldersData = await CredentialFoldersService.getFolders()
      setFolders(foldersData)

      // Load stats for each folder
      const stats: Record<string, FolderStats> = {}
      await Promise.all(
        foldersData.map(async (folder) => {
          try {
            const folderStats = await CredentialFoldersService.getFolderStats(folder.id)
            stats[folder.id] = folderStats
          } catch (error) {
            console.warn(`Failed to load stats for folder ${folder.id}:`, error)
            stats[folder.id] = { secretCount: 0 }
          }
        })
      )
      setFolderStats(stats)
    } catch (error) {
      console.error('Error loading folders:', error)
      toast.error('Failed to load folders')
    } finally {
      setLoading(false)
    }
  }

  // Filter folders based on search
  const filteredFolders = folders.filter(folder => {
    if (!searchQuery) return true
    return (
      folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      folder.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleDeleteFolder = async (folder: CredentialFolder) => {
    const secretCount = folderStats[folder.id]?.secretCount || 0
    
    if (secretCount > 0) {
      toast.error(`Cannot delete folder "${folder.name}" because it contains ${secretCount} secret(s). Please move or delete the secrets first.`)
      return
    }

    if (!confirm(`Are you sure you want to delete the folder "${folder.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await CredentialFoldersService.deleteFolder(folder.id)
      setFolders(prev => prev.filter(f => f.id !== folder.id))
      toast.success('Folder deleted successfully')
    } catch (error) {
      console.error('Error deleting folder:', error)
      toast.error('Failed to delete folder')
    }
  }

  const predefinedColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280'  // Gray
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">Credential Folders</h1>
            <p className="text-gray-600 mt-1">
              Organize your secrets into folders for better management
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Folder
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredFolders.length} of {folders.length} folders
          </p>
        </div>

        {/* Folders Grid */}
        {filteredFolders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {folders.length === 0 ? 'No folders yet' : 'No folders found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {folders.length === 0
                ? 'Create your first folder to organize your secrets'
                : 'Try adjusting your search query'}
            </p>
            {folders.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Create First Folder
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFolders.map(folder => {
              const stats = folderStats[folder.id] || { secretCount: 0 }
              return (
                <div key={folder.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: folder.color }}
                      >
                        {stats.secretCount > 0 ? (
                          <FolderOpen className="w-6 h-6 text-white" />
                        ) : (
                          <Folder className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {folder.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {stats.secretCount} secret{stats.secretCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingFolder(folder)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {folder.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {folder.description}
                    </p>
                  )}

                  <div className="text-xs text-gray-500">
                    Created {new Date(folder.created_at).toLocaleDateString()}
                    {folder.updated_at !== folder.created_at && (
                      <span> • Updated {new Date(folder.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Folder Modal */}
      {(showCreateModal || editingFolder) && (
        <FolderModal
          folder={editingFolder}
          onClose={() => {
            setShowCreateModal(false)
            setEditingFolder(null)
          }}
          onSave={async (folderData) => {
            try {
              if (editingFolder) {
                const updatedFolder = await CredentialFoldersService.updateFolder(
                  editingFolder.id,
                  folderData as UpdateFolderData
                )
                setFolders(prev => prev.map(f => f.id === editingFolder.id ? updatedFolder : f))
                toast.success('Folder updated successfully')
              } else {
                const newFolder = await CredentialFoldersService.createFolder(folderData as CreateFolderData)
                setFolders(prev => [newFolder, ...prev])
                setFolderStats(prev => ({ ...prev, [newFolder.id]: { secretCount: 0 } }))
                toast.success('Folder created successfully')
              }
              setShowCreateModal(false)
              setEditingFolder(null)
            } catch (error) {
              console.error('Error saving folder:', error)
              toast.error(`Failed to ${editingFolder ? 'update' : 'create'} folder`)
            }
          }}
          predefinedColors={predefinedColors}
        />
      )}
    </div>
  )
}

// Folder Modal Component
interface FolderModalProps {
  folder?: CredentialFolder | null
  onClose: () => void
  onSave: (folderData: CreateFolderData | UpdateFolderData) => Promise<void>
  predefinedColors: string[]
}

function FolderModal({ folder, onClose, onSave, predefinedColors }: FolderModalProps) {
  const [name, setName] = useState(folder?.name || '')
  const [description, setDescription] = useState(folder?.description || '')
  const [color, setColor] = useState(folder?.color || predefinedColors[0])
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Folder name is required')
      return
    }

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {folder ? 'Edit Folder' : 'Create Folder'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter folder name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter folder description (optional)"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {predefinedColors.map(colorOption => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    color === colorOption
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : (folder ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}