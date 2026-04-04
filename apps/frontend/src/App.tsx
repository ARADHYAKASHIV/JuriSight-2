// Performance optimized App with lazy loading
import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/providers/AuthProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Layout from '@/components/layout/Layout'

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = React.lazy(() => import('@/pages/auth/RegisterPage'))
const GoogleCallbackPage = React.lazy(() => import('@/pages/auth/GoogleCallbackPage'))
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'))
const DocumentsPage = React.lazy(() => import('@/pages/index').then(module => ({ default: module.DocumentsPage })))
const DocumentViewerPage = React.lazy(() => import('@/pages/index').then(module => ({ default: module.DocumentViewerPage })))
const ChatPage = React.lazy(() => import('@/pages/index').then(module => ({ default: module.ChatPage })))
const ComparisonPage = React.lazy(() => import('@/pages/index').then(module => ({ default: module.ComparisonPage })))
const AnalyticsPage = React.lazy(() => import('@/pages/index').then(module => ({ default: module.AnalyticsPage })))
const SettingsPage = React.lazy(() => import('@/pages/index').then(module => ({ default: module.SettingsPage })))
const WorkspacesPage = React.lazy(() => import('@/pages/index').then(module => ({ default: module.WorkspacesPage })))
const NotFoundPage = React.lazy(() => import('@/pages/index').then(module => ({ default: module.NotFoundPage })))

// Create optimized QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (garbage collection time)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-gradient-to-br from-legal-blue to-legal-navy rounded-2xl flex items-center justify-center mx-auto">
        <span className="text-white font-bold text-2xl">J</span>
      </div>
      <div className="space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-legal-blue border-t-transparent mx-auto"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  </div>
)

// Smaller loading spinner for nested components
const PageContentLoader: React.FC = () => (
  <div className="p-6 animate-pulse space-y-4">
    <div className="bg-muted h-8 rounded w-1/3"></div>
    <div className="bg-muted h-64 rounded"></div>
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-muted h-32 rounded"></div>
      <div className="bg-muted h-32 rounded"></div>
      <div className="bg-muted h-32 rounded"></div>
    </div>
  </div>
)

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="jurisight-ui-theme">
        <AuthProvider>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
                
                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <DashboardPage />
                    </Suspense>
                  } />
                  <Route path="documents" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <DocumentsPage />
                    </Suspense>
                  } />
                  <Route path="documents/:id" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <DocumentViewerPage />
                    </Suspense>
                  } />
                  <Route path="chat" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <ChatPage />
                    </Suspense>
                  } />
                  <Route path="chat/:sessionId" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <ChatPage />
                    </Suspense>
                  } />
                  <Route path="comparison" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <ComparisonPage />
                    </Suspense>
                  } />
                  <Route path="comparison/:id" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <ComparisonPage />
                    </Suspense>
                  } />
                  <Route path="analytics" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <AnalyticsPage />
                    </Suspense>
                  } />
                  <Route path="workspaces" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <WorkspacesPage />
                    </Suspense>
                  } />
                  <Route path="settings" element={
                    <Suspense fallback={<PageContentLoader />}>
                      <SettingsPage />
                    </Suspense>
                  } />
                </Route>
                
                {/* Catch all */}
                <Route path="*" element={
                  <Suspense fallback={<PageLoader />}>
                    <NotFoundPage />
                  </Suspense>
                } />
              </Routes>
            </Suspense>
            
            <Toaster />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App