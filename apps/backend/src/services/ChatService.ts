import { prisma } from '@/lib/clients'
import { AIService } from '@/services/AIService'
import { VectorService } from '@/services/VectorService'
import { AppError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'
import {
  ChatSession,
  ChatMessage,
  CreateChatSession,
  CreateChatMessage,
  ChatMessageType,
  UserRole,
  UserActivityType,
} from '@shared'

export interface ChatSessionFilters {
  userId: string
  userRole: UserRole
  documentId?: string
  page: number
  limit: number
}

export interface ChatMessageFilters {
  sessionId: string
  userId: string
  userRole: UserRole
  page: number
  limit: number
}

export interface SendMessageData {
  sessionId: string
  content: string
  userId: string
  userRole: UserRole
}

export interface ChatSessionResult {
  sessions: ChatSession[]
  total: number
}

export interface ChatMessageResult {
  messages: ChatMessage[]
  total: number
}

export interface ChatResponse {
  userMessage: ChatMessage
  assistantMessage: ChatMessage
}

export class ChatService {
  private aiService: AIService
  private vectorService: VectorService

  constructor() {
    this.aiService = new AIService()
    this.vectorService = new VectorService()
  }

  async getChatSessions(filters: ChatSessionFilters): Promise<ChatSessionResult> {
    try {
      const { userId, userRole, documentId, page, limit } = filters
      const skip = (page - 1) * limit

      // Build where clause
      const whereClause: any = {}

      if (documentId) {
        whereClause.documentId = documentId
      }

      // User can only see their own chat sessions (unless admin)
      if (userRole !== UserRole.ADMIN) {
        whereClause.userId = userId
      }

      // Ensure user has access to the document
      if (userRole !== UserRole.ADMIN) {
        whereClause.document = {
          workspace: {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        }
      }

      const [sessions, total] = await Promise.all([
        prisma.chatSession.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            document: {
              select: {
                id: true,
                title: true,
                workspaceId: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            _count: {
              select: {
                messages: true,
              },
            },
          },
        }),
        prisma.chatSession.count({ where: whereClause }),
      ])

      return {
        sessions: sessions as any,
        total,
      }
    } catch (error) {
      logger.error('Error fetching chat sessions:', error)
      throw new AppError('Failed to fetch chat sessions', 500, 'CHAT_SESSIONS_FETCH_ERROR')
    }
  }

  async createChatSession(data: CreateChatSession & { userId: string }): Promise<ChatSession> {
    try {
      const { documentId, title, userId } = data

      // Verify user has access to the document
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          workspace: {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        },
        select: {
          id: true,
          title: true,
          workspaceId: true,
        },
      })

      if (!document) {
        throw new AppError('Document not found or access denied', 404, 'DOCUMENT_NOT_FOUND')
      }

      const session = await prisma.chatSession.create({
        data: {
          documentId,
          userId,
          title: title || `Chat about ${document.title}`,
          context: {
            documentTitle: document.title,
            createdAt: new Date().toISOString(),
          },
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      })

      // Log activity
      await prisma.userActivity.create({
        data: {
          userId,
          workspaceId: document.workspaceId,
          type: UserActivityType.CHAT_SESSION,
          entityType: 'chat_session',
          entityId: session.id,
          metadata: {
            documentId,
            documentTitle: document.title,
            sessionTitle: session.title,
          },
        },
      })

      logger.info(`Chat session created: ${session.id} by user ${userId}`)
      return session as any
    } catch (error) {
      logger.error('Error creating chat session:', error)

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Failed to create chat session', 500, 'CHAT_SESSION_CREATE_ERROR')
    }
  }

  async getChatSessionById(sessionId: string, userId: string, userRole: UserRole): Promise<ChatSession | null> {
    try {
      const whereClause: any = { id: sessionId }

      // User can only access their own sessions (unless admin)
      if (userRole !== UserRole.ADMIN) {
        whereClause.userId = userId
      }

      const session = await prisma.chatSession.findFirst({
        where: whereClause,
        include: {
          document: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
              content: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      })

      return session as any
    } catch (error) {
      logger.error('Error fetching chat session:', error)
      throw new AppError('Failed to fetch chat session', 500, 'CHAT_SESSION_FETCH_ERROR')
    }
  }

  async getChatMessages(filters: ChatMessageFilters): Promise<ChatMessageResult> {
    try {
      const { sessionId, userId, userRole, page, limit } = filters
      const skip = (page - 1) * limit

      // Verify user has access to the session
      const session = await this.getChatSessionById(sessionId, userId, userRole)
      if (!session) {
        throw new AppError('Chat session not found', 404, 'SESSION_NOT_FOUND')
      }

      const [messages, total] = await Promise.all([
        prisma.chatMessage.findMany({
          where: { sessionId },
          skip,
          take: limit,
          orderBy: { createdAt: 'asc' },
        }),
        prisma.chatMessage.count({ where: { sessionId } }),
      ])

      return {
        messages: messages as any,
        total,
      }
    } catch (error) {
      logger.error('Error fetching chat messages:', error)

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Failed to fetch chat messages', 500, 'CHAT_MESSAGES_FETCH_ERROR')
    }
  }

  async sendMessage(data: SendMessageData): Promise<ChatResponse> {
    try {
      const { sessionId, content, userId, userRole } = data

      // Verify session access
      const session = await this.getChatSessionById(sessionId, userId, userRole)
      if (!session) {
        throw new AppError('Chat session not found', 404, 'SESSION_NOT_FOUND')
      }

      // Create user message
      const userMessage = await prisma.chatMessage.create({
        data: {
          sessionId,
          type: ChatMessageType.USER,
          content,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      })

      // Generate AI response
      const assistantResponse = await this.generateAIResponse(session, content)

      // Create assistant message
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId,
          type: ChatMessageType.ASSISTANT,
          content: assistantResponse.content,
          metadata: assistantResponse.metadata,
          citations: assistantResponse.citations,
          confidenceScore: assistantResponse.confidence,
        },
      })

      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      })

      logger.info(`Chat message sent in session ${sessionId}`)

      return {
        userMessage: userMessage as any,
        assistantMessage: assistantMessage as any,
      }
    } catch (error) {
      logger.error('Error sending chat message:', error)

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Failed to send message', 500, 'MESSAGE_SEND_ERROR')
    }
  }

  private async generateAIResponse(session: any, userQuestion: string): Promise<{
    content: string
    metadata: any
    citations: any[]
    confidence: number
  }> {
    try {
      // Search for relevant content using vector similarity
      const relevantChunks = await this.vectorService.searchSimilarContent(
        userQuestion,
        [session.document.id],
        5,
        0.7
      )

      // Prepare context from relevant chunks
      const context = relevantChunks.length > 0
        ? relevantChunks.map(chunk => chunk.content).join('\n\n')
        : session.document.content || 'No document content available'

      // Generate AI response
      const aiResponse = await this.aiService.answerQuestion(userQuestion, context)

      // Prepare citations
      const citations = relevantChunks.map((chunk, index) => ({
        chunkIndex: chunk.chunkIndex,
        text: chunk.content.substring(0, 200) + '...',
        confidence: chunk.similarity,
        source: `Chunk ${chunk.chunkIndex + 1}`,
      }))

      return {
        content: aiResponse,
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'ai-assistant',
          chunksUsed: relevantChunks.length,
          processingTime: Date.now(),
        },
        citations,
        confidence: relevantChunks.length > 0 ? 0.8 : 0.5,
      }
    } catch (error) {
      logger.error('Error generating AI response:', error)

      // Fallback response
      return {
        content: 'I apologize, but I encountered an error while processing your question. Please try again or rephrase your question.',
        metadata: {
          timestamp: new Date().toISOString(),
          error: true,
        },
        citations: [],
        confidence: 0.1,
      }
    }
  }

  async updateChatSession(
    sessionId: string,
    updateData: { title?: string; context?: any },
    userId: string,
    userRole: UserRole
  ): Promise<ChatSession> {
    try {
      // Verify access
      const session = await this.getChatSessionById(sessionId, userId, userRole)
      if (!session) {
        throw new AppError('Chat session not found', 404, 'SESSION_NOT_FOUND')
      }

      const updatedSession = await prisma.chatSession.update({
        where: { id: sessionId },
        data: updateData,
        include: {
          document: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      })

      return updatedSession as any
    } catch (error) {
      logger.error('Error updating chat session:', error)

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Failed to update chat session', 500, 'SESSION_UPDATE_ERROR')
    }
  }

  async deleteChatSession(sessionId: string, userId: string, userRole: UserRole): Promise<void> {
    try {
      // Verify access
      const session = await this.getChatSessionById(sessionId, userId, userRole)
      if (!session) {
        throw new AppError('Chat session not found', 404, 'SESSION_NOT_FOUND')
      }

      // Check if user can delete (must be owner or admin)
      if (session.user.id !== userId && userRole !== UserRole.ADMIN) {
        throw new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS')
      }

      await prisma.chatSession.delete({
        where: { id: sessionId },
      })

      logger.info(`Chat session deleted: ${sessionId} by user ${userId}`)
    } catch (error) {
      logger.error('Error deleting chat session:', error)

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Failed to delete chat session', 500, 'SESSION_DELETE_ERROR')
    }
  }
}

export default ChatService