import React from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldCheckIcon, KeyIcon, LockClosedIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../store/authStore'

const Landing: React.FC = () => {
  const { signIn, isLoading, isAuthenticated } = useAuthStore()

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleGoogleSignIn = async () => {
    await signIn()
  }

  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Zero-Knowledge Security',
      description: 'Your secrets are encrypted client-side before being stored. We never see your data.'
    },
    {
      icon: KeyIcon,
      title: 'API Key Management',
      description: 'Organize and manage all your API keys in secure, categorized folders.'
    },
    {
      icon: LockClosedIcon,
      title: 'Environment Variables',
      description: 'Store environment-specific configurations securely with version control.'
    },
    {
      icon: EyeSlashIcon,
      title: 'Client-Side Encryption',
      description: 'AES-256-GCM encryption ensures your secrets remain private and secure.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Secret Key Manager</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Secure Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> Secrets</span>
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
            A zero-knowledge secret management platform that keeps your API keys, 
            environment variables, and sensitive data encrypted and organized.
          </p>
          
          {/* Google Sign In Button */}
          <div className="mt-10">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>
          
          <p className="mt-4 text-sm text-gray-500">
            Sign in with your Google account to get started. No additional registration required.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-24">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-gray-900">Why Choose Our Platform?</h3>
            <p className="mt-4 text-lg text-gray-600">Built with security and privacy as our top priorities</p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative bg-white p-6 rounded-lg shadow-lg">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-24 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
          <div className="text-center">
            <ShieldCheckIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Zero-Knowledge Architecture</h3>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Your data is encrypted on your device before it ever reaches our servers. 
              We use industry-standard AES-256-GCM encryption with PBKDF2 key derivation. 
              Even we can&apos;t see your secrets - that&apos;s the way it should be.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 Secret Key Manager. Built with security and privacy in mind.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing