import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { 
  ApiResponse, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest,
  User,
  Document,
  CreateDocument,
  UpdateDocument,
  ChatSession,
  CreateChatSession,
  ChatMessage,
  CreateChatMessage,
  DocumentComparison,
  CreateComparison,
  AnalyticsMetrics,
  Workspace,
  CreateWorkspace,
  UpdateWorkspace,
  PaginationParams,
  FilterParams,
  SortParams
} from '@/shared'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    // In dev, VITE_API_URL is unset so we proxy via /api
    // In prod, VITE_API_URL = 'https://api.example.com' → append /api
    const base = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api`
      : '/api'

    this.client = axios.create({
      baseURL: base,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        // Token may be in localStorage (rememberMe=true) or sessionStorage (rememberMe=false)
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          
          try {
            // Token may be in localStorage (rememberMe) or sessionStorage (session-only)
            const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
            if (!refreshToken) {
              throw new Error('No refresh token')
            }
            
            const response = await axios.post('/api/auth/refresh', {
              refreshToken
            })
            
            const { accessToken } = response.data.data
            // Write new token back to whichever storage originally held it
            if (localStorage.getItem('refreshToken')) {
              localStorage.setItem('accessToken', accessToken)
            } else {
              sessionStorage.setItem('accessToken', accessToken)
            }
            
            return this.client(originalRequest)
          } catch (refreshError) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            sessionStorage.removeItem('accessToken')
            sessionStorage.removeItem('refreshToken')
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }
        
        return Promise.reject(error)
      }
    )
  }

  // Generic HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.patch(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url, config)
    return response.data
  }

  // Authentication API
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.post<AuthResponse>('/auth/login', credentials)
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return this.post<AuthResponse>('/auth/register', userData)
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.post<void>('/auth/logout')
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> {
    return this.post<{ accessToken: string }>('/auth/refresh', { refreshToken })
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.get<User>('/auth/profile')
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.put<User>('/auth/profile', data)
  }

  // Workspace API
  async getWorkspaces(params?: PaginationParams): Promise<ApiResponse<Workspace[]>> {
    return this.get<Workspace[]>('/workspaces', { params })
  }

  async createWorkspace(data: CreateWorkspace): Promise<ApiResponse<Workspace>> {
    return this.post<Workspace>('/workspaces', data)
  }

  async getWorkspace(id: string): Promise<ApiResponse<Workspace>> {
    return this.get<Workspace>(`/workspaces/${id}`)
  }

  async updateWorkspace(id: string, data: UpdateWorkspace): Promise<ApiResponse<Workspace>> {
    return this.put<Workspace>(`/workspaces/${id}`, data)
  }

  async deleteWorkspace(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/workspaces/${id}`)
  }

  // Document API
  async getDocuments(
    params?: PaginationParams & FilterParams & SortParams
  ): Promise<ApiResponse<Document[]>> {
    return this.get<Document[]>('/documents', { params })
  }

  async uploadDocument(
    workspaceId: string,
    file: File,
    metadata?: CreateDocument
  ): Promise<ApiResponse<Document>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('workspaceId', workspaceId)
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value))
        }
      })
    }

    return this.post<Document>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  async getDocument(id: string): Promise<ApiResponse<Document>> {
    return this.get<Document>(`/documents/${id}`)
  }

  async updateDocument(id: string, data: UpdateDocument): Promise<ApiResponse<Document>> {
    return this.put<Document>(`/documents/${id}`, data)
  }

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/documents/${id}`)
  }

  async analyzeDocument(id: string): Promise<ApiResponse<any>> {
    return this.post<any>(`/documents/${id}/analyze`)
  }

  async downloadDocument(id: string): Promise<Blob> {
    const response = await this.client.get(`/documents/${id}/download`, {
      responseType: 'blob',
    })
    return response.data
  }

  // Chat API
  async getChatSessions(documentId?: string): Promise<ApiResponse<ChatSession[]>> {
    const params = documentId ? { documentId } : undefined
    return this.get<ChatSession[]>('/chat/sessions', { params })
  }

  async createChatSession(data: CreateChatSession): Promise<ApiResponse<ChatSession>> {
    return this.post<ChatSession>('/chat/sessions', data)
  }

  async getChatSession(id: string): Promise<ApiResponse<ChatSession>> {
    return this.get<ChatSession>(`/chat/sessions/${id}`)
  }

  async getChatMessages(sessionId: string): Promise<ApiResponse<ChatMessage[]>> {
    return this.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`)
  }

  async sendChatMessage(data: CreateChatMessage): Promise<ApiResponse<ChatMessage>> {
    return this.post<ChatMessage>('/chat/messages', data)
  }

  async deleteChatSession(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/chat/sessions/${id}`)
  }

  // Comparison API
  async createComparison(data: CreateComparison): Promise<ApiResponse<DocumentComparison>> {
    return this.post<DocumentComparison>('/comparisons', data)
  }

  async getComparison(id: string): Promise<ApiResponse<DocumentComparison>> {
    return this.get<DocumentComparison>(`/comparisons/${id}`)
  }

  async getComparisons(params?: PaginationParams): Promise<ApiResponse<DocumentComparison[]>> {
    return this.get<DocumentComparison[]>('/comparisons', { params })
  }

  async deleteComparison(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/comparisons/${id}`)
  }

  // Analytics API
  async getDashboardMetrics(): Promise<ApiResponse<AnalyticsMetrics>> {
    return this.get<AnalyticsMetrics>('/analytics/dashboard')
  }

  async getUsageStats(params?: { 
    period?: string; 
    workspaceId?: string 
  }): Promise<ApiResponse<any>> {
    return this.get<any>('/analytics/usage', { params })
  }

  async getPerformanceMetrics(params?: { 
    period?: string 
  }): Promise<ApiResponse<any>> {
    return this.get<any>('/analytics/performance', { params })
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Export default instance and named exports for convenience
export default apiClient

// Named exports for different API modules
export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
}

