import { Request, Response, NextFunction, RequestHandler } from 'express'
import { JWTUtil } from '@/utils/jwt'
import { prisma } from '@/lib/clients'
import { AppError } from '@/middleware/errorHandler'
import { UserRole } from '@/shared'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: UserRole
  }
}

// Type-safe wrapper for authenticated routes
export const withAuth = (handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await handler(req as AuthenticatedRequest, res, next)
  }
}

export const authMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'NO_TOKEN')
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    if (!token) {
      throw new AppError('No token provided', 401, 'NO_TOKEN')
    }

    // Verify the token
    const decoded = JWTUtil.verifyAccessToken(token)
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND')
    }

    // Attach user to request with type assertion
    ;(req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole
    }
    next()
  } catch (error) {
    if (error instanceof AppError) {
      next(error)
    } else {
      next(new AppError('Invalid token', 401, 'INVALID_TOKEN'))
    }
  }
}

export const requireRole = (roles: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest
    if (!authReq.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'))
    }

    if (!roles.includes(authReq.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'))
    }

    next()
  }
}

export const requireWorkspaceAccess: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthenticatedRequest
    if (!authReq.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED')
    }

    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId

    if (!workspaceId) {
      throw new AppError('Workspace ID required', 400, 'WORKSPACE_ID_REQUIRED')
    }

    // Check if user has access to workspace
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceId as string,
          userId: authReq.user.id,
        },
      },
    })

    if (!workspaceMember && authReq.user.role !== UserRole.ADMIN) {
      throw new AppError('Access denied to workspace', 403, 'WORKSPACE_ACCESS_DENIED')
    }

    next()
  } catch (error) {
    next(error)
  }
}