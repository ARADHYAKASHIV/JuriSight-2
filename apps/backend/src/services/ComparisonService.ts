import { prisma } from '@/lib/clients'
import { AIService } from '@/services/AIService'
import { AppError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'
import {
  DocumentComparison,
  CreateComparison,
  UserRole,
  UserActivityType,
} from '@shared'

export interface ComparisonFilters {
  userId: string
  userRole: UserRole
  page: number
  limit: number
  documentId?: string
}

export interface CreateComparisonData extends CreateComparison {
  userId: string
  userRole: UserRole
}

export interface ComparisonResult {
  comparisons: DocumentComparison[]
  total: number
}

export interface ComparisonAnalysisResult {
  similarityScore: number
  differences: Array<{
    type: 'added' | 'removed' | 'modified'
    text: string
    position: {
      start: number
      end: number
    }
    similarity?: number
  }>
  commonClauses: Array<{
    text: string
    similarity: number
    doc1Position: {
      start: number
      end: number
    }
    doc2Position: {
      start: number
      end: number
    }
  }>
  statistics: {
    totalWords: {
      doc1: number
      doc2: number
    }
    uniqueWords: {
      doc1: number
      doc2: number
    }
    commonWords: number
    lengthDifference: number
  }
}

export class ComparisonService {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService()
  }

  async getComparisons(filters: ComparisonFilters): Promise<ComparisonResult> {
    try {
      const { userId, userRole, page, limit, documentId } = filters
      const skip = (page - 1) * limit

      // Build where clause
      const whereClause: any = {}

      if (documentId) {
        whereClause.OR = [
          { doc1Id: documentId },
          { doc2Id: documentId },
        ]
      }

      // User can only see comparisons they performed or in workspaces they belong to (unless admin)
      if (userRole !== UserRole.ADMIN) {
        whereClause.AND = [
          {
            OR: [
              { performedById: userId },
              {
                document1: {
                  workspace: {
                    members: {
                      some: {
                        userId: userId,
                      },
                    },
                  },
                },
              },
              {
                document2: {
                  workspace: {
                    members: {
                      some: {
                        userId: userId,
                      },
                    },
                  },
                },
              },
            ],
          },
        ]
      }

      const [comparisons, total] = await Promise.all([
        prisma.documentComparison.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            document1: {
              select: {
                id: true,
                title: true,
                workspaceId: true,
              },
            },
            document2: {
              select: {
                id: true,
                title: true,
                workspaceId: true,
              },
            },
            performedBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        }),
        prisma.documentComparison.count({ where: whereClause }),
      ])

      return {
        comparisons: comparisons as any,
        total,
      }
    } catch (error) {
      logger.error('Error fetching comparisons:', error)
      throw new AppError('Failed to fetch comparisons', 500, 'COMPARISONS_FETCH_ERROR')
    }
  }

  async createComparison(data: CreateComparisonData): Promise<DocumentComparison> {
    try {
      const { doc1Id, doc2Id, userId, userRole } = data

      if (doc1Id === doc2Id) {
        throw new AppError('Cannot compare document with itself', 400, 'SAME_DOCUMENT_COMPARISON')
      }

      // Verify user has access to both documents
      const whereClause = userRole === UserRole.ADMIN
        ? { id: { in: [doc1Id, doc2Id] } }
        : {
            id: { in: [doc1Id, doc2Id] },
            workspace: {
              members: {
                some: {
                  userId: userId,
                },
              },
            },
          }

      const documents = await prisma.document.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          content: true,
          workspaceId: true,
        },
      })

      if (documents.length !== 2) {
        throw new AppError('One or both documents not found or access denied', 404, 'DOCUMENTS_NOT_FOUND')
      }

      const doc1 = documents.find((d: any) => d.id === doc1Id)!
      const doc2 = documents.find((d: any) => d.id === doc2Id)!

      // Check if comparison already exists
      const existingComparison = await prisma.documentComparison.findFirst({
        where: {
          OR: [
            { doc1Id, doc2Id },
            { doc1Id: doc2Id, doc2Id: doc1Id },
          ],
        },
      })

      if (existingComparison) {
        logger.info(`Returning existing comparison: ${existingComparison.id}`)
        return await this.getComparisonById(existingComparison.id, userId, userRole) as DocumentComparison
      }

      // Perform comparison analysis
      const analysisResult = await this.performComparison(doc1, doc2)

      // Create comparison record
      const comparison = await prisma.documentComparison.create({
        data: {
          doc1Id,
          doc2Id,
          results: analysisResult as any,
          similarityScore: analysisResult.similarityScore,
          performedById: userId,
        },
        include: {
          document1: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
          document2: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      })

      // Log activity
      await prisma.userActivity.create({
        data: {
          userId,
          workspaceId: doc1.workspaceId, // Use first document's workspace
          type: UserActivityType.DOCUMENT_COMPARE,
          entityType: 'comparison',
          entityId: comparison.id,
          metadata: {
            doc1Id,
            doc2Id,
            doc1Title: doc1.title,
            doc2Title: doc2.title,
            similarityScore: analysisResult.similarityScore,
          },
        },
      })

      logger.info(`Document comparison created: ${comparison.id} by user ${userId}`)
      return comparison as any
    } catch (error) {
      logger.error('Error creating comparison:', error)

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Failed to create comparison', 500, 'COMPARISON_CREATE_ERROR')
    }
  }

  private async performComparison(doc1: any, doc2: any): Promise<ComparisonAnalysisResult> {
    try {
      const startTime = Date.now()

      // Get AI-powered comparison if available
      let aiComparison: any = null
      try {
        if (doc1.content && doc2.content) {
          aiComparison = await this.aiService.compareDocuments(doc1.content, doc2.content)
        }
      } catch (aiError) {
        logger.warn('AI comparison failed, using fallback analysis:', aiError)
      }

      // Perform basic text comparison as fallback or supplement
      const basicComparison = this.performBasicComparison(doc1.content || '', doc2.content || '')

      // Combine AI and basic analysis results
      const result: ComparisonAnalysisResult = {
        similarityScore: aiComparison?.similarityScore || basicComparison.similarityScore,
        differences: aiComparison?.differences?.map((diff: any) => ({
          type: diff.type || 'modified',
          text: diff.text || diff,
          position: diff.position || { start: 0, end: 0 },
          similarity: diff.similarity,
        })) || basicComparison.differences,
        commonClauses: aiComparison?.commonClauses?.map((clause: any) => ({
          text: clause.text || clause,
          similarity: clause.similarity || 0.8,
          doc1Position: clause.doc1Position || { start: 0, end: 0 },
          doc2Position: clause.doc2Position || { start: 0, end: 0 },
        })) || basicComparison.commonClauses,
        statistics: basicComparison.statistics,
      }

      const processingTime = Date.now() - startTime
      logger.info(`Comparison completed in ${processingTime}ms`)

      return result
    } catch (error) {
      logger.error('Error performing comparison:', error)
      throw new AppError('Failed to perform document comparison', 500, 'COMPARISON_ANALYSIS_ERROR')
    }
  }

  private performBasicComparison(content1: string, content2: string): ComparisonAnalysisResult {
    // Simple word-based comparison
    const words1 = content1.toLowerCase().split(/\s+/).filter(w => w.length > 0)
    const words2 = content2.toLowerCase().split(/\s+/).filter(w => w.length > 0)

    const set1 = new Set(words1)
    const set2 = new Set(words2)

    const commonWords = new Set([...set1].filter(word => set2.has(word)))
    const uniqueWords1 = new Set([...set1].filter(word => !set2.has(word)))
    const uniqueWords2 = new Set([...set2].filter(word => !set1.has(word)))

    const similarityScore = commonWords.size / Math.max(set1.size, set2.size, 1)

    // Generate basic differences
    const differences = [
      ...Array.from(uniqueWords1).slice(0, 10).map(word => ({
        type: 'removed' as const,
        text: word,
        position: { start: 0, end: 0 },
      })),
      ...Array.from(uniqueWords2).slice(0, 10).map(word => ({
        type: 'added' as const,
        text: word,
        position: { start: 0, end: 0 },
      })),
    ]

    // Generate basic common clauses
    const commonPhrases = Array.from(commonWords).slice(0, 10).map(word => ({
      text: word,
      similarity: 1.0,
      doc1Position: { start: 0, end: 0 },
      doc2Position: { start: 0, end: 0 },
    }))

    return {
      similarityScore,
      differences,
      commonClauses: commonPhrases,
      statistics: {
        totalWords: {
          doc1: words1.length,
          doc2: words2.length,
        },
        uniqueWords: {
          doc1: uniqueWords1.size,
          doc2: uniqueWords2.size,
        },
        commonWords: commonWords.size,
        lengthDifference: Math.abs(words1.length - words2.length),
      },
    }
  }

  async getComparisonById(comparisonId: string, userId: string, userRole: UserRole): Promise<any> {
    try {
      const whereClause: any = { id: comparisonId }

      // User can only access comparisons they performed or in accessible workspaces (unless admin)
      if (userRole !== UserRole.ADMIN) {
        whereClause.OR = [
          { performedById: userId },
          {
            document1: {
              workspace: {
                members: {
                  some: {
                    userId: userId,
                  },
                },
              },
            },
          },
          {
            document2: {
              workspace: {
                members: {
                  some: {
                    userId: userId,
                  },
                },
              },
            },
          },
        ]
      }

      const comparison = await prisma.documentComparison.findFirst({
        where: whereClause,
        include: {
          document1: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
          document2: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      })

      return comparison as any
    } catch (error) {
      logger.error('Error fetching comparison:', error)
      throw new AppError('Failed to fetch comparison', 500, 'COMPARISON_FETCH_ERROR')
    }
  }

  async deleteComparison(comparisonId: string, userId: string, userRole: UserRole): Promise<void> {
    try {
      // Verify access
      const comparison = await this.getComparisonById(comparisonId, userId, userRole)
      if (!comparison) {
        throw new AppError('Comparison not found', 404, 'COMPARISON_NOT_FOUND')
      }

      // Check if user can delete (must be performer or admin)
      if (comparison.performedBy.id !== userId && userRole !== UserRole.ADMIN) {
        throw new AppError('Insufficient permissions to delete comparison', 403, 'INSUFFICIENT_PERMISSIONS')
      }

      await prisma.documentComparison.delete({
        where: { id: comparisonId },
      })

      logger.info(`Comparison deleted: ${comparisonId} by user ${userId}`)
    } catch (error) {
      logger.error('Error deleting comparison:', error)

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Failed to delete comparison', 500, 'COMPARISON_DELETE_ERROR')
    }
  }

  async getComparisonAnalysis(comparisonId: string, userId: string, userRole: UserRole): Promise<any> {
    try {
      const comparison = await this.getComparisonById(comparisonId, userId, userRole)
      if (!comparison) {
        throw new AppError('Comparison not found', 404, 'COMPARISON_NOT_FOUND')
      }

      return {
        results: comparison.results,
        similarityScore: comparison.similarityScore,
        createdAt: comparison.createdAt,
        documents: {
          doc1: comparison.document1,
          doc2: comparison.document2,
        },
        performedBy: comparison.performedBy,
      }
    } catch (error) {
      logger.error('Error fetching comparison analysis:', error)

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Failed to fetch comparison analysis', 500, 'ANALYSIS_FETCH_ERROR')
    }
  }

  async reanalyzeComparison(comparisonId: string, userId: string, userRole: UserRole): Promise<any> {
    try {
      const comparison = await this.getComparisonById(comparisonId, userId, userRole)
      if (!comparison) {
        throw new AppError('Comparison not found', 404, 'COMPARISON_NOT_FOUND')
      }

      // Get full document content
      const documents = await prisma.document.findMany({
        where: {
          id: { in: [comparison.document1.id, comparison.document2.id] },
        },
        select: {
          id: true,
          title: true,
          content: true,
          workspaceId: true,
        },
      })

      const doc1 = documents.find((d: any) => d.id === comparison.document1.id)!
      const doc2 = documents.find((d: any) => d.id === comparison.document2.id)!

      // Perform new analysis
      const analysisResult = await this.performComparison(doc1, doc2)

      // Update comparison
      const updatedComparison = await prisma.documentComparison.update({
        where: { id: comparisonId },
        data: {
          results: analysisResult as any,
          similarityScore: analysisResult.similarityScore,
        },
        include: {
          document1: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
          document2: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      })

      logger.info(`Comparison reanalyzed: ${comparisonId} by user ${userId}`)
      return updatedComparison as any
    } catch (error) {
      logger.error('Error reanalyzing comparison:', error)

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('Failed to reanalyze comparison', 500, 'COMPARISON_REANALYSIS_ERROR')
    }
  }
}

export default ComparisonService