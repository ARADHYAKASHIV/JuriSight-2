import { prisma } from '@/lib/clients'
import { AIService } from '@/services/AIService'
import { DocumentProcessor } from '@/services/DocumentProcessor'
import { AppError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'

export interface VectorSearchResult {
  documentId: string
  chunkIndex: number
  content: string
  similarity: number
  metadata?: any
}

export class VectorService {
  private aiService: AIService
  private documentProcessor: DocumentProcessor

  constructor() {
    this.aiService = new AIService()
    this.documentProcessor = new DocumentProcessor()
  }

  async createEmbeddings(documentId: string, content: string): Promise<void> {
    try {
      // Delete existing embeddings for this document
      await prisma.documentEmbedding.deleteMany({
        where: { documentId },
      })

      // Chunk the document content
      const chunks = this.documentProcessor.chunkDocument(content, 1000, 200)
      
      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        
        try {
          const embeddingResult = await this.aiService.generateEmbedding(chunk)
          
          const vectorStr = `[${embeddingResult.embedding.join(',')}]`
          const metaStr = JSON.stringify({
            model: embeddingResult.model,
            usage: embeddingResult.usage,
            chunkLength: chunk.length,
          })

          await prisma.$executeRawUnsafe(`
            INSERT INTO document_embeddings (id, "documentId", "chunkIndex", content, embedding, metadata, "createdAt")
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, $5::jsonb, NOW())
          `, documentId, i, chunk, vectorStr, metaStr)
          
        } catch (error) {
          logger.warn(`Failed to generate embedding for chunk ${i} of document ${documentId}:`, error)
          continue
        }
      }

      // Final logging since we inserted sequentially
      logger.info(`Created embeddings for document ${documentId}`)
    } catch (error) {
      logger.error('Error creating embeddings:', error)
      throw new AppError('Failed to create embeddings', 500, 'EMBEDDING_CREATION_ERROR')
    }
  }

  async searchSimilarContent(
    query: string,
    documentIds?: string[],
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<VectorSearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.aiService.generateEmbedding(query)
      const queryVector = `[${queryEmbedding.embedding.join(',')}]`

      // Build SQL query for vector similarity search
      let whereClause = ''
      const params: any[] = [queryVector, threshold, limit]
      
      if (documentIds && documentIds.length > 0) {
        whereClause = `AND "documentId" = ANY($4)`
        params.push(documentIds)
      }

      // Perform vector similarity search using raw SQL
      // Using pgvector cosine distance operator <=> instead of EUCLIDEAN <-> inside cosine similarity math
      const rawQuery = `
        SELECT 
          "documentId",
          "chunkIndex",
          content,
          1 - (embedding <=> $1::vector) as similarity,
          metadata
        FROM document_embeddings
        WHERE 1 - (embedding <=> $1::vector) > $2
        ${whereClause}
        ORDER BY similarity DESC
        LIMIT $3
      `

      try {
        const results = await prisma.$queryRawUnsafe(rawQuery, ...params) as any[]
        
        return results.map(row => ({
          documentId: row.documentId,
          chunkIndex: row.chunkIndex,
          content: row.content,
          similarity: parseFloat(row.similarity),
          metadata: row.metadata,
        }))
      } catch (sqlError) {
        // Fallback to basic text search if vector search fails
        logger.warn('Vector search failed, falling back to text search:', sqlError)
        return await this.fallbackTextSearch(query, documentIds, limit)
      }
    } catch (error) {
      logger.error('Error searching similar content:', error)
      throw new AppError('Failed to search similar content', 500, 'SIMILARITY_SEARCH_ERROR')
    }
  }

  private async fallbackTextSearch(
    query: string,
    documentIds?: string[],
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    const whereClause: any = {
      content: {
        contains: query,
        mode: 'insensitive',
      },
    }

    if (documentIds && documentIds.length > 0) {
      whereClause.documentId = {
        in: documentIds,
      }
    }

    const results = await prisma.documentEmbedding.findMany({
      where: whereClause,
      take: limit,
      orderBy: { chunkIndex: 'asc' },
    })

    return results.map((result: any) => ({
      documentId: result.documentId,
      chunkIndex: result.chunkIndex,
      content: result.content,
      similarity: 0.5, // Default similarity for text search
      metadata: result.metadata,
    }))
  }

  async getDocumentChunks(documentId: string): Promise<VectorSearchResult[]> {
    try {
      const chunks = await prisma.documentEmbedding.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
      })

      return chunks.map((chunk: any) => ({
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        similarity: 1.0,
        metadata: chunk.metadata,
      }))
    } catch (error) {
      logger.error('Error getting document chunks:', error)
      throw new AppError('Failed to get document chunks', 500, 'CHUNK_RETRIEVAL_ERROR')
    }
  }

  async deleteEmbeddings(documentId: string): Promise<void> {
    try {
      await prisma.documentEmbedding.deleteMany({
        where: { documentId },
      })
      
      logger.info(`Deleted embeddings for document ${documentId}`)
    } catch (error) {
      logger.error('Error deleting embeddings:', error)
      throw new AppError('Failed to delete embeddings', 500, 'EMBEDDING_DELETION_ERROR')
    }
  }

  async getEmbeddingStats(documentId?: string): Promise<any> {
    try {
      const whereClause = documentId ? { documentId } : {}
      
      const stats = await prisma.documentEmbedding.aggregate({
        where: whereClause,
        _count: {
          id: true,
        },
        _avg: {
          chunkIndex: true,
        },
      })

      const documents = await prisma.documentEmbedding.groupBy({
        by: ['documentId'],
        where: whereClause,
        _count: {
          id: true,
        },
      })

      return {
        totalChunks: stats._count.id,
        averageChunkIndex: stats._avg.chunkIndex,
        documentsWithEmbeddings: documents.length,
        chunksPerDocument: documents.map((doc: any) => ({
          documentId: doc.documentId,
          chunkCount: doc._count.id,
        })),
      }
    } catch (error) {
      logger.error('Error getting embedding stats:', error)
      throw new AppError('Failed to get embedding stats', 500, 'EMBEDDING_STATS_ERROR')
    }
  }
}

export default VectorService