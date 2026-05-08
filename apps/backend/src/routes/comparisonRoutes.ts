import { Router } from 'express'
import { body, query, validationResult } from 'express-validator'
import { ComparisonService } from '@/services/ComparisonService'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/authMiddleware'
import { AppError } from '@/middleware/errorHandler'
import { CreateComparisonSchema } from '@shared'

const router = Router()
const comparisonService = new ComparisonService()

// Get comparisons
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('documentId').optional().isString(),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      page = 1,
      limit = 20,
      documentId,
    } = req.query

    const result = await comparisonService.getComparisons({
      userId: req.user!.id,
      userRole: req.user!.role,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      documentId: documentId as string,
    })

    res.status(200).json({
      success: true,
      data: result.comparisons,
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

// Create comparison
router.post('/', [
  body('doc1Id').isString().notEmpty(),
  body('doc2Id').isString().notEmpty(),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const comparisonData = CreateComparisonSchema.parse(req.body)
    
    const comparison = await comparisonService.createComparison({
      ...comparisonData,
      userId: req.user!.id,
      userRole: req.user!.role,
    })

    res.status(201).json({
      success: true,
      data: comparison,
    })
  } catch (error) {
    next(error)
  }
})

// Get comparison by ID
router.get('/:id', async (req: any, res: any, next: any) => {
  try {
    const comparison = await comparisonService.getComparisonById(
      req.params.id,
      req.user!.id,
      req.user!.role
    )

    if (!comparison) {
      throw new AppError('Comparison not found', 404, 'COMPARISON_NOT_FOUND')
    }

    res.status(200).json({
      success: true,
      data: comparison,
    })
  } catch (error) {
    next(error)
  }
})

// Delete comparison
router.delete('/:id', async (req: any, res: any, next: any) => {
  try {
    await comparisonService.deleteComparison(
      req.params.id,
      req.user!.id,
      req.user!.role
    )

    res.status(200).json({
      success: true,
      data: {
        message: 'Comparison deleted successfully',
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get comparison analysis
router.get('/:id/analysis', async (req: any, res: any, next: any) => {
  try {
    const analysis = await comparisonService.getComparisonAnalysis(
      req.params.id,
      req.user!.id,
      req.user!.role
    )

    res.status(200).json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    next(error)
  }
})

// Regenerate comparison analysis
router.post('/:id/reanalyze', async (req: any, res: any, next: any) => {
  try {
    const comparison = await comparisonService.reanalyzeComparison(
      req.params.id,
      req.user!.id,
      req.user!.role
    )

    res.status(200).json({
      success: true,
      data: comparison,
    })
  } catch (error) {
    next(error)
  }
})

export default router