export const authApi = {
  login: apiClient.login.bind(apiClient),
  register: apiClient.register.bind(apiClient),
  logout: apiClient.logout.bind(apiClient),
  refreshToken: apiClient.refreshToken.bind(apiClient),
  getProfile: apiClient.getProfile.bind(apiClient),
  updateProfile: apiClient.updateProfile.bind(apiClient),
}

export const workspaceApi = {
  getWorkspaces: apiClient.getWorkspaces.bind(apiClient),
  createWorkspace: apiClient.createWorkspace.bind(apiClient),
  getWorkspace: apiClient.getWorkspace.bind(apiClient),
  updateWorkspace: apiClient.updateWorkspace.bind(apiClient),
  deleteWorkspace: apiClient.deleteWorkspace.bind(apiClient),
}

export const documentApi = {
  getDocuments: apiClient.getDocuments.bind(apiClient),
  uploadDocument: apiClient.uploadDocument.bind(apiClient),
  getDocument: apiClient.getDocument.bind(apiClient),
  updateDocument: apiClient.updateDocument.bind(apiClient),
  deleteDocument: apiClient.deleteDocument.bind(apiClient),
  analyzeDocument: apiClient.analyzeDocument.bind(apiClient),
  downloadDocument: apiClient.downloadDocument.bind(apiClient),
}

export const chatApi = {
  getChatSessions: apiClient.getChatSessions.bind(apiClient),
  createChatSession: apiClient.createChatSession.bind(apiClient),
  getChatSession: apiClient.getChatSession.bind(apiClient),
  getChatMessages: apiClient.getChatMessages.bind(apiClient),
  sendChatMessage: apiClient.sendChatMessage.bind(apiClient),
  deleteChatSession: apiClient.deleteChatSession.bind(apiClient),
}

export const comparisonApi = {
  createComparison: apiClient.createComparison.bind(apiClient),
  getComparison: apiClient.getComparison.bind(apiClient),
  getComparisons: apiClient.getComparisons.bind(apiClient),
  deleteComparison: apiClient.deleteComparison.bind(apiClient),
}

export const analyticsApi = {
  getDashboardMetrics: apiClient.getDashboardMetrics.bind(apiClient),
  getUsageStats: apiClient.getUsageStats.bind(apiClient),
  getPerformanceMetrics: apiClient.getPerformanceMetrics.bind(apiClient),
}