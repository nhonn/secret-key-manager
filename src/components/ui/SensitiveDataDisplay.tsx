import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Eye, EyeOff, Copy, ChevronRight, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical'
export type DataType = 'secret' | 'apiKey' | 'envVar' | 'password' | 'token'

interface SensitiveDataDisplayProps {
  /** The sensitive value to display */
  value: string
  /** Security level determines truncation and masking behavior */
  securityLevel: SecurityLevel
  /** Type of data for appropriate labeling */
  dataType: DataType
  /** Custom label for the data field */
  label?: string
  /** Whether the value is currently visible */
  isVisible?: boolean
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void
  /** Whether to show copy button */
  showCopy?: boolean
  /** Whether to show expand/collapse for long values */
  allowExpand?: boolean
  /** Auto-hide timeout in milliseconds (0 to disable) */
  autoHideTimeout?: number
  /** Custom CSS classes */
  className?: string
  /** Callback for audit logging */
  onReveal?: () => void
  /** Callback for copy action */
  onCopy?: () => void
}

// Security-based configuration
const SECURITY_CONFIG = {
  critical: {
    maxVisibleLength: 8,
    truncateLength: 12,
    maskChar: '•',
    maskLength: 32,
    autoHideDefault: 10000, // 10 seconds
    requireConfirmation: true
  },
  high: {
    maxVisibleLength: 12,
    truncateLength: 16,
    maskChar: '•',
    maskLength: 24,
    autoHideDefault: 15000, // 15 seconds
    requireConfirmation: false
  },
  medium: {
    maxVisibleLength: 20,
    truncateLength: 32,
    maskChar: '•',
    maskLength: 20,
    autoHideDefault: 30000, // 30 seconds
    requireConfirmation: false
  },
  low: {
    maxVisibleLength: 40,
    truncateLength: 64,
    maskChar: '•',
    maskLength: 16,
    autoHideDefault: 0, // No auto-hide
    requireConfirmation: false
  }
} as const

const DATA_TYPE_LABELS = {
  secret: 'Secret',
  apiKey: 'API Key',
  envVar: 'Environment Variable',
  password: 'Password',
  token: 'Token'
} as const

export function SensitiveDataDisplay({
  value,
  securityLevel,
  dataType,
  label,
  isVisible: controlledVisible,
  onVisibilityChange,
  showCopy = true,
  allowExpand = true,
  autoHideTimeout,
  className = '',
  onReveal,
  onCopy
}: SensitiveDataDisplayProps) {
  const [internalVisible, setInternalVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const config = SECURITY_CONFIG[securityLevel]
  
  // Use controlled or internal visibility state
  const isVisible = controlledVisible !== undefined ? controlledVisible : internalVisible
  
  // Determine effective auto-hide timeout
  const effectiveAutoHide = autoHideTimeout !== undefined 
    ? autoHideTimeout 
    : config.autoHideDefault

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
      }
    }
  }, [])

  // Auto-hide functionality
  useEffect(() => {
    if (isVisible && effectiveAutoHide > 0) {
      autoHideTimeoutRef.current = setTimeout(() => {
        handleVisibilityChange(false)
      }, effectiveAutoHide)
    }

    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
        autoHideTimeoutRef.current = null
      }
    }
  }, [isVisible, effectiveAutoHide])

  const handleVisibilityChange = useCallback((visible: boolean) => {
    if (onVisibilityChange) {
      onVisibilityChange(visible)
    } else {
      setInternalVisible(visible)
    }

    if (visible) {
      onReveal?.()
    }
  }, [onVisibilityChange, onReveal])

  const handleRevealClick = useCallback(() => {
    if (!isVisible && config.requireConfirmation) {
      setShowConfirmation(true)
    } else {
      handleVisibilityChange(!isVisible)
    }
  }, [isVisible, config.requireConfirmation, handleVisibilityChange])

  const handleConfirmReveal = useCallback(() => {
    setShowConfirmation(false)
    handleVisibilityChange(true)
  }, [handleVisibilityChange])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label || DATA_TYPE_LABELS[dataType]} copied to clipboard`)
      onCopy?.()
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }, [value, label, dataType, onCopy])

  // Generate secure masked display
  const getMaskedValue = useCallback(() => {
    return config.maskChar.repeat(config.maskLength)
  }, [config])

  // Generate truncated display for visible values
  const getTruncatedValue = useCallback(() => {
    if (!isVisible) return getMaskedValue()
    
    if (isExpanded || value.length <= config.maxVisibleLength) {
      return value
    }
    
    return value.substring(0, config.truncateLength) + '...'
  }, [isVisible, isExpanded, value, config, getMaskedValue])

  const displayValue = getTruncatedValue()
  const canExpand = allowExpand && isVisible && value.length > config.maxVisibleLength
  const shouldShowExpand = canExpand && !isExpanded
  const shouldShowCollapse = canExpand && isExpanded

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reveal {label || DATA_TYPE_LABELS[dataType]}?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This is a {securityLevel}-security item. Are you sure you want to reveal its value?
              {effectiveAutoHide > 0 && (
                <span className="block mt-1 text-xs text-orange-600">
                  Value will auto-hide after {Math.round(effectiveAutoHide / 1000)} seconds.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReveal}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Reveal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Value Display */}
      <div className="bg-gray-50 rounded-md p-3 border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label || DATA_TYPE_LABELS[dataType]}
          </span>
          <div className="flex items-center space-x-2">
            {/* Security Level Indicator */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              securityLevel === 'critical' ? 'bg-red-100 text-red-800' :
              securityLevel === 'high' ? 'bg-orange-100 text-orange-800' :
              securityLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {securityLevel.toUpperCase()}
            </span>
            
            {/* Auto-hide indicator */}
            {isVisible && effectiveAutoHide > 0 && (
              <span className="text-xs text-gray-400">
                Auto-hide: {Math.round(effectiveAutoHide / 1000)}s
              </span>
            )}
            
            {/* Reveal/Hide Button */}
            <button
              onClick={handleRevealClick}
              className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isVisible ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Show
                </>
              )}
            </button>
            
            {/* Copy Button */}
            {showCopy && (
              <button
                onClick={handleCopy}
                className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </button>
            )}
          </div>
        </div>
        
        {/* Value Container */}
        <div className="relative">
          <div className={`font-mono text-sm break-all select-all ${
            isVisible ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {displayValue}
          </div>
          
          {/* Expand/Collapse Controls */}
          {canExpand && (
            <div className="mt-2">
              {shouldShowExpand && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ChevronRight className="h-3 w-3 mr-1" />
                  Show full value ({value.length} characters)
                </button>
              )}
              {shouldShowCollapse && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Collapse
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SensitiveDataDisplay