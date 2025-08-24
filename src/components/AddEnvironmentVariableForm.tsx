import React, { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EnvironmentVariablesService } from '../services/environmentVariables'
import { CredentialFoldersService } from '../services/credentialFolders'
import type { CredentialFolder } from '../types/database'

interface AddEnvironmentVariableFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  folderId?: string
}

interface EnvironmentVariableFormData {
  name: string
  description: string
  value: string
  environment: string
  is_sensitive: boolean
  tags: string[]
  folder_id: string
  master_password: string
}

const initialFormData: EnvironmentVariableFormData = {
  name: '',
  description: '',
  value: '',
  environment: 'development',
  is_sensitive: false,
  tags: [],
  folder_id: '',
  master_password: ''
}

const environments = [
  'development',
  'staging',
  'production',
  'testing',
  'local'
]

const commonEnvVarNames = [
  'DATABASE_URL',
  'API_KEY',
  'SECRET_KEY',
  'JWT_SECRET',
  'REDIS_URL',
  'MONGODB_URI',
  'POSTGRES_URL',
  'MYSQL_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'STRIPE_PUBLIC_KEY',
  'STRIPE_SECRET_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VERCEL_TOKEN',
  'NETLIFY_AUTH_TOKEN'
]

export const AddEnvironmentVariableForm: React.FC<AddEnvironmentVariableFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  folderId
}) => {
  const [formData, setFormData] = useState<EnvironmentVariableFormData>(initialFormData)
  const [folders, setFolders] = useState<CredentialFolder[]>([])
  const [showValue, setShowValue] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Partial<EnvironmentVariableFormData>>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showMasterPassword, setShowMasterPassword] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      loadFolders()
      if (folderId) {
        setFormData(prev => ({ ...prev, folder_id: folderId }))
      }
    }
  }, [isOpen, folderId])

  useEffect(() => {
    if (formData.name) {
      const filtered = commonEnvVarNames.filter(name => 
        name.toLowerCase().includes(formData.name.toLowerCase())
      )
      setFilteredSuggestions(filtered)
    } else {
      setFilteredSuggestions([])
    }
  }, [formData.name])

  const loadFolders = async () => {
    try {
      const foldersData = await CredentialFoldersService.getAll()
      setFolders(foldersData)
    } catch (error) {
      console.error('Error loading folders:', error)
      toast.error('Failed to load folders')
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<EnvironmentVariableFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (!/^[A-Z_][A-Z0-9_]*$/.test(formData.name.trim())) {
      newErrors.name = 'Name must be uppercase letters, numbers, and underscores only'
    }

    if (!formData.value.trim()) {
      newErrors.value = 'Value is required'
    }

    if (!formData.folder_id) {
      newErrors.folder_id = 'Folder is required'
    }

    if (!formData.master_password.trim()) {
      newErrors.master_password = 'Master password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof EnvironmentVariableFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleNameChange = (value: string) => {
    // Auto-convert to uppercase and replace spaces with underscores
    const formattedValue = value.toUpperCase().replace(/\s+/g, '_')
    handleInputChange('name', formattedValue)
    setShowSuggestions(true)
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleInputChange('name', suggestion)
    setShowSuggestions(false)
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      await EnvironmentVariablesService.create({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        value: formData.value,
        environment: formData.environment,
        folder_id: formData.folder_id
      }, formData.master_password)

      toast.success('Environment variable created successfully')
      handleClose()
      onSuccess()
    } catch (error) {
      console.error('Error creating environment variable:', error)
      toast.error('Failed to create environment variable')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    setTagInput('')
    setShowValue(false)
    setShowSuggestions(false)
    setShowMasterPassword(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add New Environment Variable</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter variable name (e.g., DATABASE_URL)"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Variable names should be UPPERCASE with underscores (e.g., API_KEY, DATABASE_URL)
            </p>
            
            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.slice(0, 10).map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter description (optional)"
            />
          </div>

          {/* Folder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder *
            </label>
            <select
              value={formData.folder_id}
              onChange={(e) => handleInputChange('folder_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.folder_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a folder</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            {errors.folder_id && (
              <p className="mt-1 text-sm text-red-600">{errors.folder_id}</p>
            )}
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment
            </label>
            <select
              value={formData.environment}
              onChange={(e) => handleInputChange('environment', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {environments.map(env => (
                <option key={env} value={env}>
                  {env.charAt(0).toUpperCase() + env.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Value *
            </label>
            <div className="relative">
              <textarea
                value={formData.value}
                onChange={(e) => handleInputChange('value', e.target.value)}
                rows={formData.is_sensitive ? 3 : 4}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${
                  errors.value ? 'border-red-500' : 'border-gray-300'
                } ${formData.is_sensitive && !showValue ? 'font-mono' : ''}`}
                placeholder="Enter variable value"
                style={{
                  WebkitTextSecurity: formData.is_sensitive && !showValue ? 'disc' : 'none'
                } as React.CSSProperties}
              />
              {formData.is_sensitive && (
                <button
                  type="button"
                  onClick={() => setShowValue(!showValue)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
            {errors.value && (
              <p className="mt-1 text-sm text-red-600">{errors.value}</p>
            )}
          </div>

          {/* Master Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Master Password *
            </label>
            <div className="relative">
              <input
                type={showMasterPassword ? 'text' : 'password'}
                value={formData.master_password}
                onChange={(e) => handleInputChange('master_password', e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.master_password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter master password for encryption"
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword(!showMasterPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.master_password && (
              <p className="mt-1 text-sm text-red-600">{errors.master_password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              This password will be used to encrypt the environment variable value
            </p>
          </div>

          {/* Sensitive Toggle */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_sensitive}
                onChange={(e) => handleInputChange('is_sensitive', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Sensitive Value
                </span>
                <p className="text-xs text-gray-500">
                  Check this if the value contains sensitive information (passwords, API keys, etc.)
                </p>
              </div>
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tag and press Enter"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Variable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}