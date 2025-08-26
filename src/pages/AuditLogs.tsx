import React, { useState, useEffect } from 'react';
import { AuditLogService, AuditLogEntry } from '../services/auditLog';
import { formatDistanceToNow } from 'date-fns';
import { 
  MagnifyingGlassIcon, 
  ArrowDownTrayIcon,
  FunnelIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  ShieldCheckIcon,
  KeyIcon,
  CogIcon
} from '@heroicons/react/24/solid';


// Using AuditLogEntry from the service

interface AuditStats {
  total_actions: number;
  actions_by_type: Record<string, number>;
  resources_by_type: Record<string, number>;
}

const AuditLogs: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 50;
  


  useEffect(() => {
    loadAuditLogs();
    loadStats();
  }, [currentPage, searchQuery, selectedResourceType, selectedAction, dateRange]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const filters: any = {
        limit: logsPerPage,
        offset: (currentPage - 1) * logsPerPage
      };

      if (searchQuery) filters.search = searchQuery;
      if (selectedResourceType) filters.resource_type = selectedResourceType;
      if (selectedAction) filters.action = selectedAction;
      if (dateRange.from) filters.from_date = dateRange.from;
      if (dateRange.to) filters.to_date = dateRange.to;

      const data = await AuditLogService.getAuditLogs(filters);
      setAuditLogs(data);
      setTotalPages(Math.ceil(data.length / logsPerPage));
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await AuditLogService.getAuditStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading audit stats:', error);
    }
  };

  const handleExport = async () => {
    try {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedResourceType) filters.resource_type = selectedResourceType;
      if (selectedAction) filters.action = selectedAction;
      if (dateRange.from) filters.from_date = dateRange.from;
      if (dateRange.to) filters.to_date = dateRange.to;

      const csvContent = await AuditLogService.exportAuditLogs(filters);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'text-green-600 bg-green-50';
      case 'update': return 'text-blue-600 bg-blue-50';
      case 'delete': return 'text-red-600 bg-red-50';
      case 'view': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getResourceTypeIcon = (resourceType: string) => {
    const iconClass = "h-4 w-4";
    switch (resourceType.toLowerCase()) {
      case 'secret': 
        return <ShieldCheckIcon className={`${iconClass} text-blue-600`} />;
      case 'api_key': 
        return <KeyIcon className={`${iconClass} text-green-600`} />;
      case 'environment_variable': 
        return <CogIcon className={`${iconClass} text-purple-600`} />;
      default: 
        return <DocumentTextIcon className={`${iconClass} text-gray-600`} />;
    }
  };

  const formatJsonValue = (value: any) => {
    if (!value) return null;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedResourceType('');
    setSelectedAction('');
    setDateRange({ from: '', to: '' });
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Logs</h1>
              <p className="text-gray-600">Track all system activities and changes across your organization</p>
            </div>
            <div className="hidden sm:flex items-center space-x-3">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Live monitoring</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Actions</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_actions.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">All time</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Most Common Action</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {Object.entries(stats.actions_by_type).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Object.entries(stats.actions_by_type).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} times
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <ClockIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Most Active Resource</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {Object.entries(stats.resources_by_type).sort(([,a], [,b]) => b - a)[0]?.[0]?.replace('_', ' ') || 'None'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Object.entries(stats.resources_by_type).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} actions
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <UserIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by user, action, or resource..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-4 py-3 border rounded-lg shadow-sm text-sm font-medium transition-colors ${
                    showFilters 
                      ? 'border-blue-300 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                  Filters
                  {(selectedResourceType || selectedAction || dateRange.from || dateRange.to) && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-3 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  title="Export Audit Logs"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="border-t border-gray-100 pt-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resource Type
                    </label>
                    <select
                      value={selectedResourceType}
                      onChange={(e) => setSelectedResourceType(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    >
                      <option value="">All Types</option>
                      <option value="secret">🔐 Secrets</option>
                      <option value="api_key">🔑 API Keys</option>
                      <option value="environment_variable">⚙️ Environment Variables</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action Type
                    </label>
                    <select
                      value={selectedAction}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    >
                      <option value="">All Actions</option>
                      <option value="CREATE">✅ Create</option>
                      <option value="UPDATE">📝 Update</option>
                      <option value="DELETE">🗑️ Delete</option>
                      <option value="VIEW">👁️ View</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CalendarDaysIcon className="inline h-4 w-4 mr-1" />
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CalendarDaysIcon className="inline h-4 w-4 mr-1" />
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    {(selectedResourceType || selectedAction || dateRange.from || dateRange.to) ? (
                      <span>Filters applied - showing filtered results</span>
                    ) : (
                      <span>No filters applied - showing all results</span>
                    )}
                  </div>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Clear all filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading audit logs...</p>
              <p className="text-sm text-gray-500 mt-1">Please wait while we fetch the data</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <DocumentTextIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
              <p className="text-gray-500 mb-4">There are no audit logs matching your current filters.</p>
              {(selectedResourceType || selectedAction || dateRange.from || dateRange.to || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear filters and show all logs
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <CalendarDaysIcon className="h-4 w-4" />
                        <span>Timestamp</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>👤</span>
                        <span>User</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>📁</span>
                        <span>Resource</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>⚡</span>
                        <span>Action</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>📝</span>
                        <span>Changes</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>🌐</span>
                        <span>IP Address</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {auditLogs.map((log, index) => (
                      <tr key={log.id} className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(log.created_at!).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.created_at!).toLocaleTimeString()}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(log.created_at!))} ago
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-blue-600">
                                {(log.user_email || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{log.user_email || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{log.user_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3">
                              {getResourceTypeIcon(log.resource_type)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 capitalize">
                                {log.resource_type.replace('_', ' ')}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {log.resource_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                            <span className="mr-1">
                              {log.action === 'CREATE' ? '✨' : 
                               log.action === 'UPDATE' ? '📝' : 
                               log.action === 'DELETE' ? '🗑️' : 
                               log.action === 'VIEW' ? '👁️' : '⚡'}
                            </span>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm">
                          <div className="max-w-xs">
                            {log.old_values && (
                              <div className="mb-2">
                                <details className="group">
                                  <summary className="cursor-pointer text-red-600 hover:text-red-800 font-medium text-xs mb-1">
                                    Previous Values
                                  </summary>
                                  <div className="bg-red-50 border border-red-200 rounded-md p-2 mt-1">
                                    <pre className="text-xs text-red-700 overflow-x-auto whitespace-pre-wrap">
                                      {formatJsonValue(log.old_values)}
                                    </pre>
                                  </div>
                                </details>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <details className="group">
                                  <summary className="cursor-pointer text-green-600 hover:text-green-800 font-medium text-xs mb-1">
                                    Current Values
                                  </summary>
                                  <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-1">
                                    <pre className="text-xs text-green-700 overflow-x-auto whitespace-pre-wrap">
                                      {formatJsonValue(log.new_values)}
                                    </pre>
                                  </div>
                                </details>
                              </div>
                            )}
                            {!log.old_values && !log.new_values && (
                              <span className="text-gray-400 text-xs">No changes recorded</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900">{log.user_email || 'N/A'}</div>
                          {log.metadata && (
                            <div className="text-xs text-gray-500 mt-1">
                              {Object.keys(log.metadata).length} metadata fields
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="h-4 w-4 mr-1" />
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
                        <span className="font-semibold text-gray-900">{totalPages}</span>
                      </p>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <span>•</span>
                        <span>{auditLogs.length} items</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Page navigation */}
                      <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                        
                        {/* Page numbers */}
                        {(() => {
                          const pages = [];
                          const maxVisiblePages = 5;
                          let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                          
                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                                  currentPage === i
                                    ? 'z-10 bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                          return pages;
                        })()}
                        
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;