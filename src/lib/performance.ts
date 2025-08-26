/**
 * Database Query Performance Monitoring and Testing Utilities
 * 
 * This module provides tools to monitor database query performance,
 * track slow queries, and test query optimization effectiveness.
 */

import { supabase } from './supabase'

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  FAST: 100,
  NORMAL: 500,
  SLOW: 1000,
  VERY_SLOW: 2000
} as const

type PerformanceLevel = keyof typeof PERFORMANCE_THRESHOLDS

interface QueryMetrics {
  queryName: string
  duration: number
  timestamp: Date
  userId?: string
  parameters?: Record<string, any>
  resultCount?: number
  cacheHit?: boolean
  performanceLevel: PerformanceLevel
}

interface PerformanceStats {
  totalQueries: number
  averageDuration: number
  slowQueries: number
  fastQueries: number
  cacheHitRate: number
  queryBreakdown: Record<string, {
    count: number
    averageDuration: number
    slowestDuration: number
    fastestDuration: number
  }>
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = []
  private maxMetrics = 1000 // Keep last 1000 queries
  private isEnabled = process.env.NODE_ENV === 'development'

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Record a query performance metric
   */
  recordQuery(metric: Omit<QueryMetrics, 'performanceLevel' | 'timestamp'>): void {
    if (!this.isEnabled) return

    const performanceLevel = this.getPerformanceLevel(metric.duration)
    const fullMetric: QueryMetrics = {
      ...metric,
      timestamp: new Date(),
      performanceLevel
    }

    this.metrics.push(fullMetric)

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log slow queries in development
    if (performanceLevel === 'SLOW' || performanceLevel === 'VERY_SLOW') {
      console.warn(`🐌 Slow query detected: ${metric.queryName} took ${metric.duration}ms`, {
        parameters: metric.parameters,
        resultCount: metric.resultCount,
        cacheHit: metric.cacheHit
      })
    }
  }

  /**
   * Get performance level based on duration
   */
  private getPerformanceLevel(duration: number): PerformanceLevel {
    if (duration <= PERFORMANCE_THRESHOLDS.FAST) return 'FAST'
    if (duration <= PERFORMANCE_THRESHOLDS.NORMAL) return 'NORMAL'
    if (duration <= PERFORMANCE_THRESHOLDS.SLOW) return 'SLOW'
    return 'VERY_SLOW'
  }

  /**
   * Get comprehensive performance statistics
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        fastQueries: 0,
        cacheHitRate: 0,
        queryBreakdown: {}
      }
    }

    const totalQueries = this.metrics.length
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const averageDuration = totalDuration / totalQueries
    
    const slowQueries = this.metrics.filter(m => 
      m.performanceLevel === 'SLOW' || m.performanceLevel === 'VERY_SLOW'
    ).length
    
    const fastQueries = this.metrics.filter(m => 
      m.performanceLevel === 'FAST'
    ).length

    const cacheHits = this.metrics.filter(m => m.cacheHit === true).length
    const cacheHitRate = cacheHits / totalQueries

    // Query breakdown by name
    const queryBreakdown: Record<string, any> = {}
    this.metrics.forEach(metric => {
      if (!queryBreakdown[metric.queryName]) {
        queryBreakdown[metric.queryName] = {
          count: 0,
          totalDuration: 0,
          slowestDuration: 0,
          fastestDuration: Infinity
        }
      }

      const breakdown = queryBreakdown[metric.queryName]
      breakdown.count++
      breakdown.totalDuration += metric.duration
      breakdown.slowestDuration = Math.max(breakdown.slowestDuration, metric.duration)
      breakdown.fastestDuration = Math.min(breakdown.fastestDuration, metric.duration)
    })

    // Calculate averages
    Object.keys(queryBreakdown).forEach(queryName => {
      const breakdown = queryBreakdown[queryName]
      breakdown.averageDuration = breakdown.totalDuration / breakdown.count
      delete breakdown.totalDuration
    })

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowQueries,
      fastQueries,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      queryBreakdown
    }
  }

  /**
   * Get recent slow queries for debugging
   */
  getSlowQueries(limit = 10): QueryMetrics[] {
    return this.metrics
      .filter(m => m.performanceLevel === 'SLOW' || m.performanceLevel === 'VERY_SLOW')
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): QueryMetrics[] {
    return [...this.metrics]
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Higher-order function to wrap database queries with performance monitoring
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryName: string,
  queryFn: T,
  options?: {
    trackParameters?: boolean
    trackResultCount?: boolean
  }
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now()
    let resultCount: number | undefined
    let error: Error | undefined

    try {
      const result = await queryFn(...args)
      
      // Try to determine result count
      if (options?.trackResultCount) {
        if (Array.isArray(result)) {
          resultCount = result.length
        } else if (result?.data && Array.isArray(result.data)) {
          resultCount = result.data.length
        }
      }

      return result
    } catch (err) {
      error = err as Error
      throw err
    } finally {
      const endTime = performance.now()
      const duration = Math.round((endTime - startTime) * 100) / 100

      performanceMonitor.recordQuery({
        queryName: error ? `${queryName} (ERROR)` : queryName,
        duration,
        parameters: options?.trackParameters ? args[0] : undefined,
        resultCount,
        cacheHit: false // Will be overridden by cache layer if applicable
      })
    }
  }) as T
}

