import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppUser, Toast } from '../types'
import { AuthService } from '../services/auth'


interface AuthState {
  // User state
  user: AppUser | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Toast notifications
  toasts: Toast[]
  
  // Actions
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: AppUser | null) => void
  setLoading: (loading: boolean) => void
  checkAuth: () => Promise<void>
  
  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: true,
      isAuthenticated: false,
      toasts: [],

      // Authentication actions
      signIn: async () => {
        try {
          set({ isLoading: true })
          await AuthService.signInWithGoogle()
          // The actual user setting will happen in the auth state change listener
        } catch (error) {
          console.error('Sign in error:', error)
          get().addToast({
            type: 'error',
            title: 'Sign In Failed',
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            duration: 5000
          })
        } finally {
          set({ isLoading: false })
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true })
          await AuthService.signOut()
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          })
          

          
          get().addToast({
            type: 'success',
            title: 'Signed Out',
            message: 'You have been successfully signed out',
            duration: 3000
          })
        } catch (error) {
          console.error('Sign out error:', error)
          get().addToast({
            type: 'error',
            title: 'Sign Out Failed',
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            duration: 5000
          })
        } finally {
          set({ isLoading: false })
        }
      },

      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false 
        })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true })
          const user = await AuthService.getCurrentUser()
          set({ 
             user: {
               ...user,
               email: user.email || user.user_metadata?.email || ''
             } as AppUser, 
             isAuthenticated: !!user,
             isLoading: false 
           })
          

        } catch (error) {
          console.error('Auth check error:', error)
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          })
          

        }
      },

      // Toast actions
      addToast: (toast) => {
        const id = Math.random().toString(36).substr(2, 9)
        const newToast = { ...toast, id }
        
        set((state) => ({
          toasts: [...state.toasts, newToast]
        }))

        // Auto remove toast after duration
        if (toast.duration && toast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id)
          }, toast.duration)
        }
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter(toast => toast.id !== id)
        }))
      },

      clearToasts: () => {
        set({ toasts: [] })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
)