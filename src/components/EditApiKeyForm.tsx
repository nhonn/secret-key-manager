import React, { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Plus, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ApiKeysService, UpdateApiKeyData } from '../services/apiKeys'
import { ProjectsService } from '../services/projects'
import { ConfirmationDialog } from './ui/ConfirmationDialog'
import type { Project } from '../types/database'

interface DecryptedApiKey {
  id: string
  name: string
  key: string
  description?: string | null
  url?: string | null
  tags?: string[] | null
  project_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface EditApiKeyFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  apiKey: DecryptedApiKey
}

interface ApiKeyFormData {
  name: string
  description: string
  key: string
  url: string
  tags: string[]
  project_id: string
}

interface FormErrors {
  name?: string
  key?: string
  description?: string
  url?: string
}

export const EditApiKeyForm: React.FC<EditApiKeyFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  apiKey
}) => {
  const [formData, setFormData] = useState<ApiKeyFormData>({
    name: '',
    description: '',
    key: '',
    url: '',
    tags: [],
    project_id: ''
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form data when apiKey changes
  useEffect(() => {
    if (apiKey && isOpen) {
      setFormData({
        name: apiKey.name || '',
        description: apiKey.description || '',
        key: apiKey.key || '',
        url: apiKey.url || '',
        tags: apiKey.tags || [],
        project_id: apiKey.project_id || ''
      })
      setHasChanges(false)
      setErrors({})
    }
  }, [apiKey, isOpen])

  // Load projects
  useEffect(() => {
    if (isOpen) {
      loadProjects()
    }
  }, [isOpen])

  const loadProjects = async () => {
    try {
      const projectsData = await ProjectsService.getAll()
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Failed to load projects')
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'API key name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'API key name must be at least 2 characters'
    } else if (formData.name.length > 100) {
      newErrors.name = 'API key name must be less than 100 characters'
    }

    if (!formData.key.trim()) {
      newErrors.key = 'API key value is required'
    } else if (formData.key.length < 8) {
      newErrors.key = 'API key must be at least 8 characters'
    } else if (formData.key.length > 1000) {
      newErrors.key = 'API key must be less than 1,000 characters'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    if (formData.url && formData.url.trim()) {
      try {
        new URL(formData.url)
      } catch {
        newErrors.url = 'Please enter a valid URL'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof ApiKeyFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
    
    // Clear specific field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      const newTags = [...formData.tags, tagInput.trim()]
      handleInputChange('tags', newTags)
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = formData.tags.filter(tag => tag !== tagToRemove)
    handleInputChange('tags', newTags)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors')
      return
    }

    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    setShowConfirmDialog(true)
  }

  const handleConfirmSave = async () => {
    try {
      setIsLoading(true)
      setShowConfirmDialog(false)

      const updateData: UpdateApiKeyData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        key: formData.key.trim(),
        url: formData.url.trim() || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        project_id: formData.project_id || undefined
      }

      await ApiKeysService.update(apiKey.id, updateData)
      
      toast.success('API key updated successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating API key:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update API key')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
          
          <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={handleClose}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                  Edit API Key
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter API key name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Description Field */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter description (optional)"
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                    )}
                  </div>

                  {/* API Key Field */}
                  <div>
                    <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
                      API Key *
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        id="key"
                        value={formData.key}
                        onChange={(e) => handleInputChange('key', e.target.value)}
                        className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.key ? 'border-red-300' : 'border-gray-300'
                        } ${!showKey ? 'font-mono' : ''}`}
                        placeholder="Enter API key"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.key && (
                      <p className="mt-1 text-sm text-red-600">{errors.key}</p>
                    )}
                  </div>

                  {/* URL Field */}
                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                      Service URL
                    </label>
                    <input
                      type="url"
                      id="url"
                      value={formData.url}
                      onChange={(e) => handleInputChange('url', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.url ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="https://api.example.com"
                    />
                    {errors.url && (
                      <p className="mt-1 text-sm text-red-600">{errors.url}</p>
                    )}
                  </div>

                  {/* Project Field */}
                  <div>
                    <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
                      Project
                    </label>
                    <select
                      id="project"
                      value={formData.project_id}
                      onChange={(e) => handleInputChange('project_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">No Project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tags Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add a tag"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !hasChanges}
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        isLoading || !hasChanges
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmSave}
        title="Confirm API Key Update"
        message="Are you sure you want to update this API key? This action will be logged for security purposes."
        confirmText="Update API Key"
        variant="warning"
        isLoading={isLoading}
      />
    </>
  )
}