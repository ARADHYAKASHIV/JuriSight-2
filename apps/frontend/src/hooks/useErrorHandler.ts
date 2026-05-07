import { useCallback } from 'react'
// Simple toast notification system
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  // Create a simple toast notification
  const toast = document.createElement('div')
  toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
    type === 'error' ? 'bg-red-500 text-white' :
    type === 'success' ? 'bg-green-500 text-white' :
    'bg-blue-500 text-white'
  }`
  toast.textContent = message
  document.body.appendChild(toast)
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, 5000)
}

export interface AppError {
  message: string
  code?: string
  status?: number
  details?: any
}

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown, context?: string) => {
    let errorMessage = 'An unexpected error occurred'
    let errorCode = 'UNKNOWN_ERROR'

    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as any).message
      errorCode = (error as any).code || errorCode
    }

    // Log error for debugging
    console.error(`Error${context ? ` in ${context}` : ''}:`, error)

    // Show user-friendly error message
    const friendlyMessage = getFriendlyErrorMessage(errorMessage, errorCode)
    showToast(friendlyMessage, 'error')

    // In production, you might want to send errors to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      // sendErrorToMonitoring({ message: errorMessage, code: errorCode, context })
    }

    return { message: errorMessage, code: errorCode }
  }, [])

  const handleApiError = useCallback((error: any) => {
    if (error?.response) {
      // API responded with error status
      const status = error.response.status
      const data = error.response.data

      switch (status) {
        case 400:
          return handleError(data?.error?.message || 'Invalid request', 'API_BAD_REQUEST')
        case 401: {
          const hasToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
          if (!hasToken) {
            // Truly unauthenticated — redirect to login
            showToast('Please sign in to continue', 'error')
            window.location.href = '/login'
          } else {
            // Token exists but was rejected — axios interceptor will handle refresh/redirect
            showToast('Session expired. Refreshing…', 'info')
          }
          return
        }
        case 403:
          return handleError('You do not have permission to perform this action', 'API_FORBIDDEN')
        case 404:
          return handleError('The requested resource was not found', 'API_NOT_FOUND')
        case 429:
          return handleError('Too many requests. Please try again later', 'API_RATE_LIMIT')
        case 500:
          return handleError('Server error. Please try again later', 'API_SERVER_ERROR')
        default:
          return handleError(data?.error?.message || 'An error occurred', 'API_ERROR')
      }
    } else if (error?.request) {
      // Network error
      return handleError('Network error. Please check your internet connection', 'NETWORK_ERROR')
    } else {
      // Other error
      return handleError(error?.message || 'An unexpected error occurred', 'UNKNOWN_ERROR')
    }
  }, [handleError])

  return { handleError, handleApiError }
}

const getFriendlyErrorMessage = (message: string, code: string): string => {
  // Map technical error messages to user-friendly ones
  const errorMap: Record<string, string> = {
    'Network Error': 'Unable to connect. Please check your internet connection.',
    'timeout': 'The request timed out. Please try again.',
    'ECONNREFUSED': 'Unable to connect to the server. Please try again later.',
    'USER_NOT_FOUND': 'User account not found.',
    'INVALID_CREDENTIALS': 'Invalid email or password.',
    'EMAIL_TAKEN': 'This email address is already in use.',
    'VALIDATION_ERROR': 'Please check your input and try again.',
    'FILE_TOO_LARGE': 'The file is too large. Please choose a smaller file.',
    'INVALID_FILE_TYPE': 'This file type is not supported.',
    'WORKSPACE_NOT_FOUND': 'Workspace not found.',
    'DOCUMENT_NOT_FOUND': 'Document not found.',
    'ACCESS_DENIED': 'You do not have permission to access this resource.',
  }

  return errorMap[code] || errorMap[message] || message
}

export default useErrorHandler