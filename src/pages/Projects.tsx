import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Package, Package2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { ProjectsService, CreateProjectData, UpdateProjectData } from '../services/projects'
import type { Database } from '../types/database'

type Project = Database['public']['Tables']['projects']['Row']

interface ProjectStats {
  secretCount: number
}

interface ProjectsPageProps {}

export default function Projects({}: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  


  // Load projects and their stats
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const projectsData = await ProjectsService.getAll()
      setProjects(projectsData)

      // Load stats for each project
      const stats: Record<string, ProjectStats> = {}
      await Promise.all(
        projectsData.map(async (project) => {
          try {
            const projectStats = await ProjectsService.getProjectStats(project.id)
            stats[project.id] = projectStats
          } catch (error) {
            console.warn(`Failed to load stats for project ${project.id}:`, error)
            stats[project.id] = { secretCount: 0 }
          }
        })
      )
      setProjectStats(stats)
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  // Filter projects based on search
  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true
    return (
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleDeleteProject = async (project: Project) => {
    // Check if project has any associated data
    const secretCount = projectStats[project.id]?.secretCount || 0
    
    if (secretCount > 0) {
      toast.error(`Cannot delete project "${project.name}" because it contains ${secretCount} secret(s). Please move or delete the secrets first.`)
      return
    }

    // Enhanced confirmation dialog
    const confirmMessage = `Are you sure you want to delete the project "${project.name}"?\n\nThis action cannot be undone and will permanently remove:\n• The project and its settings\n• Any associated API keys\n• Any associated environment variables\n\nType "DELETE" to confirm:`
    
    const userInput = prompt(confirmMessage)
    if (userInput !== 'DELETE') {
      if (userInput !== null) {
        toast.error('Deletion cancelled. You must type "DELETE" to confirm.')
      }
      return
    }

    try {
      await ProjectsService.delete(project.id)
      setProjects(prev => prev.filter(p => p.id !== project.id))
      // Also remove from project stats
      setProjectStats(prev => {
        const newStats = { ...prev }
        delete newStats[project.id]
        return newStats
      })
      toast.success(`Project "${project.name}" deleted successfully`)
    } catch (error) {
      console.error('Error deleting project:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      // Provide specific error messages
      if (errorMessage.includes('contains secrets') || errorMessage.includes('contains API keys') || errorMessage.includes('contains environment variables')) {
        toast.error(`Cannot delete project: ${errorMessage}`)
      } else if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
        toast.error('Project not found or you do not have permission to delete it')
      } else if (errorMessage.includes('authentication') || errorMessage.includes('not authenticated')) {
        toast.error('Please log in to continue')
      } else {
        toast.error(`Failed to delete project: ${errorMessage}`)
      }
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
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-1">
              Organize your secrets into projects for better management
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredProjects.length} of {projects.length} projects
          </p>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {projects.length === 0 ? 'No projects yet' : 'No projects found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {projects.length === 0
                ? 'Create your first project to organize your secrets'
                : 'Try adjusting your search query'}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Create First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => {
              const stats = projectStats[project.id] || { secretCount: 0 }
              return (
                <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: project.color }}
                      >
                        {stats.secretCount > 0 ? (
                          <Package2 className="w-6 h-6 text-white" />
                        ) : (
                          <Package className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {stats.secretCount} secret{stats.secretCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingProject(project)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Project"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {project.description}
                    </p>
                  )}

                  <div className="text-xs text-gray-500">
                    Created {new Date(project.created_at).toLocaleDateString()}
                    {project.updated_at !== project.created_at && (
                      <span> • Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Project Modal */}
      {(showCreateModal || editingProject) && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowCreateModal(false)
            setEditingProject(null)
          }}
          onSave={async (projectData) => {
            try {
              if (editingProject) {
                const updatedProject = await ProjectsService.update(
                  editingProject.id,
                  projectData as UpdateProjectData
                )
                setProjects(prev => prev.map(p => p.id === editingProject.id ? updatedProject : p))
                toast.success('Project updated successfully')
              } else {
                const newProject = await ProjectsService.create(projectData as CreateProjectData)
                setProjects(prev => [newProject, ...prev])
                setProjectStats(prev => ({ ...prev, [newProject.id]: { secretCount: 0 } }))
                toast.success('Project created successfully')
              }
              setShowCreateModal(false)
              setEditingProject(null)
            } catch (error) {
              console.error('Error saving project:', error)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
              
              // Provide specific error messages based on common validation errors
              if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
                toast.error('A project with this name already exists')
              } else if (errorMessage.includes('authentication') || errorMessage.includes('not authenticated')) {
                toast.error('Please log in to continue')
              } else if (errorMessage.includes('validation') || errorMessage.includes('required')) {
                toast.error('Please check your input and try again')
              } else {
                toast.error(`Failed to ${editingProject ? 'update' : 'create'} project: ${errorMessage}`)
              }
            }
          }}
          predefinedColors={predefinedColors}
        />
      )}
    </div>
  )
}

// Project Modal Component
interface ProjectModalProps {
  project?: Project | null
  onClose: () => void
  onSave: (projectData: CreateProjectData | UpdateProjectData) => Promise<void>
  predefinedColors: string[]
}

function ProjectModal({ project, onClose, onSave, predefinedColors }: ProjectModalProps) {
  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [color, setColor] = useState(project?.color || predefinedColors[0])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{name?: string; description?: string}>({})

  const validateForm = () => {
    const newErrors: {name?: string; description?: string} = {}
    
    // Validate name
    const trimmedName = name.trim()
    if (!trimmedName) {
      newErrors.name = 'Project name is required'
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Project name must be at least 2 characters long'
    } else if (trimmedName.length > 50) {
      newErrors.name = 'Project name must be less than 50 characters'
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
      newErrors.name = 'Project name can only contain letters, numbers, spaces, hyphens, and underscores'
    }
    
    // Validate description
    const trimmedDescription = description.trim()
    if (trimmedDescription && trimmedDescription.length > 200) {
      newErrors.description = 'Description must be less than 200 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
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
          {project ? 'Edit Project' : 'Create Project'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: undefined }))
                }
              }}
              onBlur={validateForm}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter project name"
              maxLength={50}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: undefined }))
                }
              }}
              onBlur={validateForm}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter project description (optional)"
              rows={3}
              maxLength={200}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {description.length}/200 characters
            </p>
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
              {saving ? 'Saving...' : (project ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}