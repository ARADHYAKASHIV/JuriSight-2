import { Router } from 'express'
import { query, validationResult } from 'express-validator'
import { AnalyticsService } from '@/services/AnalyticsService'
import { authMiddleware, AuthenticatedRequest, requireRole } from '@/middleware/authMiddleware'
import { AppError } from '@/middleware/errorHandler'
import { UserRole } from '@shared'

const router = Router()
const analyticsService = new AnalyticsService()

// Get dashboard metrics
router.get('/dashboard', async (req: any, res: any, next: any) => {
  try {
    const metrics = await analyticsService.getDashboardMetrics(
      req.user!.id,
      req.user!.role
    )

    res.status(200).json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    next(error)
  }
})

// Get usage statistics
router.get('/usage', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  query('workspaceId').optional().isString(),
  query('userId').optional().isString(),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      period = '30d',
      workspaceId,
      userId,
    } = req.query

    const stats = await analyticsService.getUsageStatistics({
      requestingUserId: req.user!.id,
      requestingUserRole: req.user!.role,
      period: period as string,
      workspaceId: workspaceId as string,
      userId: userId as string,
    })

    res.status(200).json({
      success: true,
      data: stats,
    })
  } catch (error) {
    next(error)
  }
})

// Get performance metrics
router.get('/performance', [
  query('period').optional().isIn(['7d', '30d', '90d']),
  query('metric').optional().isIn(['response_time', 'processing_time', 'error_rate', 'throughput']),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      period = '30d',
      metric,
    } = req.query

    const metrics = await analyticsService.getPerformanceMetrics({
      requestingUserId: req.user!.id,
      requestingUserRole: req.user!.role,
      period: period as string,
      metric: metric as string,
    })

    res.status(200).json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    next(error)
  }
})

// Get document analytics
router.get('/documents', [
  query('workspaceId').optional().isString(),
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  query('groupBy').optional().isIn(['category', 'user', 'workspace', 'date']),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      workspaceId,
      period = '30d',
      groupBy = 'date',
    } = req.query

    const analytics = await analyticsService.getDocumentAnalytics({
      requestingUserId: req.user!.id,
      requestingUserRole: req.user!.role,
      workspaceId: workspaceId as string,
      period: period as string,
      groupBy: groupBy as string,
    })

    res.status(200).json({
      success: true,
      data: analytics,
    })
  } catch (error) {
    next(error)
  }
})

// Get user activity analytics
router.get('/activity', [
  query('workspaceId').optional().isString(),
  query('userId').optional().isString(),
  query('period').optional().isIn(['7d', '30d', '90d']),
  query('activityType').optional().isString(),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      workspaceId,
      userId,
      period = '30d',
      activityType,
    } = req.query

    const activity = await analyticsService.getUserActivityAnalytics({
      requestingUserId: req.user!.id,
      requestingUserRole: req.user!.role,
      workspaceId: workspaceId as string,
      userId: userId as string,
      period: period as string,
      activityType: activityType as string,
    })

    res.status(200).json({
      success: true,
      data: activity,
    })
  } catch (error) {
    next(error)
  }
})

// Get AI usage analytics (admin only)
router.get('/ai-usage', requireRole([UserRole.ADMIN]), [
  query('period').optional().isIn(['7d', '30d', '90d']),
  query('service').optional().isIn(['gemini', 'openai', 'embeddings']),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      period = '30d',
      service,
    } = req.query

    const aiUsage = await analyticsService.getAIUsageAnalytics({
      period: period as string,
      service: service as string,
    })

    res.status(200).json({
      success: true,
      data: aiUsage,
    })
  } catch (error) {
    next(error)
  }
})

// Get system health metrics (admin only)
router.get('/system-health', requireRole([UserRole.ADMIN]), async (req: any, res: any, next: any) => {
  try {
    const health = await analyticsService.getSystemHealthMetrics()

    res.status(200).json({
      success: true,
      data: health,
    })
  } catch (error) {
    next(error)
  }
})

// Get export data
router.get('/export', [
  query('type').isIn(['usage', 'documents', 'activity', 'performance']),
  query('format').optional().isIn(['json', 'csv']),
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  query('workspaceId').optional().isString(),
], async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const {
      type,
      format = 'json',
      period = '30d',
      workspaceId,
    } = req.query

    const exportData = await analyticsService.exportAnalyticsData({
      requestingUserId: req.user!.id,
      requestingUserRole: req.user!.role,
      type: type as string,
      format: format as string,
      period: period as string,
      workspaceId: workspaceId as string,
    })

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${type}-${period}.csv`)
    }

    res.status(200).json({
      success: true,
      data: exportData,
    })
  } catch (error) {
    next(error)
  }
})

export default router