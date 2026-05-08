import { prisma } from '@/lib/clients'
import { AppError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'
import { UserRole, AnalyticsMetrics } from '@shared'

export class AnalyticsService {
  async getDashboardMetrics(userId: string, userRole: UserRole): Promise<AnalyticsMetrics> {
    try {
      const isAdmin = userRole === UserRole.ADMIN
      
      // Get accessible workspace IDs for non-admin users
      const workspaceIds = isAdmin ? [] : await this.getAccessibleWorkspaceIds(userId)
      
      const [
        totalDocuments,
        totalUsers,
        totalWorkspaces,
        documentsThisMonth,
        activeUsersThisMonth,
        avgProcessingTime,
        apiCallsThisMonth,
      ] = await Promise.all([
        this.getDocumentCount(isAdmin, workspaceIds),
        this.getUserCount(isAdmin),
        this.getWorkspaceCount(isAdmin, userId),
        this.getDocumentsThisMonth(isAdmin, workspaceIds),
        this.getActiveUsersThisMonth(isAdmin, workspaceIds),
        this.getAverageProcessingTime(isAdmin, workspaceIds),
        this.getAPICallsThisMonth(isAdmin, workspaceIds),
      ])

      return {
        totalDocuments,
        totalUsers,
        totalWorkspaces,
        documentsThisMonth,
        activeUsersThisMonth,
        averageProcessingTime: avgProcessingTime || 0,
        storageUsed: 0, // Would implement storage calculation
        apiCallsThisMonth,
      }
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error)
      throw new AppError('Failed to get dashboard metrics', 500, 'METRICS_ERROR')
    }
  }

  async getUsageStatistics(params: {
    requestingUserId: string
    requestingUserRole: UserRole
    period: string
    workspaceId?: string
    userId?: string
  }) {
    try {
      const { requestingUserId, requestingUserRole, period, workspaceId, userId } = params
      
      const dateRange = this.getPeriodDateRange(period)
      const isAdmin = requestingUserRole === UserRole.ADMIN
      
      // Build where clause for activities
      const whereClause: any = {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }

      if (workspaceId) {
        whereClause.workspaceId = workspaceId
      } else if (!isAdmin) {
        const workspaceIds = await this.getAccessibleWorkspaceIds(requestingUserId)
        whereClause.workspaceId = { in: workspaceIds }
      }

      if (userId) {
        whereClause.userId = userId
      }

      const activities = await prisma.userActivity.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { id: true },
      })

      const dailyStats = await prisma.userActivity.groupBy({
        by: ['createdAt'],
        where: whereClause,
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      })

      return {
        activitiesByType: activities.map((a: any) => ({
          type: a.type,
          count: a._count.id,
        })),
        dailyActivity: this.groupActivitiesByDay(dailyStats),
        period: dateRange,
      }
    } catch (error) {
      logger.error('Error getting usage statistics:', error)
      throw new AppError('Failed to get usage statistics', 500, 'USAGE_STATS_ERROR')
    }
  }

  async getPerformanceMetrics(params: {
    requestingUserId: string
    requestingUserRole: UserRole
    period: string
    metric?: string
  }) {
    try {
      const { requestingUserId, requestingUserRole, period } = params
      
      const dateRange = this.getPeriodDateRange(period)
      const isAdmin = requestingUserRole === UserRole.ADMIN
      
      let whereClause: any = {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }

      if (!isAdmin) {
        const workspaceIds = await this.getAccessibleWorkspaceIds(requestingUserId)
        whereClause.workspaceId = { in: workspaceIds }
      }

      const avgProcessingTime = await prisma.document.aggregate({
        where: whereClause,
        _avg: { processingTime: true },
      })

      return {
        averageProcessingTime: avgProcessingTime._avg.processingTime || 0,
        period: dateRange,
      }
    } catch (error) {
      logger.error('Error getting performance metrics:', error)
      throw new AppError('Failed to get performance metrics', 500, 'PERFORMANCE_ERROR')
    }
  }

  async getDocumentAnalytics(params: any): Promise<any> { return {}; }
  async getUserActivityAnalytics(params: any): Promise<any> { return {}; }
  async getAIUsageAnalytics(params: any): Promise<any> { return {}; }
  async getSystemHealthMetrics(): Promise<any> { return {}; }
  async exportAnalyticsData(params: any): Promise<any> { return {}; }

  private async getAccessibleWorkspaceIds(userId: string): Promise<string[]> {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    })
    return memberships.map((m: any) => m.workspaceId)
  }

  private async getDocumentCount(isAdmin: boolean, workspaceIds: string[]): Promise<number> {
    const where = isAdmin ? {} : { workspaceId: { in: workspaceIds } }
    return prisma.document.count({ where })
  }

  private async getUserCount(isAdmin: boolean): Promise<number> {
    return isAdmin ? prisma.user.count() : 0
  }

  private async getWorkspaceCount(isAdmin: boolean, userId: string): Promise<number> {
    if (isAdmin) {
      return prisma.workspace.count()
    }
    return prisma.workspaceMember.count({ where: { userId } })
  }

  private async getDocumentsThisMonth(isAdmin: boolean, workspaceIds: string[]): Promise<number> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const where: any = {
      createdAt: { gte: startOfMonth },
    }

    if (!isAdmin) {
      where.workspaceId = { in: workspaceIds }
    }

    return prisma.document.count({ where })
  }

  private async getActiveUsersThisMonth(isAdmin: boolean, workspaceIds: string[]): Promise<number> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const where: any = {
      createdAt: { gte: startOfMonth },
    }

    if (!isAdmin) {
      where.workspaceId = { in: workspaceIds }
    }

    const uniqueUsers = await prisma.userActivity.findMany({
      where,
      select: { userId: true },
      distinct: ['userId'],
    })

    return uniqueUsers.length
  }

  private async getAverageProcessingTime(isAdmin: boolean, workspaceIds: string[]): Promise<number | null> {
    const where = isAdmin ? {} : { workspaceId: { in: workspaceIds } }
    const result = await prisma.document.aggregate({
      where,
      _avg: { processingTime: true },
    })
    return result._avg.processingTime
  }

  private async getAPICallsThisMonth(isAdmin: boolean, workspaceIds: string[]): Promise<number> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const where: any = {
      createdAt: { gte: startOfMonth },
      type: { in: ['DOCUMENT_ANALYZE', 'CHAT_SESSION'] },
    }

    if (!isAdmin) {
      where.workspaceId = { in: workspaceIds }
    }

    return prisma.userActivity.count({ where })
  }

  private getPeriodDateRange(period: string): { start: Date; end: Date } {
    const end = new Date()
    const start = new Date()

    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7)
        break
      case '30d':
        start.setDate(end.getDate() - 30)
        break
      case '90d':
        start.setDate(end.getDate() - 90)
        break
      case '1y':
        start.setFullYear(end.getFullYear() - 1)
        break
      default:
        start.setDate(end.getDate() - 30)
    }

    return { start, end }
  }

  private groupActivitiesByDay(activities: any[]): any[] {
    // Simple daily grouping implementation
    const grouped: Record<string, number> = {}
    
    activities.forEach(activity => {
      const date = new Date(activity.createdAt).toISOString().split('T')[0]
      grouped[date] = (grouped[date] || 0) + activity._count.id
    })

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count,
    }))
  }
}

export default AnalyticsService