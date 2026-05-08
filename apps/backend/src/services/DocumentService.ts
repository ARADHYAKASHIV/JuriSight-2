import { prisma } from '@/lib/clients'
import { StorageService } from '@/services/StorageService'
import { DocumentProcessor } from '@/services/DocumentProcessor'
import { AppError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'
import {
  Document,
  CreateDocument,
  UpdateDocument,
  DocumentCategory,
  UserRole,
  UserActivityType,
} from '@shared'

export interface DocumentFilters {
  userId: string
  userRole: UserRole
  page: number
  limit: number
  search?: string
  category?: DocumentCategory
  workspaceId?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface DocumentUploadData {
  file: Express.Multer.File
  documentData: CreateDocument
  userId: string
}

export interface DocumentListResult {
  documents: Document[]
  total: number
}

export class DocumentService {
  private storageService: StorageService
  private documentProcessor: DocumentProcessor

  constructor() {
    this.storageService = new StorageService()
    this.documentProcessor = new DocumentProcessor()
  }

  async getDocuments(filters: DocumentFilters): Promise<DocumentListResult> {
    try {
      const {
        userId,
        userRole,
        page,
        limit,
        search,
        category,
        workspaceId,
        sortBy,
        sortOrder,
      } = filters

      const skip = (page - 1) * limit

      // Build where clause based on user permissions
      const whereClause: any = {}

      // Workspace access control
      if (workspaceId) {
        whereClause.workspaceId = workspaceId
      }

      // User can only see documents from workspaces they belong to (unless admin)
      if (userRole !== UserRole.ADMIN) {
        whereClause.workspace = {
          members: {
            some: {
              userId: userId,
            },
          },
        }
      }

      // Apply filters
      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { originalName: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (category) {
        whereClause.category = category
      }

      // Get total count
      const total = await prisma.document.count({ where: whereClause })

      // Get documents
      const documents = await prisma.document.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              chatSessions: true,
              annotations: true,
            },
          },
        },
      })

      return {
        documents: documents as any,
        total,
      }
    } catch (error) {
      logger.error('Error fetching documents:', error)
      throw new AppError('Failed to fetch documents', 500, 'DOCUMENT_FETCH_ERROR')
    }
  }

  async uploadDocument(data: DocumentUploadData): Promise<Document> {
    try {
      const { file, documentData, userId } = data

      // Verify workspace access
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: documentData.workspaceId,
            userId: userId,
          },
        },
      })

      if (!workspaceMember) {
        throw new AppError('Access denied to workspace', 403, 'WORKSPACE_ACCESS_DENIED')
      }

      // Save file to storage
      const storageResult = await this.storageService.saveFile(
        file.buffer,
        file.originalname,
        file.mimetype
      )

      // Extract text content
      let extractedContent: any = null
      let processingTime = 0
      const startTime = Date.now()

      try {
        extractedContent = await this.documentProcessor.extractText(
          file.buffer,
          file.mimetype,
          file.originalname
        )
        processingTime = Date.now() - startTime
      } catch (error) {
        logger.warn('Text extraction failed, continuing without content:', error)
      }

      // Deduplicate: if same file content was already uploaded by this user, return existing record
      const existingByHash = await prisma.document.findFirst({
        where: {
          hash: storageResult.hash,
          uploadedById: userId,
        },
        include: {
          workspace: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, email: true } },
        },
      })

      if (existingByHash) {
        logger.info(`Duplicate document detected (hash match). Returning existing record ${existingByHash.id}`)
        return existingByHash as any
      }

      // Create document record
      let document: any
      try {
        document = await prisma.document.create({
          data: {
            workspaceId: documentData.workspaceId,
            uploadedById: userId,
            title: documentData.title || file.originalname,
            originalName: file.originalname,
            mimeType: file.mimetype,
            category: documentData.category,
            tags: documentData.tags || [],
            content: extractedContent?.text,
            metadata: {
              filename: storageResult.filename,
              size: storageResult.size,
              hash: storageResult.hash,
              processingTime,
              textMetadata: extractedContent?.metadata,
              uploadedAt: new Date().toISOString(),
            },
            hash: storageResult.hash,
            confidenceScore: extractedContent ? 0.9 : 0.5,
            processingTime,
          },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
            uploadedBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        })
      } catch (createError: any) {
        // Race condition safety net — another concurrent upload of same file won
        if (createError?.code === 'P2002' && createError?.meta?.target?.includes('hash')) {
          const raceDocument = await prisma.document.findFirst({
            where: { hash: storageResult.hash, uploadedById: userId },
            include: {
              workspace: { select: { id: true, name: true } },
              uploadedBy: { select: { id: true, email: true } },
            },
          })
          if (raceDocument) return raceDocument as any
        }
        throw createError
      }

      // Log activity
      await prisma.userActivity.create({
        data: {
          userId,
          workspaceId: documentData.workspaceId,
          type: UserActivityType.DOCUMENT_UPLOAD,
          entityType: 'document',
          entityId: document.id,
          metadata: {
            documentTitle: document.title,
            fileSize: storageResult.size,
            mimeType: file.mimetype,
          },
        },
      })

      logger.info(`Document uploaded: ${document.id} by user ${userId}`)
      return document as any
    } catch (error) {
      logger.error('Error uploading document:', error)
      
      if (error instanceof AppError) {
        throw error
      }
      
      throw new AppError('Failed to upload document', 500, 'DOCUMENT_UPLOAD_ERROR')
    }
  }

  async getDocumentById(documentId: string, userId: string, userRole: UserRole): Promise<Document | null> {
    try {
      const whereClause: any = { id: documentId }

      // User can only access documents from workspaces they belong to (unless admin)
      if (userRole !== UserRole.ADMIN) {
        whereClause.workspace = {
          members: {
            some: {
              userId: userId,
            },
          },
        }
      }

      const document = await prisma.document.findFirst({
        where: whereClause,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              chatSessions: true,
              annotations: true,
              comparisons1: true,
              comparisons2: true,
            },
          },
        },
      })

      if (document) {
        // Log view activity
        await prisma.userActivity.create({
          data: {
            userId,
            workspaceId: document.workspaceId,
            type: UserActivityType.DOCUMENT_VIEW,
            entityType: 'document',
            entityId: document.id,
            metadata: {
              documentTitle: document.title,
            },
          },
        })
      }

      return document as any
    } catch (error) {
      logger.error('Error fetching document:', error)
      throw new AppError('Failed to fetch document', 500, 'DOCUMENT_FETCH_ERROR')
    }
  }

  async updateDocument(
    documentId: string,
    updateData: UpdateDocument,
    userId: string,
    userRole: UserRole
  ): Promise<Document> {
    try {
      // Verify access
      const document = await this.getDocumentById(documentId, userId, userRole)
      
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
      }

      // Update document
      const updatedDocument = await prisma.document.update({
        where: { id: documentId },
        data: updateData,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      })

      logger.info(`Document updated: ${documentId} by user ${userId}`)
      return updatedDocument as any
    } catch (error) {
      logger.error('Error updating document:', error)
      
      if (error instanceof AppError) {
        throw error
      }
      
      throw new AppError('Failed to update document', 500, 'DOCUMENT_UPDATE_ERROR')
    }
  }

  async deleteDocument(documentId: string, userId: string, userRole: UserRole): Promise<void> {
    try {
      // Verify access
      const document = await this.getDocumentById(documentId, userId, userRole)
      
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
      }

      // Check if user can delete (must be uploader, workspace admin, or system admin)
      const canDelete = userRole === UserRole.ADMIN || 
                       document.uploadedById === userId ||
                       await this.isWorkspaceAdmin(userId, document.workspaceId)

      if (!canDelete) {
        throw new AppError('Insufficient permissions to delete document', 403, 'INSUFFICIENT_PERMISSIONS')
      }

      // Delete file from storage
      const filename = (document.metadata as any)?.filename
      if (filename) {
        await this.storageService.deleteFile(filename)
      }

      // Delete document record (cascading deletes will handle related records)
      await prisma.document.delete({
        where: { id: documentId },
      })

      logger.info(`Document deleted: ${documentId} by user ${userId}`)
    } catch (error) {
      logger.error('Error deleting document:', error)
      
      if (error instanceof AppError) {
        throw error
      }
      
      throw new AppError('Failed to delete document', 500, 'DOCUMENT_DELETE_ERROR')
    }
  }

  async downloadDocument(documentId: string, userId: string, userRole: UserRole) {
    try {
      const document = await this.getDocumentById(documentId, userId, userRole)
      
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
      }

      const filename = (document.metadata as any)?.filename
      if (!filename) {
        throw new AppError('File not available for download', 404, 'FILE_NOT_AVAILABLE')
      }

      const result = await this.storageService.getFile(filename)
      
      return {
        buffer: result.buffer,
        mimeType: result.mimeType,
        filename: document.originalName,
      }
    } catch (error) {
      logger.error('Error downloading document:', error)
      
      if (error instanceof AppError) {
        throw error
      }
      
      throw new AppError('Failed to download document', 500, 'DOCUMENT_DOWNLOAD_ERROR')
    }
  }

  async analyzeDocument(documentId: string, userId: string, userRole: UserRole) {
    try {
      const document = await this.getDocumentById(documentId, userId, userRole)
      
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
      }

      // Instead of synchronous analysis, enqueue a background job. Wait, we need the extracted text.
      // Assuming extractedText is stored in document.content as per uploadDocument.
      const { queueDocumentAnalysis } = await import('@/queues/documentQueue')
      
      const job = await queueDocumentAnalysis({
        documentId: document.id,
        userId,
        extractedText: document.content || null,
      })

      // Log analysis activity
      await prisma.userActivity.create({
        data: {
          userId,
          workspaceId: document.workspaceId,
          type: UserActivityType.DOCUMENT_ANALYZE,
          entityType: 'document',
          entityId: document.id,
          metadata: {
            documentTitle: document.title,
            analysisType: 'async_ai_analysis',
            jobId: job?.id,
          },
        },
      })

      return {
        jobId: job?.id,
        status: job ? 'queued' : 'bypassed',
        message: job ? 'Document analysis queued successfully. This may take a few moments.' : 'Queue bypassed.',
      }
    } catch (error) {
      logger.error('Error queuing document analysis:', error)
      
      if (error instanceof AppError) {
        throw error
      }
      
      throw new AppError('Failed to queue document analysis', 500, 'DOCUMENT_ANALYSIS_ERROR')
    }
  }

  async getDocumentAnalysis(documentId: string, userId: string, userRole: UserRole) {
    try {
      const document = await this.getDocumentById(documentId, userId, userRole)
      
      if (!document) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
      }

      // Return existing analysis from metadata or indicate none available
      const analysis = (document.metadata as any)?.analysis || null
      
      return {
        hasAnalysis: !!analysis,
        analysis,
        lastAnalyzed: analysis ? (document.metadata as any)?.lastAnalyzed : null,
      }
    } catch (error) {
      logger.error('Error fetching document analysis:', error)
      throw new AppError('Failed to fetch document analysis', 500, 'ANALYSIS_FETCH_ERROR')
    }
  }

  private async isWorkspaceAdmin(userId: string, workspaceId: string): Promise<boolean> {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    })

    return member?.role === 'ADMIN' || member?.role === 'OWNER'
  }
}

export default DocumentService