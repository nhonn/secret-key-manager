import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AuthService } from '../services/auth'
import type { AppUser } from '../types'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, setUser, checkAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true)
        
        // Check if user is already authenticated
        if (isAuthenticated && user) {
          setIsLoading(false)
          return
        }

        // Try to get current session
        const session = await AuthService.getCurrentSession()
        if (session?.user) {
          setUser({
            ...session.user,
            email: session.user.email || session.user.user_metadata?.email || ''
          } as AppUser)
          checkAuth()
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [isAuthenticated, user, setUser, checkAuth])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Render protected content
  return <>{children}</>
}

export default ProtectedRoute