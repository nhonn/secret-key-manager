import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email?: string;
  resource_type: 'secret' | 'api_key' | 'environment_variable';
  resource_id: string;
  resource_name?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'IMPORT';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuditLogFilters {
  resource_type?: string;
  resource_id?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export class AuditLogService {
  /**
   * Log a manual audit entry (for VIEW actions or custom events)
   */
  static async logAction(
    resourceType: 'secret' | 'api_key' | 'environment_variable',
    resourceId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'IMPORT',
    metadata?: Record<string, any>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          resource_type: resourceType,
          resource_id: resourceId,
          action,
          metadata: metadata || null,
          ip_address: null, // Could be populated from request headers in a real app
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('Error logging audit action:', error);
        // Don't throw here to avoid breaking the main functionality
      }
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw here to avoid breaking the main functionality
    }
  }

  /**
   * Get audit logs with optional filtering
   */
  static async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }

    if (filters.resource_id) {
      query = query.eq('resource_id', filters.resource_id);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100); // Default limit
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    return (data || []) as AuditLogEntry[];
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getResourceAuditLogs(
    resourceType: 'secret' | 'api_key' | 'environment_variable',
    resourceId: string
  ): Promise<AuditLogEntry[]> {
    return this.getAuditLogs({
      resource_type: resourceType,
      resource_id: resourceId,
      limit: 50
    });
  }

  /**
   * Get recent audit activity summary
   */
  static async getRecentActivity(limit: number = 20): Promise<AuditLogEntry[]> {
    return this.getAuditLogs({ limit });
  }

  /**
   * Get audit statistics for dashboard
   */
  static async getAuditStats(days: number = 30): Promise<{
    total_actions: number;
    actions_by_type: Record<string, number>;
    resources_by_type: Record<string, number>;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('audit_logs')
      .select('action, resource_type')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Error fetching audit stats:', error);
      throw new Error(`Failed to fetch audit stats: ${error.message}`);
    }

    const stats = {
      total_actions: data?.length || 0,
      actions_by_type: {} as Record<string, number>,
      resources_by_type: {} as Record<string, number>
    };

    data?.forEach(log => {
      // Count actions
      stats.actions_by_type[log.action] = (stats.actions_by_type[log.action] || 0) + 1;
      
      // Count resources
      stats.resources_by_type[log.resource_type] = (stats.resources_by_type[log.resource_type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export audit logs as CSV
   */
  static async exportAuditLogs(filters: AuditLogFilters = {}): Promise<string> {
    const logs = await this.getAuditLogs({ ...filters, limit: 1000 });
    
    const headers = [
      'Date',
      'User Email',
      'Resource Type',
      'Resource Name',
      'Action',
      'Changes'
    ];

    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const changes = log.action === 'UPDATE' 
        ? 'Modified'
        : log.action === 'CREATE'
        ? 'Created'
        : log.action === 'DELETE'
        ? 'Deleted'
        : log.action;

      const row = [
        new Date(log.created_at).toLocaleString(),
        log.user_email || 'Unknown',
        log.resource_type,
        log.resource_name || 'Unknown',
        log.action,
        changes
      ];

      csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    return csvRows.join('\n');
  }
}