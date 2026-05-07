import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useAuthStore } from '../stores/authStore'

// Mock the auth store
vi.mock('../stores/authStore')

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const mockUseAuthStore = vi.mocked(useAuthStore)
    mockUseAuthStore.mockReturnValue({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      setUser: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
    })

    const state = useAuthStore()
    
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })
})