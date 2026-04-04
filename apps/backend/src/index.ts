// ──────────────────────────────────────────────────────────────────────────────
// NOTE: dotenv is loaded by src/register.ts BEFORE this module is required.
//       Do NOT add dotenv.config() calls here — they will run too late (after
//       all imports are hoisted).
// ──────────────────────────────────────────────────────────────────────────────

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import passport from 'passport'

// Shared clients (no circular deps)
export { prisma, redis } from '@/lib/clients'
import { prisma, redis } from '@/lib/clients'

import { errorHandler } from '@/middleware/errorHandler'
import { requestLogger } from '@/middleware/requestLogger'
import { authMiddleware } from '@/middleware/authMiddleware'
import authRoutes from '@/routes/authRoutes'
import workspaceRoutes from '@/routes/workspaceRoutes'
import documentRoutes from '@/routes/documentRoutes'
import chatRoutes from '@/routes/chatRoutes'
import comparisonRoutes from '@/routes/comparisonRoutes'
import analyticsRoutes from '@/routes/analyticsRoutes'
import { logger } from '@/utils/logger'

// Initialize queues & workers (after env is loaded)
import '@/queues/documentQueue'

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}))

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Logging middleware
app.use(requestLogger)

// Passport (OAuth)
app.use(passport.initialize())

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/workspaces', authMiddleware, workspaceRoutes)
app.use('/api/documents', authMiddleware, documentRoutes)
app.use('/api/chat', authMiddleware, chatRoutes)
app.use('/api/comparisons', authMiddleware, comparisonRoutes)
app.use('/api/analytics', authMiddleware, analyticsRoutes)

// Root route handler
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'JuriSight API Server',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer')
  })
})

// Root POST handler - handle POST requests to /
app.post('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'JuriSight API Server - POST endpoint',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    note: 'This endpoint accepts POST requests but may not be the intended API endpoint'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'ROUTE_NOT_FOUND',
    },
  })
})

// Global error handler
app.use(errorHandler)

// Initialize database and start server
async function startServer() {
  try {
    // Connect to Redis (Optional in development)
    try {
      await redis.connect()
      logger.info('Connected to Redis')
    } catch (redisError) {
      logger.warn('Failed to connect to Redis. Background queues and caching will be disabled.')
      process.env.REDIS_DISABLED = 'true'
    }

    // Connect to database
    await prisma.$connect()
    logger.info('Connected to database')

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      if (process.env.REDIS_DISABLED === 'true') {
        logger.warn('RUNNING WITHOUT REDIS: Document processing and advanced caching are unavailable.')
      }
    })
  } catch (error) {
    logger.error('Failed to start server (Critical Error):', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...')
  
  try {
    if (process.env.REDIS_DISABLED !== 'true') {
      await redis.disconnect()
    }
    await prisma.$disconnect()
    logger.info('Cleanup completed')
    process.exit(0)
  } catch (error) {
    logger.error('Error during cleanup:', error)
    process.exit(1)
  }
})

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  
  try {
    if (process.env.REDIS_DISABLED !== 'true') {
      await redis.disconnect()
    }
    await prisma.$disconnect()
    logger.info('Cleanup completed')
    process.exit(0)
  } catch (error) {
    logger.error('Error during cleanup:', error)
    process.exit(1)
  }
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

startServer()

export default app