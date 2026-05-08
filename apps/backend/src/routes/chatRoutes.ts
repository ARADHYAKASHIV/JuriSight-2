import { Router, Response, NextFunction } from 'express'
import { body, query, validationResult } from 'express-validator'
import { ChatService } from '@/services/ChatService'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/authMiddleware'
import { AppError } from '@/middleware/errorHandler'
import { CreateChatSessionSchema, CreateChatMessageSchema } from '@shared'

const router = Router()
const chatService = new ChatService()

// Get chat sessions
router.get('/sessions', [
  query('documentId').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      documentId,
      page = 1,
      limit = 20,
    } = req.query

    const result = await chatService.getChatSessions({
      userId: req.user!.id,
      userRole: req.user!.role,
      documentId: documentId as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    })

    res.status(200).json({
      success: true,
      data: result.sessions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit as string)),
      },
    })
  } catch (error) {
    next(error)
  }
})

// Create chat session
router.post('/sessions', [
  body('documentId').isString().notEmpty(),
  body('title').optional().isString().trim(),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const sessionData = CreateChatSessionSchema.parse(req.body)
    
    const session = await chatService.createChatSession({
      ...sessionData,
      userId: req.user!.id,
    })

    res.status(201).json({
      success: true,
      data: session,
    })
  } catch (error) {
    next(error)
  }
})

// Get chat session by ID
router.get('/sessions/:id', async (req: any, res: any, next: any) => {
  try {
    const session = await chatService.getChatSessionById(
      req.params.id,
      req.user!.id,
      req.user!.role
    )

    if (!session) {
      throw new AppError('Chat session not found', 404, 'SESSION_NOT_FOUND')
    }

    res.status(200).json({
      success: true,
      data: session,
    })
  } catch (error) {
    next(error)
  }
})

// Get chat messages for a session
router.get('/sessions/:id/messages', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      page = 1,
      limit = 50,
    } = req.query

    const result = await chatService.getChatMessages({
      sessionId: req.params.id,
      userId: req.user!.id,
      userRole: req.user!.role,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    })

    res.status(200).json({
      success: true,
      data: result.messages,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit as string)),
      },
    })
  } catch (error) {
    next(error)
  }
})

// Send chat message
router.post('/messages', [
  body('sessionId').isString().notEmpty(),
  body('content').isString().trim().isLength({ min: 1 }),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const messageData = CreateChatMessageSchema.parse(req.body)
    
    const result = await chatService.sendMessage({
      ...messageData,
      userId: req.user!.id,
      userRole: req.user!.role,
    })

    res.status(201).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
})

// Delete chat session
router.delete('/sessions/:id', async (req: any, res: any, next: any) => {
  try {
    await chatService.deleteChatSession(
      req.params.id,
      req.user!.id,
      req.user!.role
    )

    res.status(200).json({
      success: true,
      data: {
        message: 'Chat session deleted successfully',
      },
    })
  } catch (error) {
    next(error)
  }
})

// Update chat session
router.put('/sessions/:id', [
  body('title').optional().isString().trim(),
  body('context').optional().isObject(),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const session = await chatService.updateChatSession(
      req.params.id,
      req.body,
      req.user!.id,
      req.user!.role
    )

    res.status(200).json({
      success: true,
      data: session,
    })
  } catch (error) {
    next(error)
  }
})

export default router