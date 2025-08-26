import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/authStore'

import { AuthService } from './services/auth'
import type { AppUser } from './types'

// Components
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'


// Pages
import Landing from './pages/Landing'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Secrets from './pages/Secrets'
import ApiKeys from './pages/ApiKeys'
import EnvironmentVariables from './pages/EnvironmentVariables'
import Projects from './pages/Projects'
import ProjectDetails from './pages/ProjectDetails'
import Settings from './pages/Settings'
import TestApiKeys from './pages/TestApiKeys'
import AuditLogs from './pages/AuditLogs'

function App() {
  const { setUser, checkAuth, addToast } = useAuthStore()


  useEffect(() => {
    // Initialize auth state on app load
    const initializeAuth = async () => {
      try {
        const session = await AuthService.getCurrentSession()
        if (session?.user) {
          setUser({
            ...session.user,
            email: session.user.email || session.user.user_metadata?.email || ''
          } as AppUser)
          checkAuth()

        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange(async (user) => {
      if (user) {
        setUser(user)

        addToast({
          type: 'success',
          title: 'Welcome!',
          message: 'Successfully signed in!'
        })
      } else {
        setUser(null)
        addToast({
          type: 'info',
          title: 'Goodbye!',
          message: 'You have been signed out'
        })
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [setUser, checkAuth, addToast])

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Application routes */}
          <Route path="/secrets" element={
            <ProtectedRoute>
              <Layout>
                <Secrets />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/credentials/api-keys" element={
            <ProtectedRoute>
              <Layout>
                <ApiKeys />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/credentials/env-vars" element={
            <ProtectedRoute>
              <Layout>
                <EnvironmentVariables />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
              <ProtectedRoute>
                <Layout>
                  <Projects />
                </Layout>
              </ProtectedRoute>
            } />
          
          <Route path="/projects/:projectId" element={
            <ProtectedRoute>
              <Layout>
                <ProjectDetails />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/test/api-keys" element={
            <ProtectedRoute>
              <TestApiKeys />
            </ProtectedRoute>
          } />
          
          <Route path="/audit-logs" element={
            <ProtectedRoute>
              <Layout>
                <AuditLogs />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        

        
        {/* Toast notifications */}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          duration={4000}
        />
      </div>
    </Router>
  )
}

export default App
