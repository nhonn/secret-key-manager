import { supabase } from '../lib/supabase';
import { EncryptionService, EncryptedData } from './encryption';
import { AuditLogService } from './auditLog';
import { queryCache, CacheKeys, CacheInvalidation } from '../lib/cache';
import { withPerformanceMonitoring, performanceMonitor } from '../lib/performance';
import type { Database } from '../types/database';

type ApiKey = Database['public']['Tables']['api_keys']['Row'];
type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert'];
type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update'];

export interface DecryptedApiKey extends Omit<ApiKey, 'encrypted_key' | 'encryption_iv' | 'encryption_salt'> {
  key: string // Decrypted key
  decrypted_key?: string
}

export interface CreateApiKeyData {
  name: string;
  key: string;
  description?: string;
  service?: string;
  project_id?: string;
  expires_at?: string;
}

export interface UpdateApiKeyData {
  name?: string;
  key?: string;
  description?: string;
  url?: string;
  tags?: string[];
  project_id?: string;
  expires_at?: string;
}

export interface ApiKeyWithDecrypted extends ApiKey {
  key: string;
  decrypted_key?: string;
}

export class ApiKeysService {
  /**
   * Create a new API key with encryption
   */
  static async create(
    data: CreateApiKeyData
  ): Promise<ApiKey> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('API key name is required');
    }
    if (!data.key?.trim()) {
      throw new Error('API key value is required');
    }

    // Encrypt the API key using user-based encryption
    const encryptedData = await EncryptionService.encrypt(data.key);

    const insertData: ApiKeyInsert = {
      user_id: user.id,
      name: data.name.trim(),
      encrypted_key: encryptedData.data,
      encryption_iv: encryptedData.iv,
      encryption_salt: encryptedData.salt,
      description: data.description?.trim() || null,
      service: data.service?.trim() || null,
      project_id: data.project_id || null,
      expires_at: data.expires_at || null,
    };

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating API key:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        insertData
      });
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    // Invalidate related caches
    CacheInvalidation.invalidateApiKeys(user.id, apiKey.project_id);

    // Log audit event
    try {
      await AuditLogService.logAction(
        'api_key',
        apiKey.id,
        'CREATE',
        {
          name: apiKey.name,
          description: apiKey.description,
          service: apiKey.service,
          project_id: apiKey.project_id,
          expires_at: apiKey.expires_at
        }
      )
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError)
    }

    return apiKey;
  }

  /**
   * Get a single API key by ID
   */
  static async getById(id: string): Promise<DecryptedApiKey | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching API key:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        id
      });
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }

    if (!apiKey) {
      return null;
    }

    // Decrypt the API key using user-based encryption
    const encryptedData: EncryptedData = {
      data: apiKey.encrypted_key!,
      iv: apiKey.encryption_iv!,
      salt: apiKey.encryption_salt!
    };

    const decryptedKey = await EncryptionService.decrypt(encryptedData);

    // Return decrypted API key without encryption fields
    const { encrypted_key, encryption_iv, encryption_salt, ...apiKeyWithoutEncryption } = apiKey;
    
    return {
      ...apiKeyWithoutEncryption,
      key: decryptedKey,
      decrypted_key: decryptedKey
    };
  }

  /**
   * Get all API keys for the current user (without decrypting)
   */
  static async getAll(): Promise<ApiKey[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userId = user.id;
    const cacheKey = CacheKeys.userApiKeys(userId);
    
    // Try cache first
    const cached = queryCache.get<ApiKey[]>(cacheKey);
    if (cached) {
      // Record cache hit
      performanceMonitor.recordQuery({
        queryName: 'getApiKeys',
        duration: 0,
        userId: user.id,
        cacheHit: true,
        resultCount: cached.length
      });
      return cached;
    }

    // Fetch with performance monitoring
    const apiKeys = await withPerformanceMonitoring(
      'getApiKeys',
      async () => {
        const { data: apiKeys, error } = await supabase
          .from('api_keys')
          .select(`
            id,
            name,
            encrypted_key,
            service,
            url,
            description,
            tags,
            project_id,
            expires_at,
            access_count,
            created_at,
            updated_at,
            encryption_iv,
            encryption_salt,
            user_id
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching API keys:', error);
          throw new Error(`Failed to fetch API keys: ${error.message}`);
        }

        return apiKeys || [];
      },
      { trackParameters: false, trackResultCount: true }
    )();

    queryCache.set(cacheKey, apiKeys, 5 * 60 * 1000); // Cache for 5 minutes
    return apiKeys;
  }

  /**
   * Get API keys by project ID
   */
  static async getByProject(projectId: string): Promise<ApiKey[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        name,
        service,
        url,
        description,
        tags,
        project_id,
        expires_at,
        access_count,
        created_at,
        updated_at,
        encryption_iv,
        encryption_salt,
        encrypted_key,
        user_id
      `)
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys by project:', error);
      throw new Error(`Failed to fetch API keys: ${error.message}`);
    }

    return apiKeys || [];
  }



  /**
   * Update an API key
   */
  static async update(id: string, data: UpdateApiKeyData): Promise<ApiKey> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate that the API key exists and belongs to the user
    const existingApiKey = await ApiKeysService.getById(id);
    if (!existingApiKey) {
      throw new Error('API key not found');
    }

    const updateData: ApiKeyUpdate = {
      updated_at: new Date().toISOString(),
    };

    // Update fields if provided
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error('API key name cannot be empty');
      }
      updateData.name = data.name.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.url !== undefined) {
      updateData.url = data.url?.trim() || null;
    }

    if (data.tags !== undefined) {
      updateData.tags = data.tags && data.tags.length > 0 ? data.tags : null;
    }

    if (data.project_id !== undefined) {
      updateData.project_id = data.project_id || null;
    }

    if (data.expires_at !== undefined) {
      updateData.expires_at = data.expires_at || null;
    }

    // Handle key encryption if key is being updated
    if (data.key !== undefined) {
      if (!data.key.trim()) {
        throw new Error('API key value cannot be empty');
      }
      const encryptedData = await EncryptionService.encrypt(data.key);
      updateData.encrypted_key = encryptedData.data;
      updateData.encryption_iv = encryptedData.iv;
      updateData.encryption_salt = encryptedData.salt;
    }

    // Get old values for audit log
    const { data: oldApiKey } = await supabase
      .from('api_keys')
      .select('name, description, service, project_id, expires_at, tags, url')
      .eq('id', id)
      .single()

    const { data: updatedApiKey, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating API key:', error);
      throw new Error(`Failed to update API key: ${error.message}`);
    }

    // Invalidate related caches
    CacheInvalidation.invalidateApiKeys(user.id, updatedApiKey.project_id);

    // Log audit event
    try {
      await AuditLogService.logAction(
        'api_key',
        id,
        'UPDATE',
        {
          old_values: oldApiKey ? {
            name: oldApiKey.name,
            description: oldApiKey.description,
            service: oldApiKey.service,
            project_id: oldApiKey.project_id,
            expires_at: oldApiKey.expires_at,
            tags: oldApiKey.tags,
            url: oldApiKey.url
          } : null,
          new_values: {
            name: updatedApiKey.name,
            description: updatedApiKey.description,
            service: updatedApiKey.service,
            project_id: updatedApiKey.project_id,
            expires_at: updatedApiKey.expires_at,
            tags: updatedApiKey.tags,
            url: updatedApiKey.url
          }
        }
      )
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError)
    }

    return updatedApiKey;
  }

  /**
   * Delete an API key
   */
  static async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get API key data for audit log before deletion
    const { data: apiKeyToDelete } = await supabase
      .from('api_keys')
      .select('name, description, service, project_id, expires_at, tags, url')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting API key:', error);
      throw new Error(`Failed to delete API key: ${error.message}`);
    }

    // Invalidate related caches
    if (apiKeyToDelete) {
      CacheInvalidation.invalidateApiKeys(user.id, apiKeyToDelete.project_id);
    }

    // Log audit event
    try {
      await AuditLogService.logAction(
        'api_key',
        id,
        'DELETE',
        {
          old_values: apiKeyToDelete ? {
            name: apiKeyToDelete.name,
            description: apiKeyToDelete.description,
            service: apiKeyToDelete.service,
            project_id: apiKeyToDelete.project_id,
            expires_at: apiKeyToDelete.expires_at,
            tags: apiKeyToDelete.tags,
            url: apiKeyToDelete.url
          } : null
        }
      )
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError)
    }
  }

  /**
   * Decrypt an API key
   */
  static async decrypt(apiKey: ApiKey): Promise<string> {
    if (!apiKey.encryption_iv || !apiKey.encryption_salt) {
      throw new Error('API key encryption data is missing');
    }

    try {
      const encryptedData: EncryptedData = {
        data: apiKey.encrypted_key!,
        iv: apiKey.encryption_iv,
        salt: apiKey.encryption_salt
      };
      return await EncryptionService.decrypt(encryptedData);
    } catch (error) {
      console.error('Error decrypting API key:', error);
      throw new Error('Failed to decrypt API key - authentication required');
    }
  }

  /**
   * Decrypt an API key value by ID
   */
  static async decryptApiKey(id: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data: apiKey, error } = await supabase
        .from('api_keys')
        .select('encryption_iv, encryption_salt')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch API key: ${error.message}`);
      }

      if (!apiKey) {
        throw new Error('API key not found');
      }

      const encryptedData: EncryptedData = {
        data: '',
        iv: apiKey.encryption_iv,
        salt: apiKey.encryption_salt
      };

      return await EncryptionService.decrypt(encryptedData);
    } catch (error) {
      console.error('Error decrypting API key:', error);
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Search API keys by name or description
   */
  static async search(query: string): Promise<ApiKey[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!query.trim()) {
      return ApiKeysService.getAll();
    }

    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        name,
        service,
        url,
        description,
        tags,
        project_id,
        expires_at,
        access_count,
        created_at,
        updated_at,
        encryption_iv,
        encryption_salt,
        encrypted_key,
        user_id
      `)
      .eq('user_id', user.id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,url.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching API keys:', error);
      throw new Error(`Failed to search API keys: ${error.message}`);
    }

    return apiKeys || [];
  }

  /**
   * Get API keys with decrypted values (use with caution)
   */
  static async getAllWithDecrypted(): Promise<ApiKeyWithDecrypted[]> {
    const apiKeys = await ApiKeysService.getAll();
    const decryptedApiKeys: ApiKeyWithDecrypted[] = [];

    for (const apiKey of apiKeys) {
      try {
        const decryptedKey = await ApiKeysService.decrypt(apiKey);
        decryptedApiKeys.push({
          ...apiKey,
          key: decryptedKey,
          decrypted_key: decryptedKey,
        });
      } catch (error) {
        console.error(`Failed to decrypt API key ${apiKey.id}:`, error);
        // Include the API key without decrypted value
        decryptedApiKeys.push({
          ...apiKey,
          key: '',
          decrypted_key: undefined,
        });
      }
    }

    return decryptedApiKeys;
  }

  /**
   * Validate API key data
   */
  static validateApiKeyData(data: Partial<CreateApiKeyData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('API key name is required');
    } else if (data.name.length > 255) {
      errors.push('API key name must be less than 255 characters');
    }

    if (!data.key?.trim()) {
      errors.push('API key value is required');
    } else if (data.key.length > 1000) {
      errors.push('API key value must be less than 1000 characters');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    if (data.service && data.service.length > 255) {
      errors.push('Service name must be less than 255 characters');
    }

    if (data.expires_at) {
      const expiryDate = new Date(data.expires_at);
      if (isNaN(expiryDate.getTime())) {
        errors.push('Invalid expiry date format');
      } else if (expiryDate <= new Date()) {
        errors.push('Expiry date must be in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}