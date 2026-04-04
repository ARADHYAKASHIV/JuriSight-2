import { Router } from 'express'
import { prisma } from '@/lib/clients'
import { logger } from '@/utils/logger'

const router = Router()

// Simple health check
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
    }

    res.status(200).json(healthData)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Health check failed', { error: errorMessage })
    
    res.status(503).json({
      status: 'unhealthy',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    })
  }
})

// Detailed health check for monitoring systems
router.get('/health/detailed', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    disk: false,
    memory: false,
  }

  const details = {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    checks,
    metrics: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
  }

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Database health check failed', { error: errorMessage })
  }

  try {
    // Memory check (fail if using more than 500MB)
    const memUsage = process.memoryUsage().heapUsed / 1024 / 1024
    checks.memory = memUsage < 500
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Memory health check failed', { error: errorMessage })
  }

  // Overall health status
  const isHealthy = Object.values(checks).every(check => check)
  const status = isHealthy ? 200 : 503

  res.status(status).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    ...details,
  })
})

// Readiness probe (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    // Check if application is ready to receive traffic
    await prisma.$queryRaw`SELECT 1`
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Readiness check failed', { error: errorMessage })
    
    res.status(503).json({
      status: 'not ready',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    })
  }
})

// Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  })
})

export default router