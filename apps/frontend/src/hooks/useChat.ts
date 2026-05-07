import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/services/api'
import type { ChatSession, ChatMessage, CreateChatSession, CreateChatMessage } from '@/shared'
import { useErrorHandler } from './useErrorHandler'

export interface UseChatOptions {
  sessionId?: string
  documentId?: string
}

export interface ChatState {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  messages: ChatMessage[]
  isLoading: boolean
  isLoadingSessions: boolean
  isLoadingMessages: boolean
  isSendingMessage: boolean
  error: string | null
}

export const useChat = (options: UseChatOptions = {}) => {
  const { sessionId, documentId } = options
  const queryClient = useQueryClient()
  const { handleApiError } = useErrorHandler()
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId)

  // Fetch chat sessions
  const {
    data: sessionsResponse,
    isLoading: isLoadingSessions,
    error: sessionsError,
  } = useQuery({
    queryKey: ['chatSessions', documentId],
    queryFn: async () => {
      const response = await chatApi.getChatSessions(documentId)
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch chat sessions')
      }
      return response
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Fetch current session details
  const {
    data: sessionResponse,
    isLoading: isLoadingSession,
  } = useQuery({
    queryKey: ['chatSession', currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return null
      const response = await chatApi.getChatSession(currentSessionId)
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch chat session')
      }
      return response
    },
    enabled: !!currentSessionId,
    retry: 2,
  })

  // Fetch messages for current session
  const {
    data: messagesResponse,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useQuery({
    queryKey: ['chatMessages', currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return null
      const response = await chatApi.getChatMessages(currentSessionId)
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch messages')
      }
      return response
    },
    enabled: !!currentSessionId,
    retry: 2,
    refetchInterval: 5000, // Auto-refresh messages every 5 seconds
  })

  // Create new chat session
  const createSessionMutation = useMutation({
    mutationFn: async (data: CreateChatSession) => {
      const response = await chatApi.createChatSession(data)
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create chat session')
      }
      return response.data!
    },
    onSuccess: (newSession) => {
      // Update cache and set as current session
      queryClient.setQueryData(['chatSessions', documentId], (old: any) => {
        if (!old) return { success: true, data: [newSession] }
        return {
          ...old,
          data: [newSession, ...old.data]
        }
      })
      setCurrentSessionId(newSession.id)
    },
    onError: (error) => {
      handleApiError(error)
    },
  })

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: CreateChatMessage) => {
      if (!data.sessionId) {
        throw new Error('No active chat session')
      }
      
      const response = await chatApi.sendChatMessage(data)
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to send message')
      }
      return response.data!
    },
    onSuccess: (_data, variables) => {
      // Refresh messages using the sessionId from the mutation variables
      queryClient.invalidateQueries({
        queryKey: ['chatMessages', variables.sessionId]
      })
    },
    onError: (error) => {
      handleApiError(error)
    },
  })

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await chatApi.deleteChatSession(sessionId)
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete session')
      }
    },
    onSuccess: (_, deletedSessionId) => {
      // Remove from cache
      queryClient.setQueryData(['chatSessions', documentId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.filter((session: ChatSession) => session.id !== deletedSessionId)
        }
      })
      
      // Clear current session if it was deleted
      if (currentSessionId === deletedSessionId) {
        setCurrentSessionId(undefined)
      }
    },
    onError: (error) => {
      handleApiError(error)
    },
  })

  // Utility functions
  const createSession = useCallback(async (title: string, documentId: string) => {
    return createSessionMutation.mutateAsync({
      documentId,
      title,
    })
  }, [createSessionMutation])

  const sendMessage = useCallback(async (content: string) => {
    if (!currentSessionId) {
      throw new Error('No active chat session')
    }
    
    return sendMessageMutation.mutateAsync({
      content,
      sessionId: currentSessionId,
    })
  }, [currentSessionId, sendMessageMutation])

  const sendMessageToSession = useCallback(async (content: string, targetSessionId: string) => {
    return sendMessageMutation.mutateAsync({
      content,
      sessionId: targetSessionId,
    })
  }, [sendMessageMutation])

  const switchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    return deleteSessionMutation.mutateAsync(sessionId)
  }, [deleteSessionMutation])

  // Handle errors
  if (sessionsError) {
    handleApiError(sessionsError)
  }
  if (messagesError) {
    handleApiError(messagesError)
  }

  const state: ChatState = {
    sessions: sessionsResponse?.data || [],
    currentSession: sessionResponse?.data || null,
    messages: messagesResponse?.data || [],
    isLoading: isLoadingSessions || isLoadingSession || isLoadingMessages,
    isLoadingSessions,
    isLoadingMessages,
    isSendingMessage: sendMessageMutation.isPending,
    error: null, // Errors are handled by useErrorHandler
  }

  return {
    ...state,
    createSession,
    sendMessage,
    sendMessageToSession,
    switchSession,
    deleteSession,
    setCurrentSessionId,
    isCreatingSession: createSessionMutation.isPending,
    isDeletingSession: deleteSessionMutation.isPending,
  }
}

export default useChat