/**
 * Performance testing utilities
 */
export class PerformanceTester {
  /**
   * Run a performance test comparing different query implementations
   */
  static async compareQueries<T>(
    testName: string,
    queries: Record<string, () => Promise<T>>,
    iterations = 5
  ): Promise<{
    testName: string
    results: Record<string, {
      averageDuration: number
      minDuration: number
      maxDuration: number
      iterations: number
    }>
    winner: string
  }> {
    console.log(`🧪 Running performance test: ${testName}`)
    
    const results: Record<string, any> = {}

    for (const [queryName, queryFn] of Object.entries(queries)) {
      const durations: number[] = []
      
      console.log(`  Testing ${queryName}...`)
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        try {
          await queryFn()
        } catch (error) {
          console.error(`    Iteration ${i + 1} failed:`, error)
        }
        const endTime = performance.now()
        durations.push(endTime - startTime)
      }

      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
      const minDuration = Math.min(...durations)
      const maxDuration = Math.max(...durations)

      results[queryName] = {
        averageDuration: Math.round(averageDuration * 100) / 100,
        minDuration: Math.round(minDuration * 100) / 100,
        maxDuration: Math.round(maxDuration * 100) / 100,
        iterations
      }

      console.log(`    Average: ${results[queryName].averageDuration}ms`)
    }

    // Determine winner (lowest average duration)
    const winner = Object.entries(results)
      .sort(([, a], [, b]) => a.averageDuration - b.averageDuration)[0][0]

    console.log(`🏆 Winner: ${winner} (${results[winner].averageDuration}ms average)`)

    return {
      testName,
      results,
      winner
    }
  }

  /**
   * Test database connection and basic query performance
   */
  static async testDatabasePerformance(): Promise<{
    connectionTime: number
    simpleQueryTime: number
    complexQueryTime: number
    status: 'healthy' | 'degraded' | 'unhealthy'
  }> {
    console.log('🔍 Testing database performance...')

    // Test connection time
    const connectionStart = performance.now()
    try {
      await supabase.from('projects').select('count').limit(1)
    } catch (error) {
      console.error('Database connection failed:', error)
      throw error
    }
    const connectionTime = performance.now() - connectionStart

    // Test simple query
    const simpleStart = performance.now()
    await supabase.from('projects').select('id').limit(10)
    const simpleQueryTime = performance.now() - simpleStart

    // Test complex query (with joins and filters)
    const complexStart = performance.now()
    await supabase
      .from('secrets')
      .select(`
        id,
        name,
        created_at,
        projects!inner(name)
      `)
      .limit(10)
    const complexQueryTime = performance.now() - complexStart

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (connectionTime > 2000 || simpleQueryTime > 1000 || complexQueryTime > 3000) {
      status = 'unhealthy'
    } else if (connectionTime > 1000 || simpleQueryTime > 500 || complexQueryTime > 1500) {
      status = 'degraded'
    } else {
      status = 'healthy'
    }

    const results = {
      connectionTime: Math.round(connectionTime * 100) / 100,
      simpleQueryTime: Math.round(simpleQueryTime * 100) / 100,
      complexQueryTime: Math.round(complexQueryTime * 100) / 100,
      status
    }

    console.log('📊 Database performance results:', results)
    return results
  }
}

/**
 * Development-only performance dashboard
 */
export function logPerformanceDashboard(): void {
  if (process.env.NODE_ENV !== 'development') return

  const stats = performanceMonitor.getStats()
  const slowQueries = performanceMonitor.getSlowQueries(5)

  console.group('📈 Performance Dashboard')
  console.log('📊 Overall Stats:', {
    totalQueries: stats.totalQueries,
    averageDuration: `${stats.averageDuration}ms`,
    slowQueries: stats.slowQueries,
    fastQueries: stats.fastQueries,
    cacheHitRate: `${(stats.cacheHitRate * 100).toFixed(1)}%`
  })

  if (Object.keys(stats.queryBreakdown).length > 0) {
    console.log('🔍 Query Breakdown:')
    Object.entries(stats.queryBreakdown)
      .sort(([, a], [, b]) => b.averageDuration - a.averageDuration)
      .slice(0, 10)
      .forEach(([queryName, breakdown]) => {
        console.log(`  ${queryName}: ${breakdown.averageDuration}ms avg (${breakdown.count} calls)`)
      })
  }

  if (slowQueries.length > 0) {
    console.warn('🐌 Recent Slow Queries:')
    slowQueries.forEach(query => {
      console.warn(`  ${query.queryName}: ${query.duration}ms at ${query.timestamp.toLocaleTimeString()}`)
    })
  }

  console.groupEnd()
}

// Auto-log performance dashboard every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
  setInterval(logPerformanceDashboard, 5 * 60 * 1000)
}