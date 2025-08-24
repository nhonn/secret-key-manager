import type { User } from '@supabase/supabase-js'

// User types
export interface AppUser extends User {
  id: string
  email: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
    provider?: string
  }
}

// Secret types
export interface Secret {
  id: string
  user_id: string
  name: string
  encrypted_value: string
  description?: string
  tags?: string[]
  expires_at?: string
  access_count: number
  created_at: string
  updated_at: string
}

export interface CreateSecretData {
  name: string
  value: string
  description?: string
  tags?: string[]
  expires_at?: string
}

export interface UpdateSecretData {
  name?: string
  value?: string
  description?: string
  tags?: string[]
  expires_at?: string
}

// Credential folder types
export interface CredentialFolder {
  id: string
  user_id: string
  name: string
  description?: string
  parent_id?: string
  created_at: string
  updated_at: string
  children?: CredentialFolder[]
}

export interface CreateFolderData {
  name: string
  description?: string
  parent_id?: string
}

// API Key types
export interface ApiKey {
  id: string
  user_id: string
  folder_id?: string
  name: string
  encrypted_key: string
  service?: string
  description?: string
  expires_at?: string
  access_count: number
  created_at: string
  updated_at: string
}

export interface CreateApiKeyData {
  name: string
  key: string
  folder_id?: string
  service?: string
  description?: string
  expires_at?: string
}

export interface UpdateApiKeyData {
  name?: string
  key?: string
  folder_id?: string
  service?: string
  description?: string
  expires_at?: string
}

// Environment Variable types
export interface EnvironmentVariable {
  id: string
  user_id: string
  folder_id?: string
  name: string
  encrypted_value: string
  environment?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface CreateEnvVarData {
  name: string
  value: string
  folder_id?: string
  environment?: string
  description?: string
}

export interface UpdateEnvVarData {
  name?: string
  value?: string
  folder_id?: string
  environment?: string
  description?: string
}

// Access Log types
export interface AccessLog {
  id: string
  user_id: string
  resource_type: string
  resource_id: string
  action: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Encryption types
export interface EncryptionKey {
  key: CryptoKey
  salt: Uint8Array
}

export interface EncryptedData {
  data: string
  iv: string
  salt: string
}

// UI types
export interface DashboardStats {
  totalSecrets: number
  totalApiKeys: number
  totalEnvVars: number
  totalFolders: number
  recentActivity: AccessLog[]
}

export interface SearchFilters {
  query: string
  tags: string[]
  dateRange?: {
    start: string
    end: string
  }
}

// Form types
export interface FormError {
  field: string
  message: string
}

export interface FormState {
  isSubmitting: boolean
  errors: FormError[]
}

// Navigation types
export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
}

// Modal types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}