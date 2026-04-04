import { z } from 'zod';

// ===== ENUMS =====
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER'
}

export enum WorkspaceMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export enum DocumentCategory {
  CONTRACT = 'CONTRACT',
  LEGAL_BRIEF = 'LEGAL_BRIEF',
  COMPLIANCE = 'COMPLIANCE',
  PATENT = 'PATENT',
  LITIGATION = 'LITIGATION',
  OTHER = 'OTHER'
}

export enum ChatMessageType {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM'
}

export enum UserActivityType {
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  DOCUMENT_VIEW = 'DOCUMENT_VIEW',
  DOCUMENT_ANALYZE = 'DOCUMENT_ANALYZE',
  CHAT_SESSION = 'CHAT_SESSION',
  DOCUMENT_COMPARE = 'DOCUMENT_COMPARE',
  WORKSPACE_JOIN = 'WORKSPACE_JOIN',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

export enum AnnotationType {
  HIGHLIGHT = 'HIGHLIGHT',
  NOTE = 'NOTE',
  QUESTION = 'QUESTION',
  IMPORTANT = 'IMPORTANT'
}

// ===== ZOD SCHEMAS =====

// User Schemas
export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  preferences: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Public User Schema (without password)
export const PublicUserSchema = UserSchema.omit({ password: true });

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole).default(UserRole.ANALYST)
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  preferences: z.record(z.any()).optional()
});

// Auth Schemas
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Workspace Schemas
export const WorkspaceSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  ownerId: z.string().cuid(),
  settings: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  settings: z.record(z.any()).optional()
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.record(z.any()).optional()
});

// Document Schemas
export const DocumentSchema = z.object({
  id: z.string().cuid(),
  workspaceId: z.string().cuid(),
  uploadedById: z.string().cuid(),
  title: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  mimeType: z.string(),
  category: z.nativeEnum(DocumentCategory).optional(),
  tags: z.array(z.string()).optional(),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  processingTime: z.number().int().positive().optional(),
  hash: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CreateDocumentSchema = z.object({
  workspaceId: z.string().cuid(),
  title: z.string().min(1).max(255).optional(),
  category: z.nativeEnum(DocumentCategory).optional(),
  tags: z.array(z.string()).optional()
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  category: z.nativeEnum(DocumentCategory).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

// Chat Schemas
export const ChatSessionSchema = z.object({
  id: z.string().cuid(),
  documentId: z.string().cuid(),
  userId: z.string().cuid(),
  title: z.string().min(1).max(255),
  context: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CreateChatSessionSchema = z.object({
  documentId: z.string().cuid(),
  title: z.string().min(1).max(255).optional()
});

export const ChatMessageSchema = z.object({
  id: z.string().cuid(),
  sessionId: z.string().cuid(),
  type: z.nativeEnum(ChatMessageType),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  citations: z.array(z.object({
    pageNumber: z.number().int().positive().optional(),
    text: z.string(),
    confidence: z.number().min(0).max(1).optional()
  })).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  createdAt: z.date()
});

export const CreateChatMessageSchema = z.object({
  sessionId: z.string().cuid(),
  content: z.string().min(1)
});

// Comparison Schema
export const DocumentComparisonSchema = z.object({
  id: z.string().cuid(),
  doc1Id: z.string().cuid(),
  doc2Id: z.string().cuid(),
  results: z.object({
    similarityScore: z.number().min(0).max(1),
    differences: z.array(z.object({
      type: z.enum(['added', 'removed', 'modified']),
      text: z.string(),
      position: z.object({
        start: z.number().int().nonnegative(),
        end: z.number().int().nonnegative()
      }),
      similarity: z.number().min(0).max(1).optional()
    })),
    commonClauses: z.array(z.object({
      text: z.string(),
      similarity: z.number().min(0).max(1),
      doc1Position: z.object({
        start: z.number().int().nonnegative(),
        end: z.number().int().nonnegative()
      }),
      doc2Position: z.object({
        start: z.number().int().nonnegative(),
        end: z.number().int().nonnegative()
      })
    }))
  }),
  similarityScore: z.number().min(0).max(1),
  performedById: z.string().cuid(),
  createdAt: z.date()
});

export const CreateComparisonSchema = z.object({
  doc1Id: z.string().cuid(),
  doc2Id: z.string().cuid()
});

// Analytics Schemas
export const AnalyticsMetricsSchema = z.object({
  totalDocuments: z.number().int().nonnegative(),
  totalUsers: z.number().int().nonnegative(),
  totalWorkspaces: z.number().int().nonnegative(),
  documentsThisMonth: z.number().int().nonnegative(),
  activeUsersThisMonth: z.number().int().nonnegative(),
  averageProcessingTime: z.number().nonnegative(),
  storageUsed: z.number().nonnegative(),
  apiCallsThisMonth: z.number().int().nonnegative()
});

// ===== TYPE EXPORTS =====
export type User = z.infer<typeof UserSchema>;
export type PublicUser = z.infer<typeof PublicUserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspace = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof UpdateWorkspaceSchema>;

export type Document = z.infer<typeof DocumentSchema>;
export type CreateDocument = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocument = z.infer<typeof UpdateDocumentSchema>;

export type ChatSession = z.infer<typeof ChatSessionSchema>;
export type CreateChatSession = z.infer<typeof CreateChatSessionSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type CreateChatMessage = z.infer<typeof CreateChatMessageSchema>;

export type DocumentComparison = z.infer<typeof DocumentComparisonSchema>;
export type CreateComparison = z.infer<typeof CreateComparisonSchema>;

export type AnalyticsMetrics = z.infer<typeof AnalyticsMetricsSchema>;

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface DocumentAnalysisResult {
  summary: string;
  keyPoints: string[];
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  confidence: number;
  processingTime: number;
}

export interface DocumentUploadResult {
  document: Document;
  analysis?: DocumentAnalysisResult;
}

// ===== UTILITY TYPES =====
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  search?: string;
  category?: DocumentCategory;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}