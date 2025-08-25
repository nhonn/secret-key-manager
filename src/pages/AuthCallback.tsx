import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../store/authStore'
import { AuthService } from '../services/auth'

const AuthCallback: React.FC = () => {
  const { setUser, addToast } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('loading')
        console.log('🚀 AuthCallback component: Starting authentication process...')
        
        // Check URL parameters more thoroughly
        const urlParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        
        console.log('🔍 URL Analysis:', {
          search: window.location.search,
          hash: window.location.hash,
          href: window.location.href
        })
        
        // Check for OAuth errors first
        const oauthError = urlParams.get('error') || hashParams.get('error')
        if (oauthError) {
          const errorDescription = urlParams.get('error_description') || hashParams.get('error_description')
          throw new Error(`OAuth Error: ${oauthError}${errorDescription ? ` - ${errorDescription}` : ''}`)
        }
        
        // Handle the OAuth callback with enhanced error handling
        console.log('🔐 Calling AuthService.handleOAuthCallback...')
        const user = await AuthService.handleOAuthCallback()
        
        if (user) {
          console.log('✅ Authentication successful:', { userId: user.id, email: user.email })
          setUser(user)
          setStatus('success')
          
          addToast({
            type: 'success',
            title: 'Welcome!',
            message: `Successfully signed in as ${user.email}`
          })
          
          // Redirect will happen via Navigate component
        } else {
          console.error('❌ No user data received from authentication')
          throw new Error('Authentication completed but no user data was received. Please try again.')
        }
      } catch (error) {
        console.error('💥 Auth callback error in component:', error)
        
        let errorMessage = 'Authentication failed'
        if (error instanceof Error) {
          errorMessage = error.message
          
          // Provide user-friendly error messages
          if (error.message.includes('OAuth callback failed')) {
            errorMessage = error.message
          } else if (error.message.includes('Auth session missing')) {
            errorMessage = 'Authentication session could not be established. This might be due to browser settings or network issues. Please try again.'
          } else if (error.message.includes('OAuth Error')) {
            errorMessage = error.message
          }
        }
        
        setError(errorMessage)
        setStatus('error')
        
        addToast({
          type: 'error',
          title: 'Authentication Failed',
          message: errorMessage
        })
      }
    }

    // Enhanced parameter detection
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hasAuthParams = (
      urlParams.has('code') || 
      urlParams.has('access_token') || 
      hashParams.has('access_token') ||
      urlParams.has('error') ||
      hashParams.has('error')
    )
    
    console.log('🔍 AuthCallback: Parameter check:', {
      hasCode: urlParams.has('code'),
      hasAccessTokenInSearch: urlParams.has('access_token'),
      hasAccessTokenInHash: hashParams.has('access_token'),
      hasError: urlParams.has('error') || hashParams.has('error'),
      willProceed: hasAuthParams
    })
    
    if (hasAuthParams) {
      handleCallback()
    } else {
      console.warn('⚠️ No OAuth parameters found in URL')
      setError('Invalid authentication callback - missing OAuth parameters. Please try signing in again.')
      setStatus('error')
    }
  }, [setUser, addToast])

  // Handle redirects
  if (status === 'success') {
    return <Navigate to="/dashboard" replace />
  }
  
  if (status === 'error') {
    setTimeout(() => {
      window.location.href = '/'
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="animate-spin w-8 h-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Completing Sign In</h2>
            <p className="text-gray-600 mb-6">
              Please wait while we set up your account and create your secure workspace...
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span>Verifying authentication</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <span>Setting up your workspace</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span>Creating default projects</span>
              </div>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Something went wrong during the sign-in process.'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You will be redirected to the home page in a few seconds...
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthCallback