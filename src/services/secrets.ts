import { supabase } from '../lib/supabase'
import { EncryptionService, EncryptedData } from './encryption'
import { AuditLogService } from './auditLog'
import { queryCache, CacheKeys, CacheInvalidation } from '../lib/cache'
import { withPerformanceMonitoring, performanceMonitor } from '../lib/performance'
import type { Database } from '../types/database'

type Secret = Database['public']['Tables']['secrets']['Row']
type SecretInsert = Database['public']['Tables']['secrets']['Insert']
type SecretUpdate = Database['public']['Tables']['secrets']['Update']

export interface DecryptedSecret extends Omit<Secret, 'encrypted_value' | 'encryption_iv' | 'encryption_salt'> {
  value: string // Decrypted value
  password?: string
}

export interface CreateSecretData {
  name: string
  value: string
  description?: string
  project_id?: string
  tags?: string[]
  expires_at?: string
  url?: string
  username?: string
}

export interface UpdateSecretData {
  name?: string
  value?: string
  description?: string
  project_id?: string
  tags?: string[]
  expires_at?: string
  url?: string
  username?: string
}

export class SecretsService {
  /**
   * Creates a new encrypted secret
   */
  static async createSecret(
    secretData: CreateSecretData
  ): Promise<Secret> {
    try {
      // Encrypt the secret value using user-based encryption
      const encryptedData = await EncryptionService.encrypt(secretData.value)
      
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const secretInsert: SecretInsert = {
        user_id: user.user.id,
        name: secretData.name,
        description: secretData.description || null,
        encrypted_value: encryptedData.data,
        encryption_iv: encryptedData.iv,
        encryption_salt: encryptedData.salt,
        project_id: secretData.project_id || null,
        tags: secretData.tags || null,
        expires_at: secretData.expires_at || null,
        url: secretData.url || null,
        username: secretData.username || null
      }

      const { data, error } = await supabase
        .from('secrets')
        .insert(secretInsert)
        .select()
        .single()

      if (error) {
        console.error('Error creating secret:', error)
        throw new Error(`Failed to create secret: ${error.message}`)
      }

      // Log audit event
      try {
        await AuditLogService.logAction(
          'secret',
          data.id,
          'CREATE',
          {
            name: data.name,
            description: data.description,
            project_id: data.project_id,
            tags: data.tags
          }
        )
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError)
      }

      // Invalidate related caches
      CacheInvalidation.invalidateSecrets(data.user_id, data.project_id)

      return data
    } catch (error) {
      console.error('Create secret error:', error)
      throw error
    }
  }

  /**
   * Retrieves and decrypts a secret by ID
   */
  static async getSecret(id: string): Promise<DecryptedSecret> {
    try {
      const { data, error } = await supabase
        .from('secrets')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching secret:', error)
        throw new Error(`Failed to fetch secret: ${error.message}`)
      }

      if (!data) {
        throw new Error('Secret not found')
      }

      // Decrypt the secret value using user-based encryption
      const encryptedData: EncryptedData = {
        data: data.encrypted_value!,
        iv: data.encryption_iv!,
        salt: data.encryption_salt!
      }

      const decryptedValue = await EncryptionService.decrypt(encryptedData)

      // Return decrypted secret without encryption fields
      const { encrypted_value, encryption_iv, encryption_salt, ...secretWithoutEncryption } = data
      
      return {
        ...secretWithoutEncryption,
        value: decryptedValue,
        password: decryptedValue
      }
    } catch (error) {
      console.error('Get secret error:', error)
      throw error
    }
  }

  /**
   * Decrypts a secret value by ID (returns only the decrypted value)
   */
  static async decryptSecret(id: string): Promise<string> {
    try {
      const { data: secret, error } = await supabase
        .from('secrets')
        .select('encrypted_value, encryption_iv, encryption_salt')
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(`Failed to fetch secret: ${error.message}`)
      }

      if (!secret) {
        throw new Error('Secret not found')
      }

      // Decrypt the secret value
      const encryptedData: EncryptedData = {
        data: secret.encrypted_value,
        iv: secret.encryption_iv,
        salt: secret.encryption_salt
      }

      return await EncryptionService.decrypt(encryptedData)
    } catch (error) {
      console.error('Error decrypting secret:', error)
      throw error
    }
  }

  /**
   * Retrieves all secrets for the current user (without decrypting values)
   */
  static async getSecrets(): Promise<Secret[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const userId = user.user.id
      const cacheKey = CacheKeys.userSecrets(userId)
      
      // Try cache first
      const cached = queryCache.get<Secret[]>(cacheKey)
      if (cached) {
        // Record cache hit
        performanceMonitor.recordQuery({
          queryName: 'getSecrets',
          duration: 0,
          userId: user.user.id,
          cacheHit: true,
          resultCount: cached.length
        })
        return cached
      }

      // Fetch with performance monitoring
      const result = await withPerformanceMonitoring(
        'getSecrets',
        async () => {
          const { data, error } = await supabase
            .from('secrets')
            .select(`
              id,
              user_id,
              name,
              description,
              encrypted_value,
              encryption_iv,
              encryption_salt,
              project_id,
              tags,
              created_at,
              updated_at,
              expires_at,
              access_count,
              url,
              username
            `)
            .eq('user_id', user.user.id)
            .order('created_at', { ascending: false })

          if (error) {
            console.error('Error fetching secrets:', error)
            throw new Error(`Failed to fetch secrets: ${error.message}`)
          }

          return data || []
        },
        { trackParameters: false, trackResultCount: true }
      )()

      queryCache.set(cacheKey, result, 5 * 60 * 1000) // Cache for 5 minutes
      return result
    } catch (error) {
      console.error('Get secrets error:', error)
      throw error
    }
  }

  /**
   * Updates an encrypted secret
   */
  static async updateSecret(
    id: string,
    updateData: UpdateSecretData
  ): Promise<Secret> {
    try {
      let secretUpdate: SecretUpdate = {
        name: updateData.name,
        description: updateData.description,
        project_id: updateData.project_id,
        tags: updateData.tags,
        expires_at: updateData.expires_at,
        url: updateData.url,
        username: updateData.username,
        updated_at: new Date().toISOString()
      }

      // If value is being updated, encrypt it using user-based encryption
      if (updateData.value) {
        const encryptedData = await EncryptionService.encrypt(updateData.value)
        secretUpdate = {
          ...secretUpdate,
          encrypted_value: encryptedData.data,
          encryption_iv: encryptedData.iv,
          encryption_salt: encryptedData.salt
        }
      }

      // Get old values for audit log
      const { data: oldSecret } = await supabase
        .from('secrets')
        .select('name, description, project_id, tags')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('secrets')
        .update(secretUpdate)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating secret:', error)
        throw new Error(`Failed to update secret: ${error.message}`)
      }

      // Log audit event
      try {
        await AuditLogService.logAction(
          'secret',
          id,
          'UPDATE',
          {
            old_values: oldSecret ? {
              name: oldSecret.name,
              description: oldSecret.description,
              project_id: oldSecret.project_id,
              tags: oldSecret.tags
            } : null,
            new_values: {
              name: data.name,
              description: data.description,
              project_id: data.project_id,
              tags: data.tags
            }
          }
        )
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError)
      }

      // Invalidate related caches
      CacheInvalidation.invalidateSecrets(data.user_id, data.project_id)

      return data
    } catch (error) {
      console.error('Update secret error:', error)
      throw error
    }
  }

  /**
   * Deletes a secret
   */
  static async deleteSecret(id: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('User not authenticated')

      // Get the secret to delete for audit logging
      const { data: secretToDelete } = await supabase
        .from('secrets')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.user.id)
        .single()

      if (!secretToDelete) {
        throw new Error('Secret not found or access denied')
      }

      const { error } = await supabase
        .from('secrets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.user.id)

      if (error) throw error

      // Log audit event
      try {
        await AuditLogService.logAction(
          'secret',
          id,
          'DELETE',
          {
            secret_name: secretToDelete.name,
            project_id: secretToDelete.project_id
          }
        )
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError)
      }

      // Invalidate related caches
      CacheInvalidation.invalidateSecrets(user.user.id, secretToDelete.project_id)
    } catch (error) {
      console.error('Delete secret error:', error)
      throw error
    }
  }

  /**
   * Searches secrets by name or description
   */
  static async searchSecrets(query: string): Promise<Secret[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('secrets')
        .select(`
          id,
          user_id,
          name,
          description,
          encrypted_value,
          encryption_iv,
          encryption_salt,
          project_id,
          tags,
          created_at,
          updated_at,
          expires_at,
          access_count,
          url,
          username
        `)
        .eq('user_id', user.user.id)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching secrets:', error)
        throw new Error(`Failed to search secrets: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Search secrets error:', error)
      throw error
    }
  }

  /**
   * Gets secrets by project
   */
  static async getSecretsByProject(projectId: string): Promise<Secret[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('secrets')
        .select(`
          id,
          user_id,
          name,
          description,
          encrypted_value,
          encryption_iv,
          encryption_salt,
          project_id,
          tags,
          created_at,
          updated_at,
          expires_at,
          access_count,
          url,
          username
        `)
        .eq('user_id', user.user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching secrets by project:', error)
        throw new Error(`Failed to fetch secrets by project: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get secrets by project error:', error)
      throw error
    }
  }

  /**
   * Gets secrets by tags
   */
  static async getSecretsByTags(tags: string[]): Promise<Secret[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('secrets')
        .select(`
          id,
          user_id,
          name,
          description,
          encrypted_value,
          encryption_iv,
          encryption_salt,
          project_id,
          tags,
          created_at,
          updated_at,
          expires_at,
          access_count,
          url,
          username
        `)
        .eq('user_id', user.user.id)
        .overlaps('tags', tags)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching secrets by tags:', error)
        throw new Error(`Failed to fetch secrets by tags: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get secrets by tags error:', error)
      throw error
    }
  }
}