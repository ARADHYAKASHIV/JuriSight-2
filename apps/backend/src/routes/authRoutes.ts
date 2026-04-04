import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { body, validationResult } from 'express-validator'
import passport from 'passport'
import { prisma } from '@/lib/clients'
import { JWTUtil } from '@/utils/jwt'
import { AppError } from '@/middleware/errorHandler'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/authMiddleware'
import { LoginSchema, RegisterSchema, UserRole, UserActivityType } from '@/shared'
import '@/config/passport' // register strategies

const router = Router()

// Validation middleware
const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
]

const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match')
    }
    return true
  }),
]

// Login endpoint
router.post('/login', validateLogin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const { email, password } = LoginSchema.parse(req.body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    // Check password (Google OAuth users have no password)
    if (!user.password) {
      throw new AppError('This account uses Google Sign-In. Please sign in with Google.', 401, 'USE_GOOGLE_LOGIN')
    }
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    // Generate tokens
    const { accessToken, refreshToken } = JWTUtil.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role as string
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.status(200).json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Register endpoint
router.post('/register', validateRegister, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const { email, password } = RegisterSchema.parse(req.body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new AppError('User already exists', 409, 'USER_EXISTS')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: UserRole.ANALYST,
      },
    })

    // Generate tokens
    const { accessToken, refreshToken } = JWTUtil.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role as string
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400, 'REFRESH_TOKEN_REQUIRED')
    }

    // Verify refresh token
    const decoded = JWTUtil.verifyRefreshToken(refreshToken)

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Generate new access token
    const newAccessToken = JWTUtil.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role as string
    })

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get current user profile
router.get('/profile', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        role: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error) {
    next(error)
  }
})

// Update user profile
router.put('/profile', authMiddleware, [
  body('email').optional().isEmail().normalizeEmail(),
  body('preferences').optional().isObject(),
], async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const { email, preferences } = req.body
    const updateData: any = {}

    if (email) {
      // Check if email is already taken
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: authReq.user!.id },
        },
      })

      if (existingUser) {
        throw new AppError('Email already taken', 409, 'EMAIL_TAKEN')
      }

      updateData.email = email
    }

    if (preferences) {
      updateData.preferences = preferences
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error) {
    next(error)
  }
})

// Logout endpoint (optional - client should remove tokens)
router.post('/logout', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest
  try {
    // Log user activity
    await prisma.userActivity.create({
      data: {
        userId: authReq.user!.id,
        type: UserActivityType.LOGOUT,
        metadata: {
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      },
    })

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    })
  } catch (error) {
    next(error)
  }
})

// ─── Google OAuth ───────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.CORS_ORIGIN || 'http://localhost:5173'

// Step 1: redirect user to Google's consent screen
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

// Step 2: Google redirects back here with a code
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login?error=google_failed`, session: false }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any
      const { accessToken, refreshToken } = JWTUtil.generateTokenPair({
        id: user.id,
        email: user.email,
        role: user.role as string,
      })
      // Redirect to frontend with tokens — frontend stores them and navigates to dashboard
      const params = new URLSearchParams({ accessToken, refreshToken })
      res.redirect(`${FRONTEND_URL}/auth/google/callback?${params.toString()}`)
    } catch (err) {
      res.redirect(`${FRONTEND_URL}/login?error=token_generation_failed`)
    }
  }
)

export default router