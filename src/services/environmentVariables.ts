import { supabase } from '../lib/supabase';
import { EncryptionService, EncryptedData } from './encryption';
import type { Database } from '../types/database';

type EnvironmentVariable = Database['public']['Tables']['environment_variables']['Row'];
type EnvironmentVariableInsert = Database['public']['Tables']['environment_variables']['Insert'];
type EnvironmentVariableUpdate = Database['public']['Tables']['environment_variables']['Update'];

export interface DecryptedEnvironmentVariable extends Omit<EnvironmentVariable, 'encrypted_value' | 'encryption_iv' | 'encryption_salt'> {
  value: string // Decrypted value
}

export interface CreateEnvironmentVariableData {
  name: string;
  value: string;
  environment?: string;
  description?: string;
  folder_id?: string;
}

export interface UpdateEnvironmentVariableData {
  name?: string;
  value?: string;
  environment?: string;
  description?: string;
  folder_id?: string;
}

export interface EnvironmentVariableWithDecrypted extends EnvironmentVariable {
  value: string;
  decrypted_value?: string;
}

export interface DecryptedEnvironmentVariable extends Omit<EnvironmentVariable, 'encrypted_value' | 'encryption_iv' | 'encryption_salt'> {
  value: string;
  decrypted_value?: string;
}

