/**
 * Bundle Monitor Component
 * Development-only component to display code splitting and lazy loading performance
 */

import React, { useState, useEffect } from 'react'
import { bundleAnalyzer, type ChunkLoadInfo } from '../../utils/bundleAnalysis'

interface BundleMonitorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

const BundleMonitor: React.FC<BundleMonitorProps> = ({ position = 'bottom-right' }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [chunks, setChunks] = useState<ChunkLoadInfo[]>([])
  const [averageLoadTime, setAverageLoadTime] = useState(0)

  useEffect(() => {
    const updateStats = () => {
      const stats = bundleAnalyzer.getPerformanceStats()
      const avgTime = bundleAnalyzer.getAverageLoadTime()
      setChunks(stats)
      setAverageLoadTime(avgTime)
    }

    // Update immediately
    updateStats()

    // Update every 2 seconds
    const interval = setInterval(updateStats, 2000)

    return () => clearInterval(interval)
  }, [])

  // Don't render in production
  if (import.meta.env.PROD) {
    return null
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  const getLoadTimeColor = (loadTime: number) => {
    if (loadTime < 100) return 'text-green-600'
    if (loadTime < 300) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        title="Bundle Performance Monitor"
      >
        📦 {chunks.length}
      </button>

      {/* Monitor Panel */}
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Bundle Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Summary Stats */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Performance Summary</div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Chunks Loaded:</span>
              <span className="text-sm font-bold text-blue-600">{chunks.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Avg Load Time:</span>
              <span className={`text-sm font-bold ${getLoadTimeColor(averageLoadTime)}`}>
                {averageLoadTime.toFixed(1)}ms
              </span>
            </div>
          </div>

          {/* Chunk List */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-2">Loaded Chunks:</div>
            {chunks.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No chunks loaded yet</div>
            ) : (
              chunks.map((chunk, index) => (
                <div key={index} className="bg-gray-50 rounded p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {chunk.chunkName}
                    </span>
                    <span className={`text-xs font-bold ${getLoadTimeColor(chunk.loadTime)}`}>
                      {chunk.loadTime.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {chunk.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={() => {
                bundleAnalyzer.logPerformanceSummary()
                console.log('📊 Check console for detailed bundle analysis')
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Log to Console
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BundleMonitor