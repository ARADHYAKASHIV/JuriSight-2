import React, { createContext, useContext, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/services/api'
import { PublicUser } from '@/shared'

interface AuthContextType {
  user: PublicUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (email: string, password: string, confirmPassword: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<PublicUser>) => Promise<void>
  refreshSession: () => Promise<void>
  handleOAuthCallback: (accessToken: string, refreshToken: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user,
    isAuthenticated,
    accessToken,
    isLoading,
    error,
    setAuth,
    clearAuth,
    setUser,
    setLoading,
    setError,
    updateLastActivity,
    checkSessionTimeout,
  } = useAuthStore()

  // Query to fetch user profile if we have a token but no user data
  const { data: profileData } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => apiClient.getProfile(),
    enabled: !!accessToken && !user,
    retry: 1,
    staleTime: Infinity,
  })

  // Update user data when profile is fetched
  useEffect(() => {
    if (profileData?.success && profileData.data) {
      setUser(profileData.data)
    }
  }, [profileData, setUser])

  // Check for session timeout on app activity
  useEffect(() => {
    const handleActivity = () => {
      if (isAuthenticated) {
        updateLastActivity()
        checkSessionTimeout()
      }
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Check session timeout every minute
    const timeoutCheck = setInterval(() => {
      if (isAuthenticated) {
        checkSessionTimeout()
      }
    }, 60000)

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      clearInterval(timeoutCheck)
    }
  }, [isAuthenticated, updateLastActivity, checkSessionTimeout])

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.login({ email, password })
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data
        setAuth(user, accessToken, refreshToken, rememberMe)
      } else {
        throw new Error(response.error?.message || 'Login failed')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, confirmPassword: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.register({ email, password, confirmPassword })
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data
        setAuth(user, accessToken, refreshToken)
      } else {
        throw new Error(response.error?.message || 'Registration failed')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      clearAuth()
    }
  }

  const updateProfile = async (data: Partial<PublicUser>) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.updateProfile(data)
      
      if (response.success && response.data) {
        setUser(response.data)
      } else {
        throw new Error(response.error?.message || 'Profile update failed')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await apiClient.refreshToken(refreshToken)
      
      if (response.success && response.data) {
        const { accessToken } = response.data
        const storage = localStorage.getItem('rememberMe') === 'true' ? localStorage : sessionStorage
        storage.setItem('accessToken', accessToken)
        updateLastActivity()
      } else {
        throw new Error('Session refresh failed')
      }
    } catch (err) {
      clearAuth()
      throw err
    }
  }

  /**
   * Called by GoogleCallbackPage after the backend OAuth redirect.
   * Stores the tokens and marks the user as authenticated.
   */
  const handleOAuthCallback = (accessToken: string, refreshToken: string) => {
    // Store tokens — treat as "remember me" (persisted)
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('rememberMe', 'true')
    // setAuth without a user object — the profile query will hydrate it
    setAuth(null as any, accessToken, refreshToken, true)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    refreshSession,
    handleOAuthCallback,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider