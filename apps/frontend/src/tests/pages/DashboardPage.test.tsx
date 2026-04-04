import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import DashboardPage from '../../pages/DashboardPage'
import '@testing-library/jest-dom'

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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dashboard with basic content', () => {
    renderWithProviders(<DashboardPage />)
    
    expect(screen.getByText(/welcome to jurisight/i)).toBeInTheDocument()
    expect(screen.getByText(/ai-powered legal document analysis/i)).toBeInTheDocument()
  })

  it('should show stats overview cards', () => {
    renderWithProviders(<DashboardPage />)
    
    expect(screen.getByText(/documents processed/i)).toBeInTheDocument()
    expect(screen.getByText(/chat sessions/i)).toBeInTheDocument()
    expect(screen.getByText(/analysis reports/i)).toBeInTheDocument()
    expect(screen.getByText(/comparisons/i)).toBeInTheDocument()
  })

  it('should show quick actions', () => {
    renderWithProviders(<DashboardPage />)
    
    expect(screen.getByText(/upload document/i)).toBeInTheDocument()
    expect(screen.getByText(/start chat/i)).toBeInTheDocument()
    expect(screen.getByText(/compare documents/i)).toBeInTheDocument()
  })

  it('should show recent activity section', () => {
    renderWithProviders(<DashboardPage />)
    
    expect(screen.getByText(/recent activity/i)).toBeInTheDocument()
    expect(screen.getByText(/contract analysis complete/i)).toBeInTheDocument()
  })

  it('should show feature highlights', () => {
    renderWithProviders(<DashboardPage />)
    
    expect(screen.getByText(/smart document processing/i)).toBeInTheDocument()
    expect(screen.getByText(/interactive q&a/i)).toBeInTheDocument()
    expect(screen.getByText(/risk analysis/i)).toBeInTheDocument()
  })
})
