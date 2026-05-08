import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { body, query, validationResult } from 'express-validator'
import { DocumentService } from '@/services/DocumentService'
import { StorageService } from '@/services/StorageService'
import { authMiddleware, AuthenticatedRequest, requireWorkspaceAccess } from '@/middleware/authMiddleware'
import { AppError } from '@/middleware/errorHandler'
import { CreateDocumentSchema, UpdateDocumentSchema, DocumentCategory } from '@shared'

const router = Router()
const documentService = new DocumentService()
const storageService = new StorageService()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt').split(',')
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase()
    
    if (fileExtension && allowedTypes.includes(fileExtension)) {
      cb(null, true)
    } else {
      cb(new AppError(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`, 400, 'INVALID_FILE_TYPE'))
    }
  },
})

// Get documents with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('category').optional().isIn(Object.values(DocumentCategory)),
  query('workspaceId').optional().isString(),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'title', 'category']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
], authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      page = 1,
      limit = 20,
      search,
      category,
      workspaceId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    const result = await documentService.getDocuments({
      userId: authReq.user!.id,
      userRole: authReq.user!.role,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      category: category as DocumentCategory,
      workspaceId: workspaceId as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    })

    res.status(200).json({
      success: true,
      data: result.documents,
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

// Upload document
router.post('/', upload.single('file'), [
  body('workspaceId').isString().notEmpty(),
  body('title').optional().isString().trim(),
  body('category').optional().isIn(Object.values(DocumentCategory)),
  body('tags').optional().isArray(),
], authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    if (!req.file) {
      throw new AppError('File is required', 400, 'FILE_REQUIRED')
    }

    const { workspaceId, title, category, tags } = req.body
    
    // Parse tags if provided as string
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags

    const documentData = CreateDocumentSchema.parse({
      workspaceId,
      title: title || req.file.originalname,
      category: category || undefined,
      tags: parsedTags || undefined,
    })

    const result = await documentService.uploadDocument({
      file: req.file,
      documentData,
      userId: authReq.user!.id,
    })

    res.status(201).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
})

// Get document by ID
router.get('/:id', async (req: any, res: any, next: any) => {
  try {
    const document = await documentService.getDocumentById(req.params.id, req.user!.id, req.user!.role)
    
    if (!document) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
    }

    res.status(200).json({
      success: true,
      data: document,
    })
  } catch (error) {
    next(error)
  }
})

// Update document metadata
router.put('/:id', [
  body('title').optional().isString().trim(),
  body('category').optional().isIn(Object.values(DocumentCategory)),
  body('tags').optional().isArray(),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const updateData = UpdateDocumentSchema.parse(req.body)
    
    const document = await documentService.updateDocument(
      req.params.id,
      updateData,
      req.user!.id,
      req.user!.role
    )

    res.status(200).json({
      success: true,
      data: document,
    })
  } catch (error) {
    next(error)
  }
})

// Delete document
router.delete('/:id', async (req: any, res: any, next: any) => {
  try {
    await documentService.deleteDocument(req.params.id, req.user!.id, req.user!.role)

    res.status(200).json({
      success: true,
      data: {
        message: 'Document deleted successfully',
      },
    })
  } catch (error) {
    next(error)
  }
})

// Download document
router.get('/:id/download', async (req: any, res: any, next: any) => {
  try {
    const result = await documentService.downloadDocument(req.params.id, req.user!.id, req.user!.role)
    
    res.setHeader('Content-Type', result.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.send(result.buffer)
  } catch (error) {
    next(error)
  }
})

// Analyze document
router.post('/:id/analyze', async (req: any, res: any, next: any) => {
  try {
    const result = await documentService.analyzeDocument(req.params.id, req.user!.id, req.user!.role)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
})

// Get document analysis status
router.get('/:id/analysis', async (req: any, res: any, next: any) => {
  try {
    const analysis = await documentService.getDocumentAnalysis(req.params.id, req.user!.id, req.user!.role)

    res.status(200).json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    next(error)
  }
})

export default router