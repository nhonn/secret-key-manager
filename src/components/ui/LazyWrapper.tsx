import React, { Suspense, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import { bundleAnalyzer } from '../../utils/bundleAnalysis';

interface LazyWrapperProps {
  children: React.ReactNode;
  loadingMessage?: string;
  fallback?: React.ReactNode;
  chunkName?: string;
}

const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  loadingMessage = 'Loading page...', 
  fallback,
  chunkName
}) => {
  useEffect(() => {
    if (chunkName && import.meta.env.DEV) {
      bundleAnalyzer.trackChunkLoadStart(chunkName);
      
      // Track when component is actually rendered
      const timer = setTimeout(() => {
        bundleAnalyzer.trackChunkLoadEnd(chunkName);
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [chunkName]);

  const defaultFallback = (
    <div className="min-h-screen bg-gray-50">
      <LoadingSpinner 
        size="lg" 
        message={loadingMessage} 
        fullScreen={false}
      />
    </div>
  );

  return (
    <ErrorBoundary>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyWrapper;