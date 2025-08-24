import { supabase } from '../lib/supabase'
import type { AppUser } from '../types'

export class AuthService {
  /**
   * Sign in with Google OAuth
   * This will redirect to Google OAuth and automatically create a user account if it doesn't exist
   */
  static async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      throw new Error(`Google OAuth failed: ${error.message}`)
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`)
    }
  }

  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  static async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  /**
   * Listen to authentication state changes
   */
  static onAuthStateChange(callback: (user: AppUser | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user as AppUser | null
      callback(user)
    })
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession()
    return !!session?.user
  }

  /**
   * Refresh the current session
   */
  static async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      throw new Error(`Failed to refresh session: ${error.message}`)
    }

    return data
  }

  /**
   * Handle OAuth callback and ensure user profile is complete
   */
  static async handleOAuthCallback(): Promise<AppUser | null> {
    try {
      console.log('🔐 Starting OAuth callback handling...')
      
      // Check URL for OAuth parameters
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const hasOAuthParams = urlParams.has('code') || hashParams.has('access_token') || urlParams.has('access_token')
      
      console.log('🔍 OAuth parameters detected:', {
        hasCode: urlParams.has('code'),
        hasAccessToken: hashParams.has('access_token') || urlParams.has('access_token'),
        hasError: urlParams.has('error') || hashParams.has('error'),
        url: window.location.href
      })

      // Check for OAuth errors in URL
      const oauthError = urlParams.get('error') || hashParams.get('error')
      if (oauthError) {
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description') || 'Unknown OAuth error'
        console.error('❌ OAuth error in URL:', oauthError, errorDescription)
        throw new Error(`OAuth failed: ${oauthError} - ${errorDescription}`)
      }

      if (!hasOAuthParams) {
        console.warn('⚠️ No OAuth parameters found in URL')
        throw new Error('Invalid OAuth callback - missing authentication parameters')
      }

      // Wait a moment for Supabase to process the OAuth callback
      console.log('⏳ Waiting for Supabase to process OAuth callback...')
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Try to get the session multiple times with backoff
      let sessionData = null
      let sessionError = null
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔄 Attempt ${attempt}: Getting session...`)
        const result = await supabase.auth.getSession()
        sessionData = result.data
        sessionError = result.error
        
        if (sessionError) {
          console.error(`❌ Session error on attempt ${attempt}:`, sessionError)
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            continue
          }
          throw new Error(`Auth session missing after ${attempt} attempts! ${sessionError.message}`)
        }
        
        if (sessionData?.session) {
          console.log('✅ Session found on attempt', attempt)
          break
        }
        
        if (attempt < 3) {
          console.log(`⏳ No session on attempt ${attempt}, retrying...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }

      // If still no session, try alternative approaches
      if (!sessionData?.session) {
        console.log('🔄 No session found, trying alternative approaches...')
        
        // Try to get user directly
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('❌ Failed to get user:', userError)
          throw new Error(`Auth session missing! Unable to retrieve user: ${userError.message}`)
        }
        
        if (!user) {
          console.error('❌ No user found')
          throw new Error('Auth session missing! No user data available after OAuth callback')
        }
        
        console.log('✅ User found via direct call:', { id: user.id, email: user.email })
        
        // Try to refresh session
        console.log('🔄 Attempting to refresh session...')
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.warn('⚠️ Failed to refresh session:', refreshError.message)
        } else if (refreshData?.session) {
          console.log('✅ Session refreshed successfully')
        }
        
        await this.ensureUserSetup(user.id)
        return user as AppUser | null
      }

      const user = sessionData.session.user
      console.log('✅ OAuth callback successful:', { 
        userId: user.id, 
        email: user.email,
        provider: user.app_metadata?.provider 
      })
      
      if (user) {
        // Trigger the database function to create default folders for new users
        await this.ensureUserSetup(user.id)
      }

      return user as AppUser | null
    } catch (error) {
      console.error('💥 OAuth callback error:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Auth session missing')) {
          throw new Error(`OAuth callback failed: ${error.message}. Please try signing in again.`)
        }
        throw error
      }
      
      throw new Error('OAuth callback failed: Unknown error occurred')
    }
  }

  /**
   * Ensure user has default credential folders set up
   */
  private static async ensureUserSetup(userId: string): Promise<void> {
    try {
      console.log('🔧 Setting up default folders for user:', userId)
      
      // Call the database function to create default folders if they don't exist
      const { error } = await (supabase as any).rpc('create_default_credential_folders', {
        target_user_id: userId
      })

      if (error) {
        console.error('❌ Failed to create default folders:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId
        })
        
        // Log additional context for debugging
        if (error.code === '42501') {
          console.error('🔒 Permission denied - check RLS policies and function permissions')
        } else if (error.code === '23505') {
          console.warn('⚠️ Folders may already exist for this user (duplicate key error)')
        } else if (error.code?.startsWith('23')) {
          console.error('🔗 Database constraint violation:', error.message)
        }
        
        // Don't throw error as this is not critical for authentication
        // But log it prominently for debugging
        console.warn('⚠️ User setup incomplete but authentication will continue')
      } else {
        console.log('✅ Default folders setup completed successfully for user:', userId)
      }
    } catch (error) {
      console.error('💥 Unexpected error during user setup:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userId
      })
      
      // Don't throw - authentication should still succeed even if folder creation fails
      console.warn('⚠️ User setup failed but authentication will continue')
    }
  }

  /**
   * Get user profile information
   */
  static async getUserProfile(): Promise<{
    id: string
    email: string
    full_name?: string
    avatar_url?: string
    provider?: string
  } | null> {
    const user = await this.getCurrentUser()
    
    if (!user) return null

    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url,
      provider: user.user_metadata?.provider || 'google'
    }
  }
}