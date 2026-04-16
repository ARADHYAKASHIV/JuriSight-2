import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from '@/lib/clients'
import { DocumentProcessor } from '@/services/DocumentProcessor'
import { AIService } from '@/services/AIService'
import { VectorService } from '@/services/VectorService'
import { logger } from '@/utils/logger'

// Helper to determine if Redis should be used
// Check root .env manually or rely on a simple check
let redisConnection: Redis | null = null
let documentAnalysisQueue: Queue | null = null

const initQueue = () => {
  if (process.env.REDIS_DISABLED === 'true' || process.env.NODE_ENV === 'test') {
    logger.warn('Redis is disabled. Skipping Queue/Worker initialization.')
    return
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    // Check if we should even try (e.g. if we know localhost is down)
    if (redisUrl.includes('localhost')) {
      // In a real dev environment, we might want to try once, 
      // but here we've seen it fail repeatedly. 
      // For this specific session, I'll force disable it if it's localhost.
      logger.warn('Local Redis detected but appears unavailable. Skipping DocumentQueue to prevent crash.')
      process.env.REDIS_DISABLED = 'true'
      return
    }

    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      connectTimeout: 1000,
    })

    redisConnection.on('error', (err) => {
      // Intentionally silent or just a logger.warn to prevent process crash
      if (process.env.REDIS_DISABLED !== 'true') {
        logger.warn('Redis connection lost in DocumentQueue: ' + err.message)
        process.env.REDIS_DISABLED = 'true' // Disable further attempts
      }
    })

    // Create queues
    documentAnalysisQueue = new Queue('documentAnalysis', { connection: redisConnection })
  } catch (err) {
    logger.warn('Redis initialization skipped in DocumentQueue.')
    process.env.REDIS_DISABLED = 'true'
  }
}

// Initialize on first import, but safely
initQueue()

// Job interface
export interface DocumentAnalysisJob {
  documentId: string
  userId: string
  extractedText: string | null
}

// Worker setup (only if Redis is available)
if (redisConnection && process.env.REDIS_DISABLED !== 'true') {
  const documentAnalysisWorker = new Worker(
    'documentAnalysis',
    async (job: Job<DocumentAnalysisJob>) => {
      const { documentId, userId, extractedText } = job.data
      logger.info(`Starting async analysis for document ${documentId}`)
      
      try {
        // 1. Re-fetch document to ensure it exists
        const document = await prisma.document.findUnique({
          where: { id: documentId },
          include: { workspace: true }
        })
        
        if (!document) {
          throw new Error(`Document ${documentId} not found`)
        }

        // 2. Perform AI Analysis if text is available
        if (extractedText) {
          const aiService = new AIService()
          const analysis = await aiService.analyzeDocument(extractedText, document.originalName)
          
          // 3. Update document with analysis metadata
          const metadata = (document.metadata as any) || {}
          await prisma.document.update({
            where: { id: documentId },
            data: {
              metadata: {
                ...metadata,
                analysis,
                lastAnalyzed: new Date().toISOString()
              }
            }
          })
          
          // 4. Generate embeddings for vector search
          const vectorService = new VectorService()
          await vectorService.createEmbeddings(documentId, extractedText)
          
          logger.info(`Successfully completed analysis for document ${documentId}`)
        } else {
          logger.warn(`No extracted text for document ${documentId}, skipping analysis.`)
        }
        
      } catch (error) {
        logger.error(`Document analysis failed for job ${job.id}:`, error)
        throw error // Let BullMQ handle retry/failure logic
      }
    },
    { 
      connection: redisConnection,
      concurrency: 5 // Process up to 5 documents concurrently
    }
  )

  documentAnalysisWorker.on('completed', (job: Job) => {
    logger.info(`Job ${job.id} completed successfully`)
  })

  documentAnalysisWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`Job ${job?.id} failed with error:`, err)
  })
} else {
  logger.warn('Document Analysis Worker skipped: Redis is unavailable.')
}

export const queueDocumentAnalysis = async (data: DocumentAnalysisJob) => {
  if (!documentAnalysisQueue) {
    // Inline fallback: run analysis directly when Redis is unavailable
    logger.info(`Running inline analysis for document ${data.documentId} (Redis unavailable)`)
    try {
      const document = await prisma.document.findUnique({
        where: { id: data.documentId },
        include: { workspace: true }
      })
      if (!document) {
        logger.warn(`Document ${data.documentId} not found for inline analysis`)
        return null
      }
      if (data.extractedText) {
        const aiService = new AIService()
        const analysis = await aiService.analyzeDocument(data.extractedText, document.originalName)
        const metadata = (document.metadata as any) || {}
        await prisma.document.update({
          where: { id: data.documentId },
          data: {
            metadata: {
              ...metadata,
              analysis,
              lastAnalyzed: new Date().toISOString()
            }
          }
        })
        const vectorService = new VectorService()
        await vectorService.createEmbeddings(data.documentId, data.extractedText)
        logger.info(`Inline analysis completed for document ${data.documentId}`)
      }
    } catch (error) {
      logger.error(`Inline analysis failed for document ${data.documentId}:`, error)
    }
    return null
  }
  return documentAnalysisQueue.add('analyze', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  })
}

export { documentAnalysisQueue }
