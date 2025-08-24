import { supabase } from '../lib/supabase'
import { EncryptionService, EncryptedData } from './encryption'
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
  folder_id?: string
  tags?: string[]
}

export interface UpdateSecretData {
  name?: string
  value?: string
  description?: string
  folder_id?: string
  tags?: string[]
}

export class SecretsService {
  /**
   * Creates a new encrypted secret
   */
  static async createSecret(
    secretData: CreateSecretData,
    masterPassword: string
  ): Promise<Secret> {
    try {
      // Encrypt the secret value
      const encryptedData = await EncryptionService.encrypt(secretData.value, masterPassword)
      
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
        folder_id: secretData.folder_id || null,
        tags: secretData.tags || null
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

      return data
    } catch (error) {
      console.error('Create secret error:', error)
      throw error
    }
  }

  /**
   * Retrieves and decrypts a secret by ID
   */
  static async getSecret(id: string, masterPassword: string): Promise<DecryptedSecret> {
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

      // Decrypt the secret value
      const encryptedData: EncryptedData = {
        data: data.encrypted_value!,
        iv: data.encryption_iv!,
        salt: data.encryption_salt!
      }

      const decryptedValue = await EncryptionService.decrypt(encryptedData, masterPassword)

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
   * Retrieves all secrets for the current user (without decrypting values)
   */
  static async getSecrets(): Promise<Secret[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('secrets')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching secrets:', error)
        throw new Error(`Failed to fetch secrets: ${error.message}`)
      }

      return data || []
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
    updateData: UpdateSecretData,
    masterPassword?: string
  ): Promise<Secret> {
    try {
      let secretUpdate: SecretUpdate = {
        name: updateData.name,
        description: updateData.description,
        folder_id: updateData.folder_id,
        tags: updateData.tags,
        updated_at: new Date().toISOString()
      }

      // If value is being updated, encrypt it
      if (updateData.value && masterPassword) {
        const encryptedData = await EncryptionService.encrypt(updateData.value, masterPassword)
        secretUpdate = {
          ...secretUpdate,
          encrypted_value: encryptedData.data,
          encryption_iv: encryptedData.iv,
          encryption_salt: encryptedData.salt
        }
      }

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
      const { error } = await supabase
        .from('secrets')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting secret:', error)
        throw new Error(`Failed to delete secret: ${error.message}`)
      }
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
        .select('*')
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
   * Gets secrets by folder
   */
  static async getSecretsByFolder(folderId: string): Promise<Secret[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('secrets')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching secrets by folder:', error)
        throw new Error(`Failed to fetch secrets by folder: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get secrets by folder error:', error)
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
        .select('*')
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