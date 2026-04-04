import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '../../pages/auth/LoginPage'
import '@testing-library/jest-dom'

// Mock the auth provider
const mockLogin = vi.fn()
const mockAuth = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
  login: mockLogin,
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  refreshSession: vi.fn(),
}

vi.mock('../../providers/AuthProvider', () => ({
  useAuth: () => mockAuth
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.isLoading = false
    mockAuth.error = null
  })

  it('should render login form', () => {
    renderWithProviders(<LoginPage />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<LoginPage />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should show error for invalid email format', async () => {
    renderWithProviders(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during login', () => {
    mockAuth.isLoading = true
    renderWithProviders(<LoginPage />)
    
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })

  it('should display error message when login fails', () => {
    mockAuth.error = 'Invalid credentials'
    renderWithProviders(<LoginPage />)
    
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
  })
})