export class EnvironmentVariablesService {
  /**
   * Create a new environment variable with encryption
   */
  static async create(
    data: CreateEnvironmentVariableData,
    masterPassword: string
  ): Promise<EnvironmentVariable> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error('Environment variable name is required');
    }
    if (!data.value?.trim()) {
      throw new Error('Environment variable value is required');
    }

    // Validate environment variable name format
    const nameRegex = /^[A-Z][A-Z0-9_]*$/;
    if (!nameRegex.test(data.name.trim())) {
      throw new Error('Environment variable name must start with a letter and contain only uppercase letters, numbers, and underscores');
    }

    // Encrypt the value
    const encryptedData = await EncryptionService.encrypt(data.value, masterPassword);

    const insertData: EnvironmentVariableInsert = {
      user_id: user.id,
      name: data.name.trim(),
      encrypted_value: encryptedData.data,
      encryption_iv: encryptedData.iv,
      encryption_salt: encryptedData.salt,
      description: data.description?.trim() || null,
      folder_id: data.folder_id || null,
    };

    const { data: envVar, error } = await supabase
      .from('environment_variables')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating environment variable:', error);
      throw new Error(`Failed to create environment variable: ${error.message}`);
    }

    return envVar;
  }

  /**
   * Get a single environment variable by ID
   */
  static async getById(id: string, masterPassword: string): Promise<DecryptedEnvironmentVariable | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: envVar, error } = await supabase
      .from('environment_variables')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching environment variable:', error);
      throw new Error(`Failed to fetch environment variable: ${error.message}`);
    }

    if (!envVar) {
      return null;
    }

    // Decrypt the environment variable value
    const encryptedData: EncryptedData = {
      data: envVar.encrypted_value!,
      iv: envVar.encryption_iv!,
      salt: envVar.encryption_salt!
    };

    const decryptedValue = await EncryptionService.decrypt(encryptedData, masterPassword);

    // Return decrypted environment variable without encryption fields
    const { encrypted_value, encryption_iv, encryption_salt, ...envVarWithoutEncryption } = envVar;
    
    return {
      ...envVarWithoutEncryption,
      value: decryptedValue,
      decrypted_value: decryptedValue
    };
  }

  /**
   * Get all environment variables for the current user (without decrypting)
   */
  static async getAll(): Promise<EnvironmentVariable[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: envVars, error } = await supabase
      .from('environment_variables')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching environment variables:', error);
      throw new Error(`Failed to fetch environment variables: ${error.message}`);
    }

    return envVars || [];
  }

  /**
   * Get environment variables by folder ID
   */
  static async getByFolder(folderId: string): Promise<EnvironmentVariable[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: envVars, error } = await supabase
      .from('environment_variables')
      .select('*')
      .eq('user_id', user.id)
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching environment variables by folder:', error);
      throw new Error(`Failed to fetch environment variables: ${error.message}`);
    }

    return envVars || [];
  }



  /**
   * Update an environment variable
   */
  static async update(id: string, data: UpdateEnvironmentVariableData, masterPassword?: string): Promise<EnvironmentVariable> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate that the environment variable exists and belongs to the user
    const existingEnvVar = await EnvironmentVariablesService.getById(id, masterPassword || '');
    if (!existingEnvVar) {
      throw new Error('Environment variable not found');
    }

    const updateData: EnvironmentVariableUpdate = {
      updated_at: new Date().toISOString(),
    };

    // Update fields if provided
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error('Environment variable name cannot be empty');
      }
      // Validate environment variable name format
      const nameRegex = /^[A-Z][A-Z0-9_]*$/;
      if (!nameRegex.test(data.name.trim())) {
        throw new Error('Environment variable name must start with a letter and contain only uppercase letters, numbers, and underscores');
      }
      updateData.name = data.name.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.folder_id !== undefined) {
      updateData.folder_id = data.folder_id || null;
    }

    // Handle value encryption if value is being updated
    if (data.value !== undefined && masterPassword) {
      if (!data.value.trim()) {
        throw new Error('Environment variable value cannot be empty');
      }
      const encryptedData = await EncryptionService.encrypt(data.value, masterPassword);
      updateData.encrypted_value = encryptedData.data;
      updateData.encryption_iv = encryptedData.iv;
      updateData.encryption_salt = encryptedData.salt;
    }

    const { data: updatedEnvVar, error } = await supabase
      .from('environment_variables')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating environment variable:', error);
      throw new Error(`Failed to update environment variable: ${error.message}`);
    }

    return updatedEnvVar;
  }

  /**
   * Delete an environment variable
   */
  static async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('environment_variables')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting environment variable:', error);
      throw new Error(`Failed to delete environment variable: ${error.message}`);
    }
  }

  /**
   * Decrypt an environment variable value
   */
  static async decrypt(envVar: EnvironmentVariable, masterPassword: string): Promise<string> {
    if (!envVar.encryption_iv || !envVar.encryption_salt) {
      throw new Error('Environment variable encryption data is missing');
    }

    try {
      const encryptedData: EncryptedData = {
        data: envVar.encrypted_value!,
        iv: envVar.encryption_iv,
        salt: envVar.encryption_salt
      };
      return await EncryptionService.decrypt(encryptedData, masterPassword);
    } catch (error) {
      console.error('Error decrypting environment variable:', error);
      throw new Error('Failed to decrypt environment variable');
    }
  }

  /**
   * Search environment variables by name or description
   */
  static async search(query: string): Promise<EnvironmentVariable[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!query.trim()) {
      return EnvironmentVariablesService.getAll();
    }

    const { data: envVars, error } = await supabase
      .from('environment_variables')
      .select('*')
      .eq('user_id', user.id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching environment variables:', error);
      throw new Error(`Failed to search environment variables: ${error.message}`);
    }

    return envVars || [];
  }

  /**
   * Get environment variables with decrypted values (use with caution)
   */
  static async getAllWithDecrypted(masterPassword: string): Promise<EnvironmentVariableWithDecrypted[]> {
    const envVars = await EnvironmentVariablesService.getAll();
    const decryptedEnvVars: EnvironmentVariableWithDecrypted[] = [];

    for (const envVar of envVars) {
      try {
        const decryptedValue = await EnvironmentVariablesService.decrypt(envVar, masterPassword);
        decryptedEnvVars.push({
          ...envVar,
          value: decryptedValue,
          decrypted_value: decryptedValue,
        });
      } catch (error) {
        console.error(`Failed to decrypt environment variable ${envVar.id}:`, error);
        // Include the environment variable without decrypted value
        decryptedEnvVars.push({
          ...envVar,
          value: '',
          decrypted_value: undefined,
        });
      }
    }

    return decryptedEnvVars;
  }

  /**
   * Generate .env file content from environment variables
   */
  static async generateEnvFile(masterPassword: string, folderId?: string): Promise<string> {
    const envVars = folderId ? await EnvironmentVariablesService.getByFolder(folderId) : await EnvironmentVariablesService.getAll();
    const lines: string[] = [];

    for (const envVar of envVars) {
      try {
        const decryptedValue = await EnvironmentVariablesService.decrypt(envVar, masterPassword);
        // Add comment if description exists
        if (envVar.description) {
          lines.push(`# ${envVar.description}`);
        }
        lines.push(`${envVar.name}=${decryptedValue}`);
        lines.push(''); // Empty line for readability
      } catch (error) {
        console.error(`Failed to decrypt environment variable ${envVar.id}:`, error);
        lines.push(`# ERROR: Could not decrypt ${envVar.name}`);
        lines.push(`# ${envVar.name}=<ENCRYPTED_VALUE>`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Validate environment variable data
   */
  static validateEnvironmentVariableData(data: Partial<CreateEnvironmentVariableData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Environment variable name is required');
    } else {
      const nameRegex = /^[A-Z][A-Z0-9_]*$/;
      if (!nameRegex.test(data.name.trim())) {
        errors.push('Environment variable name must start with a letter and contain only uppercase letters, numbers, and underscores');
      }
      if (data.name.length > 255) {
        errors.push('Environment variable name must be less than 255 characters');
      }
    }

    if (!data.value?.trim()) {
      errors.push('Environment variable value is required');
    } else if (data.value.length > 2000) {
      errors.push('Environment variable value must be less than 2000 characters');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }



    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}