/**
 * Development Performance Monitor Component
 * 
 * This component provides a real-time performance dashboard
 * for monitoring query performance during development.
 */

import React, { useState, useEffect } from 'react'
import { performanceMonitor, logPerformanceDashboard } from '../../lib/performance'

interface PerformanceMonitorProps {
  isVisible?: boolean
  onToggle?: () => void
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible = false,
  onToggle
}) => {
  const [stats, setStats] = useState(performanceMonitor.getStats())
  const [slowQueries, setSlowQueries] = useState(performanceMonitor.getSlowQueries(5))
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setStats(performanceMonitor.getStats())
      setSlowQueries(performanceMonitor.getSlowQueries(5))
    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [isVisible])

  const handleClearMetrics = () => {
    performanceMonitor.clear()
    setStats(performanceMonitor.getStats())
    setSlowQueries([])
  }

  const handleLogDashboard = () => {
    logPerformanceDashboard()
  }

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show Performance Monitor"
      >
        📊
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl z-50 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          📊 Performance Monitor
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '📉' : '📈'}
          </button>
          <button
            onClick={onToggle}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            title="Hide Monitor"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-medium text-blue-800">Total Queries</div>
            <div className="text-lg font-bold text-blue-600">{stats.totalQueries}</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="font-medium text-green-800">Avg Duration</div>
            <div className="text-lg font-bold text-green-600">{stats.averageDuration}ms</div>
          </div>
          <div className="bg-yellow-50 p-2 rounded">
            <div className="font-medium text-yellow-800">Cache Hit Rate</div>
            <div className="text-lg font-bold text-yellow-600">
              {(stats.cacheHitRate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-red-50 p-2 rounded">
            <div className="font-medium text-red-800">Slow Queries</div>
            <div className="text-lg font-bold text-red-600">{stats.slowQueries}</div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Query Breakdown */}
          {Object.keys(stats.queryBreakdown).length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <h4 className="font-medium text-gray-800 mb-2">Query Breakdown</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(stats.queryBreakdown)
                  .sort(([, a], [, b]) => b.averageDuration - a.averageDuration)
                  .slice(0, 5)
                  .map(([queryName, breakdown]) => (
                    <div key={queryName} className="flex justify-between text-xs">
                      <span className="truncate flex-1 mr-2" title={queryName}>
                        {queryName}
                      </span>
                      <span className="text-gray-600">
                        {breakdown.averageDuration}ms ({breakdown.count})
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent Slow Queries */}
          {slowQueries.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <h4 className="font-medium text-gray-800 mb-2 text-red-600">
                🐌 Recent Slow Queries
              </h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {slowQueries.map((query, index) => (
                  <div key={index} className="text-xs">
                    <div className="flex justify-between">
                      <span className="truncate flex-1 mr-2" title={query.queryName}>
                        {query.queryName}
                      </span>
                      <span className="text-red-600 font-medium">
                        {query.duration}ms
                      </span>
                    </div>
                    <div className="text-gray-500">
                      {query.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-3 flex gap-2">
            <button
              onClick={handleClearMetrics}
              className="flex-1 bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
            >
              Clear Metrics
            </button>
            <button
              onClick={handleLogDashboard}
              className="flex-1 bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
            >
              Log to Console
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Hook to manage performance monitor visibility
 */
export const usePerformanceMonitor = () => {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('performance-monitor-visible') === 'true'
  })

  const toggle = () => {
    const newValue = !isVisible
    setIsVisible(newValue)
    if (typeof window !== 'undefined') {
      localStorage.setItem('performance-monitor-visible', String(newValue))
    }
  }

  return { isVisible, toggle }
}

/**
 * Performance Monitor Provider for easy integration
 */
export const PerformanceMonitorProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const { isVisible, toggle } = usePerformanceMonitor()

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <PerformanceMonitor isVisible={isVisible} onToggle={toggle} />
    </>
  )
}