import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'

/**
 * This page handles the redirect from the backend after a successful
 * Google OAuth flow. The backend sends ?accessToken=...&refreshToken=...
 * in the query string, which we pick up here, store, and then navigate
 * the user to the dashboard.
 */
const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleOAuthCallback } = useAuth()

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const error = searchParams.get('error')

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`)
      return
    }

    if (accessToken && refreshToken) {
      handleOAuthCallback(accessToken, refreshToken)
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/login?error=oauth_failed')
    }
  }, [searchParams, navigate, handleOAuthCallback])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-legal-blue/5 via-background to-legal-navy/5">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-legal-blue to-legal-navy rounded-2xl flex items-center justify-center mx-auto animate-pulse">
          <span className="text-white font-bold text-2xl">J</span>
        </div>
        <p className="text-muted-foreground text-sm">Completing sign-in...</p>
      </div>
    </div>
  )
}

export default GoogleCallbackPage
