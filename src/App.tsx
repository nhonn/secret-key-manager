import React, { useEffect, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/authStore'

import { AuthService } from './services/auth'
import type { AppUser } from './types'

// Components
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LazyWrapper from './components/ui/LazyWrapper'
import BundleMonitor from './components/dev/BundleMonitor'

// Lazy-loaded Pages
const Landing = lazy(() => import('./pages/Landing'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Secrets = lazy(() => import('./pages/Secrets'))
const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const EnvironmentVariables = lazy(() => import('./pages/EnvironmentVariables'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'))
const Settings = lazy(() => import('./pages/Settings'))
const TestApiKeys = lazy(() => import('./pages/TestApiKeys'))
const AuditLogs = lazy(() => import('./pages/AuditLogs'))

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
        <BundleMonitor />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            <LazyWrapper loadingMessage="Loading landing page..." chunkName="Landing">
              <Landing />
            </LazyWrapper>
          } />
          <Route path="/auth/callback" element={
            <LazyWrapper loadingMessage="Processing authentication..." chunkName="AuthCallback">
              <AuthCallback />
            </LazyWrapper>
          } />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <LazyWrapper loadingMessage="Loading dashboard..." chunkName="Dashboard">
                  <Dashboard />
                </LazyWrapper>
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Application routes */}
          <Route path="/secrets" element={
            <ProtectedRoute>
              <Layout>
                <LazyWrapper loadingMessage="Loading secrets..." chunkName="Secrets">
                  <Secrets />
                </LazyWrapper>
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/credentials/api-keys" element={
            <ProtectedRoute>
              <Layout>
                <LazyWrapper loadingMessage="Loading API keys..." chunkName="ApiKeys">
                  <ApiKeys />
                </LazyWrapper>
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/credentials/env-vars" element={
            <ProtectedRoute>
              <Layout>
                <LazyWrapper loadingMessage="Loading environment variables..." chunkName="EnvironmentVariables">
                  <EnvironmentVariables />
                </LazyWrapper>
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute>
              <Layout>
                <LazyWrapper loadingMessage="Loading projects..." chunkName="Projects">
                  <Projects />
                </LazyWrapper>
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/projects/:projectId" element={
            <ProtectedRoute>
              <Layout>
                <LazyWrapper loadingMessage="Loading project details..." chunkName="ProjectDetails">
                  <ProjectDetails />
                </LazyWrapper>
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <LazyWrapper loadingMessage="Loading settings..." chunkName="Settings">
                  <Settings />
                </LazyWrapper>
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/test/api-keys" element={
            <ProtectedRoute>
              <LazyWrapper loadingMessage="Loading API key tester..." chunkName="TestApiKeys">
                <TestApiKeys />
              </LazyWrapper>
            </ProtectedRoute>
          } />
          
          <Route path="/audit-logs" element={
            <ProtectedRoute>
              <Layout>
                <LazyWrapper loadingMessage="Loading audit logs..." chunkName="AuditLogs">
                  <AuditLogs />
                </LazyWrapper>
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
