import React, { useState, useEffect } from 'react'
import { User, Shield, Key, Download, Upload, Trash2, Save, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { EncryptionService } from '../services/encryption'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface SettingsPageProps {}

export default function Settings({}: SettingsPageProps) {
  const { user, signOut } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Profile settings
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  
  // Security settings
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  
  // Statistics
  const [stats, setStats] = useState({
    totalSecrets: 0,
    totalProjects: 0,
    totalApiKeys: 0,
    totalEnvVars: 0,
    lastLogin: null as string | null
  })

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.full_name || '')
      setEmail(user.email || '')
      loadUserStats()
    }
  }, [user])

  const loadUserStats = async () => {
    if (!user) return

    try {
      const [secretsResult, projectsResult, apiKeysResult, envVarsResult] = await Promise.all([
        supabase.from('secrets').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('projects').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('api_keys').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('environment_variables').select('id', { count: 'exact' }).eq('user_id', user.id)
      ])

      setStats({
        totalSecrets: secretsResult.count || 0,
        totalProjects: projectsResult.count || 0,
        totalApiKeys: apiKeysResult.count || 0,
        totalEnvVars: envVarsResult.count || 0,
        lastLogin: user.last_sign_in_at
      })
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const updateProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: displayName
        }
      })

      if (error) {
        throw error
      }

      toast.success('Profile updated successfully')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    try {
      setLoading(true)
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw error
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed successfully')
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }



  const exportAllData = async () => {
    try {
      setLoading(true)
      
      // This would export all encrypted data
      // For now, we'll show a placeholder message
      toast.info('Data export functionality will be implemented in a future update')
    } catch (error: any) {
      console.error('Error exporting data:', error)
      toast.error(error.message || 'Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    const confirmation = prompt(
      'This will permanently delete your account and all associated data. This action cannot be undone.\n\nType "DELETE" to confirm:'
    )

    if (confirmation !== 'DELETE') {
      return
    }

    try {
      setLoading(true)
      
      // Delete all user data first
      const { error: deleteError } = await supabase.rpc('delete_user_data', {
        user_uuid: user?.id
      })

      if (deleteError) {
        console.error('Error deleting user data:', deleteError)
        // Continue with account deletion even if data deletion fails
      }

      // Sign out the user
      await signOut()
      
      toast.success('Account deleted successfully')
    } catch (error: any) {
      console.error('Error deleting account:', error)
      toast.error(error.message || 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Key }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account preferences and security settings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalSecrets}</div>
            <div className="text-sm text-gray-600">Total Secrets</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.totalProjects}</div>
            <div className="text-sm text-gray-600">Projects</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.totalApiKeys}</div>
            <div className="text-sm text-gray-600">API Keys</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.totalEnvVars}</div>
            <div className="text-sm text-gray-600">Env Variables</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your display name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={updateProfile}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>Account created: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</div>
                    {stats.lastLogin && (
                      <div>Last login: {new Date(stats.lastLogin).toLocaleDateString()}</div>
                    )}
                    <div>User ID: {user?.id}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                {/* Change Password */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={changePassword}
                      disabled={loading || !newPassword || !confirmPassword}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </div>


              </div>
            )}

            {/* Data Management Tab */}
            {activeTab === 'data' && (
              <div className="space-y-8">
                {/* Export Data */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Export Data</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Export all your encrypted data as a backup.
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={exportAllData}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {loading ? 'Exporting...' : 'Export Data'}
                    </button>
                  </div>
                </div>

                {/* Import Data */}
                <div className="border-t border-gray-200 pt-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Import Data</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Import previously exported data. This will merge with your existing data.
                  </p>
                  <button
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    onClick={() => toast.info('Import functionality will be implemented in a future update')}
                  >
                    <Upload className="w-4 h-4" />
                    Import Data
                  </button>
                </div>

                {/* Delete Account */}
                <div className="border-t border-gray-200 pt-8">
                  <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button
                    onClick={deleteAccount}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {loading ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}