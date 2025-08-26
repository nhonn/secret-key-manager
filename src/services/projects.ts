import { supabase } from '../lib/supabase'
import { queryCache, CacheKeys, CacheInvalidation } from '../lib/cache'
import type { Database } from '../types/database'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export interface CreateProjectData {
  name: string
  description?: string
  color?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  color?: string
}

export class ProjectsService {
  /**
   * Creates a new project
   */
  static async createProject(projectData: CreateProjectData): Promise<Project> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      // Validate input data
      if (!projectData.name || !projectData.name.trim()) {
        throw new Error('Project name is required')
      }

      if (projectData.name.trim().length < 2) {
        throw new Error('Project name must be at least 2 characters long')
      }

      if (projectData.name.trim().length > 50) {
        throw new Error('Project name must be less than 50 characters')
      }

      if (projectData.description && projectData.description.length > 200) {
        throw new Error('Description must be less than 200 characters')
      }

      // Check for duplicate project names for this user
      const { data: existingProjects, error: checkError } = await supabase
        .from('projects')
        .select('name')
        .eq('user_id', user.user.id)
        .eq('name', projectData.name.trim())
        .limit(1)

      if (checkError) {
        console.error('Error checking for duplicate project:', checkError)
        throw new Error('Failed to validate project name')
      }

      if (existingProjects && existingProjects.length > 0) {
        throw new Error('A project with this name already exists')
      }

      const projectInsert: ProjectInsert = {
        user_id: user.user.id,
        name: projectData.name.trim(),
        description: projectData.description?.trim() || null,
        color: projectData.color || '#3B82F6' // Default blue color
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(projectInsert)
        .select()
        .single()

      if (error) {
        console.error('Error creating project:', error)
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('A project with this name already exists')
        }
        throw new Error(`Failed to create project: ${error.message}`)
      }

      // Invalidate related caches
      CacheInvalidation.invalidateUser(user.user.id)

