/**
 * Query result caching system with TTL and invalidation
 * Provides in-memory caching for database queries to improve performance
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheConfig {
  defaultTTL: number // Time to live in milliseconds
  maxSize: number    // Maximum number of entries
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      ...config
    }
  }

  /**
   * Get cached data if valid, otherwise return null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cached data with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    })
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Create singleton cache instance
export const queryCache = new QueryCache({
  defaultTTL: 3 * 60 * 1000, // 3 minutes for dashboard data
  maxSize: 50
})

// Cache key generators for consistent naming
export const CacheKeys = {
  // Dashboard data
  dashboardData: (userId: string) => `dashboard:data:${userId}`,
  dashboardSummary: (userId: string) => `dashboard:summary:${userId}`,
  
  // Projects
  userProjects: (userId: string) => `projects:user:${userId}`,
  project: (userId: string, projectId: string) => `project:${userId}:${projectId}`,
  projectStats: (userId: string, projectId: string) => `project:stats:${userId}:${projectId}`,
  
  // Secrets
  userSecrets: (userId: string) => `secrets:user:${userId}`,
  projectSecrets: (userId: string, projectId: string) => `secrets:project:${userId}:${projectId}`,
  secretSearch: (userId: string, query: string) => `secrets:search:${userId}:${query}`,
  
  // API Keys
  userApiKeys: (userId: string) => `apikeys:user:${userId}`,
  projectApiKeys: (userId: string, projectId: string) => `apikeys:project:${userId}:${projectId}`,
  apiKeySearch: (userId: string, query: string) => `apikeys:search:${userId}:${query}`,
  
  // Environment Variables
  userEnvVars: (userId: string) => `envvars:user:${userId}`,
  projectEnvVars: (userId: string, projectId: string) => `envvars:project:${userId}:${projectId}`,
}

// Cache invalidation helpers
export const CacheInvalidation = {
  // Invalidate all user data
  invalidateUser: (userId: string) => {
    queryCache.invalidatePattern(`.*:${userId}.*`)
  },
  
  // Invalidate project-related data
  invalidateProject: (userId: string, projectId: string) => {
    queryCache.invalidatePattern(`.*:${userId}:${projectId}.*`)
    queryCache.invalidate(CacheKeys.userProjects(userId))
    queryCache.invalidate(CacheKeys.dashboardData(userId))
    queryCache.invalidate(CacheKeys.dashboardSummary(userId))
  },
  
  // Invalidate secrets data
  invalidateSecrets: (userId: string, projectId?: string) => {
    queryCache.invalidate(CacheKeys.userSecrets(userId))
    queryCache.invalidate(CacheKeys.dashboardData(userId))
    queryCache.invalidate(CacheKeys.dashboardSummary(userId))
    queryCache.invalidatePattern(`secrets:search:${userId}:.*`)
    
    if (projectId) {
      queryCache.invalidate(CacheKeys.projectSecrets(userId, projectId))
      queryCache.invalidate(CacheKeys.projectStats(userId, projectId))
    }
  },
  
  // Invalidate API keys data
  invalidateApiKeys: (userId: string, projectId?: string) => {
    queryCache.invalidate(CacheKeys.userApiKeys(userId))
    queryCache.invalidate(CacheKeys.dashboardData(userId))
    queryCache.invalidate(CacheKeys.dashboardSummary(userId))
    queryCache.invalidatePattern(`apikeys:search:${userId}:.*`)
    
    if (projectId) {
      queryCache.invalidate(CacheKeys.projectApiKeys(userId, projectId))
      queryCache.invalidate(CacheKeys.projectStats(userId, projectId))
    }
  },
  
  // Invalidate environment variables data
  invalidateEnvVars: (userId: string, projectId?: string) => {
    queryCache.invalidate(CacheKeys.userEnvVars(userId))
    queryCache.invalidate(CacheKeys.dashboardData(userId))
    queryCache.invalidate(CacheKeys.dashboardSummary(userId))
    
    if (projectId) {
      queryCache.invalidate(CacheKeys.projectEnvVars(userId, projectId))
      queryCache.invalidate(CacheKeys.projectStats(userId, projectId))
    }
  },
  
  // Invalidate dashboard data
  invalidateDashboard: (userId: string) => {
    queryCache.invalidate(CacheKeys.dashboardData(userId))
    queryCache.invalidate(CacheKeys.dashboardSummary(userId))
  }
}

// Automatic cleanup every 5 minutes
setInterval(() => {
  queryCache.cleanup()
}, 5 * 60 * 1000)

/**
 * Higher-order function to add caching to any async function
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return async (...args: T): Promise<R> => {
    const cacheKey = keyGenerator(...args)
    
    // Try to get from cache first
    const cached = queryCache.get<R>(cacheKey)
    if (cached !== null) {
      return cached
    }
    
    // Execute function and cache result
    const result = await fn(...args)
    queryCache.set(cacheKey, result, ttl)
    
    return result
  }
}