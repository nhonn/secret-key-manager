/**
 * Bundle Analysis Utilities
 * Helps track and analyze code splitting and lazy loading performance
 */

export interface ChunkLoadInfo {
  chunkName: string
  loadTime: number
  size?: number
  timestamp: Date
}

class BundleAnalyzer {
  private loadedChunks: Map<string, ChunkLoadInfo> = new Map()
  private loadStartTimes: Map<string, number> = new Map()

  /**
   * Track when a chunk starts loading
   */
  trackChunkLoadStart(chunkName: string): void {
    this.loadStartTimes.set(chunkName, performance.now())
    console.log(`🚀 Loading chunk: ${chunkName}`)
  }

  /**
   * Track when a chunk finishes loading
   */
  trackChunkLoadEnd(chunkName: string): void {
    const startTime = this.loadStartTimes.get(chunkName)
    if (startTime) {
      const loadTime = performance.now() - startTime
      const chunkInfo: ChunkLoadInfo = {
        chunkName,
        loadTime,
        timestamp: new Date()
      }
      
      this.loadedChunks.set(chunkName, chunkInfo)
      this.loadStartTimes.delete(chunkName)
      
      console.log(`✅ Chunk loaded: ${chunkName} (${loadTime.toFixed(2)}ms)`)
    }
  }

  /**
   * Get performance stats for all loaded chunks
   */
  getPerformanceStats(): ChunkLoadInfo[] {
    return Array.from(this.loadedChunks.values())
  }

  /**
   * Get average load time across all chunks
   */
  getAverageLoadTime(): number {
    const stats = this.getPerformanceStats()
    if (stats.length === 0) return 0
    
    const totalTime = stats.reduce((sum, chunk) => sum + chunk.loadTime, 0)
    return totalTime / stats.length
  }

  /**
   * Log performance summary to console
   */
  logPerformanceSummary(): void {
    const stats = this.getPerformanceStats()
    const avgTime = this.getAverageLoadTime()
    
    console.group('📊 Bundle Performance Summary')
    console.log(`Total chunks loaded: ${stats.length}`)
    console.log(`Average load time: ${avgTime.toFixed(2)}ms`)
    
    if (stats.length > 0) {
      console.table(stats.map(chunk => ({
        Chunk: chunk.chunkName,
        'Load Time (ms)': chunk.loadTime.toFixed(2),
        'Loaded At': chunk.timestamp.toLocaleTimeString()
      })))
    }
    
    console.groupEnd()
  }
}

// Global instance
export const bundleAnalyzer = new BundleAnalyzer()

// Development helper to show bundle info
if (import.meta.env.DEV) {
  // Add to window for debugging
  ;(window as any).bundleAnalyzer = bundleAnalyzer
  
  // Log summary every 10 seconds in development
  setInterval(() => {
    if (bundleAnalyzer.getPerformanceStats().length > 0) {
      bundleAnalyzer.logPerformanceSummary()
    }
  }, 10000)
}