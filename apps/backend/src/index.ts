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
const PORT = process.env.PORT || 8000

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
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    // In development, allow any localhost origin
    if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
      return callback(null, true)
    }
    callback(new Error('Not allowed by CORS'))
  },
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

// Stricter rate limiting for AI chat endpoints to protect API credits
const chatLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: {
    error: 'Too many chat requests. Please slow down and try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

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
app.use('/api/chat', authMiddleware, chatLimiter, chatRoutes)
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

    // Start server — with EADDRINUSE retry so tsx watch restarts don't crash
    await new Promise<void>((resolve, reject) => {
      const MAX_RETRIES = 5
      const RETRY_DELAY_MS = 1200
      let attempts = 0

      const tryListen = () => {
        const server = app.listen(PORT, () => {
          logger.info(`Server running on port ${PORT}`)
          logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
          if (process.env.REDIS_DISABLED === 'true') {
            logger.warn('RUNNING WITHOUT REDIS: Document processing and advanced caching are unavailable.')
          }
          resolve()
        })

        server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            attempts++
            if (attempts >= MAX_RETRIES) {
              logger.error(`Port ${PORT} still in use after ${MAX_RETRIES} retries. Giving up.`)
              reject(err)
              return
            }
            logger.warn(`Port ${PORT} in use (attempt ${attempts}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms…`)
            server.close()
            setTimeout(tryListen, RETRY_DELAY_MS)
          } else {
            reject(err)
          }
        })
      }

      tryListen()
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