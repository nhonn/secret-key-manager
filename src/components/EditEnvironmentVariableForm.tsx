import React, { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Plus, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { EnvironmentVariablesService, UpdateEnvironmentVariableData } from '../services/environmentVariables'
import { ProjectsService } from '../services/projects'
import { ConfirmationDialog } from './ui/ConfirmationDialog'
import type { Project } from '../types/database'

interface DecryptedEnvironmentVariable {
  id: string
  name: string
  value: string
  description?: string | null
  tags?: string[] | null
  project_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface EditEnvironmentVariableFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  environmentVariable: DecryptedEnvironmentVariable
}

interface EnvironmentVariableFormData {
  name: string
  description: string
  value: string
  tags: string[]
  project_id: string
}

interface FormErrors {
  name?: string
  value?: string
  description?: string
}

export const EditEnvironmentVariableForm: React.FC<EditEnvironmentVariableFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  environmentVariable
}) => {
  const [formData, setFormData] = useState<EnvironmentVariableFormData>({
    name: '',
    description: '',
    value: '',
    tags: [],
    project_id: ''
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [showValue, setShowValue] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form data when environmentVariable changes
  useEffect(() => {
    if (environmentVariable && isOpen) {
      setFormData({
        name: environmentVariable.name || '',
        description: environmentVariable.description || '',
        value: environmentVariable.value || '',
        tags: environmentVariable.tags || [],
        project_id: environmentVariable.project_id || ''
      })
      setHasChanges(false)
      setErrors({})
    }
  }, [environmentVariable, isOpen])

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

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Environment variable name is required'
    } else if (formData.name.length < 1) {
      newErrors.name = 'Environment variable name must be at least 1 character'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Environment variable name must be less than 100 characters'
    } else if (!/^[A-Z_][A-Z0-9_]*$/i.test(formData.name)) {
      newErrors.name = 'Environment variable name must contain only letters, numbers, and underscores, and cannot start with a number'
    }

    // Validate value
    if (!formData.value.trim()) {
      newErrors.value = 'Environment variable value is required'
    } else if (formData.value.length > 10000) {
      newErrors.value = 'Environment variable value must be less than 10,000 characters'
    }

    // Validate description
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof EnvironmentVariableFormData, value: string | string[]) => {
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

      const updateData: UpdateEnvironmentVariableData = {
        name: formData.name.trim().toUpperCase(), // Convert to uppercase for consistency
        description: formData.description.trim() || undefined,
        value: formData.value,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        project_id: formData.project_id || undefined
      }

      await EnvironmentVariablesService.update(environmentVariable.id, updateData)
      
      toast.success('Environment variable updated successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating environment variable:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update environment variable')
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
                  Edit Environment Variable
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Variable Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value.toUpperCase())}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="DATABASE_URL"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Use uppercase letters, numbers, and underscores only
                    </p>
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

                  {/* Value Field */}
                  <div>
                    <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                      Variable Value *
                    </label>
                    <div className="relative">
                      <textarea
                        id="value"
                        value={formData.value}
                        onChange={(e) => handleInputChange('value', e.target.value)}
                        rows={4}
                        className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.value ? 'border-red-300' : 'border-gray-300'
                        } ${!showValue ? 'font-mono' : ''}`}
                        placeholder="Enter variable value"
                        style={!showValue ? { WebkitTextSecurity: 'disc' } : {}}
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 p-1"
                        onClick={() => setShowValue(!showValue)}
                      >
                        {showValue ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.value && (
                      <p className="mt-1 text-sm text-red-600">{errors.value}</p>
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
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-green-600 hover:text-green-800"
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
                          : 'bg-green-600 hover:bg-green-700'
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
        title="Confirm Environment Variable Update"
        message="Are you sure you want to update this environment variable? This action will be logged for security purposes."
        confirmText="Update Variable"
        variant="warning"
        isLoading={isLoading}
      />
    </>
  )
}