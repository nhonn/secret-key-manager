import React, { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApiKeysService } from '../services/apiKeys'
import { CredentialFoldersService } from '../services/credentialFolders'
import type { CredentialFolder } from '../types/database'

interface AddApiKeyFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  folderId?: string
}

interface ApiKeyFormData {
  name: string
  description: string
  key_value: string
  provider: string
  environment: string
  permissions: string[]
  expires_at: string
  tags: string[]
  folder_id: string
  master_password: string
}

const initialFormData: ApiKeyFormData = {
  name: '',
  description: '',
  key_value: '',
  provider: '',
  environment: 'production',
  permissions: [],
  expires_at: '',
  tags: [],
  folder_id: '',
  master_password: ''
}

const commonProviders = [
  'OpenAI',
  'Anthropic',
  'Google Cloud',
  'AWS',
  'Azure',
  'Stripe',
  'GitHub',
  'GitLab',
  'Vercel',
  'Netlify',
  'Firebase',
  'Supabase',
  'MongoDB',
  'Redis',
  'Twilio',
  'SendGrid',
  'Mailgun',
  'Other'
]

const environments = [
  'development',
  'staging',
  'production',
  'testing'
]

export const AddApiKeyForm: React.FC<AddApiKeyFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  folderId
}) => {
  const [formData, setFormData] = useState<ApiKeyFormData>(initialFormData)
  const [folders, setFolders] = useState<CredentialFolder[]>([])
  const [showKey, setShowKey] = useState(false)
  const [showMasterPassword, setShowMasterPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [permissionInput, setPermissionInput] = useState('')
  const [errors, setErrors] = useState<Partial<ApiKeyFormData>>({})

  useEffect(() => {
    if (isOpen) {
      loadFolders()
      if (folderId) {
        setFormData(prev => ({ ...prev, folder_id: folderId }))
      }
    }
  }, [isOpen, folderId])

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
    const newErrors: Partial<ApiKeyFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.key_value.trim()) {
      newErrors.key_value = 'API key value is required'
    }

    if (!formData.provider.trim()) {
      newErrors.provider = 'Provider is required'
    }

    if (!formData.folder_id) {
      newErrors.folder_id = 'Folder is required'
    }

    if (!formData.master_password.trim()) {
      newErrors.master_password = 'Master password is required for encryption'
    }

    if (formData.expires_at && new Date(formData.expires_at) <= new Date()) {
      newErrors.expires_at = 'Expiration date must be in the future'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof ApiKeyFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
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

  const handleAddPermission = () => {
    const permission = permissionInput.trim()
    if (permission && !formData.permissions.includes(permission)) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permission]
      }))
      setPermissionInput('')
    }
  }

  const handleRemovePermission = (permissionToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.filter(permission => permission !== permissionToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      await ApiKeysService.create({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        key: formData.key_value.trim(),
        service: formData.provider.trim(),
        expires_at: formData.expires_at || null,
        folder_id: formData.folder_id
      }, formData.master_password.trim())

      toast.success('API key created successfully')
      handleClose()
      onSuccess()
    } catch (error) {
      console.error('Error creating API key:', error)
      toast.error('Failed to create API key')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    setTagInput('')
    setPermissionInput('')
    setShowKey(false)
    setShowMasterPassword(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add New API Key</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter API key name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
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

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider *
            </label>
            <select
              value={formData.provider}
              onChange={(e) => handleInputChange('provider', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.provider ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a provider</option>
              {commonProviders.map(provider => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
            {errors.provider && (
              <p className="mt-1 text-sm text-red-600">{errors.provider}</p>
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

          {/* API Key Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key Value *
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={formData.key_value}
                onChange={(e) => handleInputChange('key_value', e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.key_value ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter API key value"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.key_value && (
              <p className="mt-1 text-sm text-red-600">{errors.key_value}</p>
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
              This password will be used to encrypt your API key for secure storage
            </p>
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiration Date
            </label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => handleInputChange('expires_at', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.expires_at ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.expires_at && (
              <p className="mt-1 text-sm text-red-600">{errors.expires_at}</p>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={permissionInput}
                  onChange={(e) => setPermissionInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddPermission()
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter permission and press Enter"
                />
                <button
                  type="button"
                  onClick={handleAddPermission}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.permissions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.permissions.map(permission => (
                    <span
                      key={permission}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {permission}
                      <button
                        type="button"
                        onClick={() => handleRemovePermission(permission)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
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
              {isLoading ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}