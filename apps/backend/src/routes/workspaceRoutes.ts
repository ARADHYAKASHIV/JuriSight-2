import { Router, Request, Response, NextFunction } from 'express'
import { body, query, validationResult } from 'express-validator'
import { prisma } from '@/lib/clients'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/authMiddleware'
import { AppError } from '@/middleware/errorHandler'
import { CreateWorkspaceSchema, UpdateWorkspaceSchema, UserRole, WorkspaceMemberRole } from '@shared'

const router = Router()

// Get user's workspaces
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const { page = 1, limit = 20 } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const whereClause = authReq.user!.role === UserRole.ADMIN 
      ? {} 
      : {
          members: {
            some: {
              userId: authReq.user!.id,
            },
          },
        }

    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where: whereClause,
        skip,
        take: parseInt(limit as string),
        include: {
          owner: {
            select: {
              id: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              documents: true,
              members: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.workspace.count({ where: whereClause }),
    ])

    res.status(200).json({
      success: true,
      data: workspaces,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error) {
    next(error)
  }
})

// Create workspace
router.post('/', [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('settings').optional().isObject(),
], authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const workspaceData = CreateWorkspaceSchema.parse(req.body)

    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceData.name,
        ownerId: authReq.user!.id,
        settings: workspaceData.settings,
        members: {
          create: {
            userId: authReq.user!.id,
            role: WorkspaceMemberRole.OWNER,
            permissions: {
              canUpload: true,
              canAnalyze: true,
              canCompare: true,
              canChat: true,
              canManageMembers: true,
              canManageSettings: true,
            },
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            documents: true,
            members: true,
          },
        },
      },
    })

    res.status(201).json({
      success: true,
      data: workspace,
    })
  } catch (error) {
    next(error)
  }
})

// Get workspace by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const workspaceId = req.params.id
    
    const whereClause: any = { id: workspaceId }
    
    if (authReq.user!.role !== UserRole.ADMIN) {
      whereClause.members = {
        some: {
          userId: authReq.user!.id,
        },
      }
    }

    const workspace = await prisma.workspace.findFirst({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: {
            documents: true,
            members: true,
          },
        },
      },
    })

    if (!workspace) {
      throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND')
    }

    res.status(200).json({
      success: true,
      data: workspace,
    })
  } catch (error) {
    next(error)
  }
})

// Update workspace
router.put('/:id', [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('settings').optional().isObject(),
], authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array())
    }

    const workspaceId = req.params.id
    const updateData = UpdateWorkspaceSchema.parse(req.body)

    // Check if user can update this workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: authReq.user!.id },
          { 
            members: {
              some: {
                userId: authReq.user!.id,
                role: { in: [WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN] },
              },
            },
          },
        ],
      },
    })

    if (!workspace && authReq.user!.role !== UserRole.ADMIN) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            documents: true,
            members: true,
          },
        },
      },
    })

    res.status(200).json({
      success: true,
      data: updatedWorkspace,
    })
  } catch (error) {
    next(error)
  }
})

// Delete workspace
router.delete('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const workspaceId = req.params.id

    // Check if user can delete this workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        ownerId: authReq.user!.id,
      },
    })

    if (!workspace && authReq.user!.role !== UserRole.ADMIN) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    })

    res.status(200).json({
      success: true,
      data: {
        message: 'Workspace deleted successfully',
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router