      return data
    } catch (error) {
      console.error('Create project error:', error)
      throw error
    }
  }

  /**
   * Retrieves all projects for the current user
   */
  static async getProjects(): Promise<Project[]> {
    return this.getAll()
  }

  /**
   * Retrieves all projects for the current user (alias for getProjects)
   */
  static async getAll(): Promise<Project[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const userId = user.user.id
      const cacheKey = CacheKeys.userProjects(userId)
      
      // Try cache first
      const cached = queryCache.get<Project[]>(cacheKey)
      if (cached) return cached

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, color, user_id, parent_id, created_at, updated_at')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching projects:', error)
        throw new Error(`Failed to fetch projects: ${error.message}`)
      }

      const result = data || []
      queryCache.set(cacheKey, result, 10 * 60 * 1000) // Cache for 10 minutes (projects change less frequently)
      return result
    } catch (error) {
      console.error('Get projects error:', error)
      throw error
    }
  }

  /**
   * Retrieves a project by ID
   */
  static async getProject(id: string): Promise<Project> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new Error('Project ID is required and must be a string')
      }

      // Check user authentication
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, color, user_id, parent_id, created_at, updated_at')
        .eq('id', id)
        .eq('user_id', user.user.id) // Ensure user can only access their own projects
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Project not found or access denied')
        }
        console.error('Error fetching project:', error)
        throw new Error(`Failed to fetch project: ${error.message}`)
      }

      if (!data) {
        throw new Error('Project not found or access denied')
      }

      return data
    } catch (error) {
      console.error('Get project error:', error)
      throw error
    }
  }

  /**
   * Updates a project
   */
  static async updateProject(id: string, updateData: UpdateProjectData): Promise<Project> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      // Validate input data
      if (updateData.name !== undefined) {
        if (!updateData.name || !updateData.name.trim()) {
          throw new Error('Project name is required')
        }

        if (updateData.name.trim().length < 2) {
          throw new Error('Project name must be at least 2 characters long')
        }

        if (updateData.name.trim().length > 50) {
          throw new Error('Project name must be less than 50 characters')
        }

        // Check for duplicate project names for this user (excluding current project)
        const { data: existingProjects, error: checkError } = await supabase
          .from('projects')
          .select('name')
          .eq('user_id', user.user.id)
          .eq('name', updateData.name.trim())
          .neq('id', id)
          .limit(1)

        if (checkError) {
          console.error('Error checking for duplicate project:', checkError)
          throw new Error('Failed to validate project name')
        }

        if (existingProjects && existingProjects.length > 0) {
          throw new Error('A project with this name already exists')
        }
      }

      if (updateData.description !== undefined && updateData.description && updateData.description.length > 200) {
        throw new Error('Description must be less than 200 characters')
      }

      // Verify project ownership
      const { data: existingProject, error: ownershipError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', id)
        .single()

      if (ownershipError) {
        console.error('Error verifying project ownership:', ownershipError)
        if (ownershipError.code === 'PGRST116') {
          throw new Error('Project not found')
        }
        throw new Error('Failed to verify project ownership')
      }

      if (existingProject.user_id !== user.user.id) {
        throw new Error('You do not have permission to update this project')
      }

      const projectUpdate: ProjectUpdate = {
        name: updateData.name?.trim(),
        description: updateData.description?.trim(),
        color: updateData.color,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('projects')
        .update(projectUpdate)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating project:', error)
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('A project with this name already exists')
        }
        throw new Error(`Failed to update project: ${error.message}`)
      }

      // Invalidate related caches
      if (data) {
        CacheInvalidation.invalidateUser(data.user_id)
      }

      return data
    } catch (error) {
      console.error('Update project error:', error)
      throw error
    }
  }

  /**
   * Deletes a project
   */
  static async deleteProject(id: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      // Verify project exists and user owns it
      const { data: existingProject, error: ownershipError } = await supabase
        .from('projects')
        .select('user_id, name')
        .eq('id', id)
        .single()

      if (ownershipError) {
        console.error('Error verifying project ownership:', ownershipError)
        if (ownershipError.code === 'PGRST116') {
          throw new Error('Project not found')
        }
        throw new Error('Failed to verify project ownership')
      }

      if (existingProject.user_id !== user.user.id) {
        throw new Error('You do not have permission to delete this project')
      }

      // Check if there are any secrets in this project
      const { data: secrets, error: secretsError } = await supabase
        .from('secrets')
        .select('id')
        .eq('project_id', id)
        .limit(1)

      if (secretsError) {
        console.error('Error checking project secrets:', secretsError)
        throw new Error('Failed to check project contents')
      }

      // Check if there are any API keys in this project
      const { data: apiKeys, error: apiKeysError } = await supabase
        .from('api_keys')
        .select('id')
        .eq('project_id', id)
        .limit(1)

      if (apiKeysError) {
        console.error('Error checking project API keys:', apiKeysError)
        throw new Error('Failed to check project contents')
      }

      // Check if there are any environment variables in this project
      const { data: envVars, error: envVarsError } = await supabase
        .from('environment_variables')
        .select('id')
        .eq('project_id', id)
        .limit(1)

      if (envVarsError) {
        console.error('Error checking project environment variables:', envVarsError)
        throw new Error('Failed to check project contents')
      }

      const totalItems = (secrets?.length || 0) + (apiKeys?.length || 0) + (envVars?.length || 0)
      if (totalItems > 0) {
        const itemTypes = []
        if (secrets?.length) itemTypes.push('secrets')
        if (apiKeys?.length) itemTypes.push('API keys')
        if (envVars?.length) itemTypes.push('environment variables')
        
        throw new Error(`Cannot delete project "${existingProject.name}" because it contains ${itemTypes.join(', ')}. Please move or delete them first.`)
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting project:', error)
        throw new Error(`Failed to delete project: ${error.message}`)
      }

      // Invalidate related caches
      CacheInvalidation.invalidateUser(existingProject.user_id)
    } catch (error) {
      console.error('Delete project error:', error)
      throw error
    }
  }

  /**
   * Gets project statistics (number of secrets)
   */
  static async getProjectStats(id: string): Promise<{ secretCount: number }> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new Error('Project ID is required and must be a string')
      }

      // Check user authentication
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      // First verify the project exists and belongs to the user
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.user.id)
        .single()

      if (projectError || !project) {
        throw new Error('Project not found or access denied')
      }

      const { count, error } = await supabase
        .from('secrets')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id)

      if (error) {
        console.error('Error getting project stats:', error)
        throw new Error(`Failed to get project stats: ${error.message}`)
      }

      return {
        secretCount: count || 0
      }
    } catch (error) {
      console.error('Get project stats error:', error)
      throw error
    }
  }

  /**
   * Searches projects by name or description
   */
  static async searchProjects(query: string): Promise<Project[]> {
    try {
      // Validate input
      if (typeof query !== 'string') {
        throw new Error('Search query must be a string')
      }

      // If query is empty, return all projects
      if (!query.trim()) {
        return this.getAll()
      }

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      // Sanitize query to prevent SQL injection
      const sanitizedQuery = query.trim().replace(/[%_]/g, '\\$&')

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, color, user_id, parent_id, created_at, updated_at')
        .eq('user_id', user.user.id)
        .or(`name.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching projects:', error)
        throw new Error(`Failed to search projects: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Search projects error:', error)
      throw error
    }
  }

  /**
   * Creates default projects for a new user
   */
  static async createDefaultProjects(): Promise<Project[]> {
    try {
      const defaultProjects = [
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

      const createdProjects: Project[] = []

      for (const projectData of defaultProjects) {
        try {
          const project = await this.createProject(projectData)
          createdProjects.push(project)
        } catch (error) {
          console.warn(`Failed to create default project ${projectData.name}:`, error)
          // Continue creating other projects even if one fails
        }
      }

      return createdProjects
    } catch (error) {
      console.error('Create default projects error:', error)
      throw error
    }
  }

  // Method aliases for consistency with component usage
  static async create(projectData: CreateProjectData): Promise<Project> {
    return this.createProject(projectData)
  }

  static async update(id: string, updateData: UpdateProjectData): Promise<Project> {
    return this.updateProject(id, updateData)
  }

  static async delete(id: string): Promise<void> {
    return this.deleteProject(id)
  }
}