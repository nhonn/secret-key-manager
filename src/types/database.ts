export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      secrets: {
        Row: {
          id: string
          user_id: string
          name: string
          encrypted_value: string
          description: string | null
          tags: string[] | null
          expires_at: string | null
          access_count: number | null
          created_at: string | null
          updated_at: string | null
          project_id: string | null
          encryption_iv: string | null
          encryption_salt: string | null
          url: string | null
          username: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          encrypted_value: string
          description?: string | null
          tags?: string[] | null
          expires_at?: string | null
          access_count?: number | null
          created_at?: string | null
          updated_at?: string | null
          project_id?: string | null
          encryption_iv?: string | null
          encryption_salt?: string | null
          url?: string | null
          username?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          encrypted_value?: string
          description?: string | null
          tags?: string[] | null
          expires_at?: string | null
          access_count?: number | null
          created_at?: string | null
          updated_at?: string | null
          project_id?: string | null
          encryption_iv?: string | null
          encryption_salt?: string | null
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secrets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secrets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
          Row: {
            color: string | null
            created_at: string
            description: string | null
            id: string
            name: string
            parent_id: string | null
            updated_at: string
            user_id: string
          }
          Insert: {
            color?: string | null
            created_at?: string
            description?: string | null
            id?: string
            name: string
            parent_id?: string | null
            updated_at?: string
            user_id: string
          }
          Update: {
            color?: string | null
            created_at?: string
            description?: string | null
            id?: string
            name?: string
            parent_id?: string | null
            updated_at?: string
            user_id?: string
          }
          Relationships: [
            {
              foreignKeyName: "projects_parent_id_fkey"
              columns: ["parent_id"]
              isOneToOne: false
              referencedRelation: "projects"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "projects_user_id_fkey"
              columns: ["user_id"]
              isOneToOne: false
              referencedRelation: "users"
              referencedColumns: ["id"]
            }
          ]
        }
      api_keys: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          name: string
          encrypted_key: string
          service: string | null
          description: string | null
          expires_at: string | null
          access_count: number | null
          created_at: string | null
          updated_at: string | null
          encryption_iv: string | null
          encryption_salt: string | null
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          name: string
          encrypted_key: string
          service?: string | null
          description?: string | null
          expires_at?: string | null
          access_count?: number | null
          created_at?: string | null
          updated_at?: string | null
          encryption_iv?: string | null
          encryption_salt?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          name?: string
          encrypted_key?: string
          service?: string | null
          description?: string | null
          expires_at?: string | null
          access_count?: number | null
          created_at?: string | null
          updated_at?: string | null
          encryption_iv?: string | null
          encryption_salt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      environment_variables: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          name: string
          encrypted_value: string
          environment: string | null
          description: string | null
          created_at: string | null
          updated_at: string | null
          encryption_iv: string | null
          encryption_salt: string | null
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          name: string
          encrypted_value: string
          environment?: string | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
          encryption_iv?: string | null
          encryption_salt?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          name?: string
          encrypted_value?: string
          environment?: string | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
          encryption_iv?: string | null
          encryption_salt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "environment_variables_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_variables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      access_logs: {
        Row: {
          id: string
          user_id: string
          resource_type: string
          resource_id: string
          action: string
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          resource_type: string
          resource_id: string
          action: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          resource_type?: string
          resource_id?: string
          action?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
        delete_user_data: {
          Args: {
            user_uuid: string
          }
          Returns: undefined
        }
      }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Export individual types for easier use
export type Secret = Database['public']['Tables']['secrets']['Row']
export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type EnvironmentVariable = Database['public']['Tables']['environment_variables']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type AccessLog = Database['public']['Tables']['access_logs']['Row']