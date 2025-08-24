import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type CredentialFolder = Database['public']['Tables']['credential_folders']['Row']
type CredentialFolderInsert = Database['public']['Tables']['credential_folders']['Insert']
type CredentialFolderUpdate = Database['public']['Tables']['credential_folders']['Update']

export interface CreateFolderData {
  name: string
  description?: string
  color?: string
}

export interface UpdateFolderData {
  name?: string
  description?: string
  color?: string
}

export class CredentialFoldersService {
  /**
   * Creates a new credential folder
   */
  static async createFolder(folderData: CreateFolderData): Promise<CredentialFolder> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const folderInsert: CredentialFolderInsert = {
        user_id: user.user.id,
        name: folderData.name,
        description: folderData.description || null,
        color: folderData.color || '#3B82F6' // Default blue color
      }

      const { data, error } = await supabase
        .from('credential_folders')
        .insert(folderInsert)
        .select()
        .single()

      if (error) {
        console.error('Error creating folder:', error)
        throw new Error(`Failed to create folder: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Create folder error:', error)
      throw error
    }
  }

  /**
   * Retrieves all folders for the current user
   */
  static async getFolders(): Promise<CredentialFolder[]> {
    return this.getAll()
  }

  /**
   * Retrieves all folders for the current user (alias for getFolders)
   */
  static async getAll(): Promise<CredentialFolder[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('credential_folders')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching folders:', error)
        throw new Error(`Failed to fetch folders: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Get folders error:', error)
      throw error
    }
  }

  /**
   * Retrieves a folder by ID
   */
  static async getFolder(id: string): Promise<CredentialFolder> {
    try {
      const { data, error } = await supabase
        .from('credential_folders')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching folder:', error)
        throw new Error(`Failed to fetch folder: ${error.message}`)
      }

      if (!data) {
        throw new Error('Folder not found')
      }

      return data
    } catch (error) {
      console.error('Get folder error:', error)
      throw error
    }
  }

  /**
   * Updates a credential folder
   */
  static async updateFolder(id: string, updateData: UpdateFolderData): Promise<CredentialFolder> {
    try {
      const folderUpdate: CredentialFolderUpdate = {
        name: updateData.name,
        description: updateData.description,
        color: updateData.color,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('credential_folders')
        .update(folderUpdate)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating folder:', error)
        throw new Error(`Failed to update folder: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Update folder error:', error)
      throw error
    }
  }

  /**
   * Deletes a credential folder
   */
  static async deleteFolder(id: string): Promise<void> {
    try {
      // First, check if there are any secrets in this folder
      const { data: secrets, error: secretsError } = await supabase
        .from('secrets')
        .select('id')
        .eq('folder_id', id)
        .limit(1)

      if (secretsError) {
        console.error('Error checking folder contents:', secretsError)
        throw new Error(`Failed to check folder contents: ${secretsError.message}`)
      }

      if (secrets && secrets.length > 0) {
        throw new Error('Cannot delete folder that contains secrets. Please move or delete the secrets first.')
      }

      const { error } = await supabase
        .from('credential_folders')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting folder:', error)
        throw new Error(`Failed to delete folder: ${error.message}`)
      }
    } catch (error) {
      console.error('Delete folder error:', error)
      throw error
    }
  }

  /**
   * Gets folder statistics (number of secrets)
   */
  static async getFolderStats(id: string): Promise<{ secretCount: number }> {
    try {
      const { count, error } = await supabase
        .from('secrets')
        .select('*', { count: 'exact', head: true })
        .eq('folder_id', id)

      if (error) {
        console.error('Error getting folder stats:', error)
        throw new Error(`Failed to get folder stats: ${error.message}`)
      }

      return {
        secretCount: count || 0
      }
    } catch (error) {
      console.error('Get folder stats error:', error)
      throw error
    }
  }

  /**
   * Searches folders by name or description
   */
  static async searchFolders(query: string): Promise<CredentialFolder[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('credential_folders')
        .select('*')
        .eq('user_id', user.user.id)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching folders:', error)
        throw new Error(`Failed to search folders: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Search folders error:', error)
      throw error
    }
  }

  /**
   * Creates default folders for a new user
   */
  static async createDefaultFolders(): Promise<CredentialFolder[]> {
    try {
      const defaultFolders = [
        {
          name: 'Personal',
          description: 'Personal accounts and credentials',
          color: '#3B82F6'
        },
        {
          name: 'Work',
          description: 'Work-related credentials and accounts',
          color: '#10B981'
        },
        {
          name: 'Development',
          description: 'API keys and development credentials',
          color: '#F59E0B'
        }
      ]

      const createdFolders: CredentialFolder[] = []

      for (const folderData of defaultFolders) {
        try {
          const folder = await this.createFolder(folderData)
          createdFolders.push(folder)
        } catch (error) {
          console.warn(`Failed to create default folder ${folderData.name}:`, error)
          // Continue creating other folders even if one fails
        }
      }

      return createdFolders
    } catch (error) {
      console.error('Create default folders error:', error)
      throw error
    }
  }
}