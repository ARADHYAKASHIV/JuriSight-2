import { z } from 'zod'
import { config } from 'dotenv'

// Load environment variables
config({ path: '../../.env' })

// Define the environment schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  BACKEND_URL: z.string().url().default('http://localhost:3001'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GEMINI_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  MAX_FILE_SIZE: z.string().default('52428800'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,doc,docx,txt'),
  // Google OAuth — optional; if absent, Google Sign-In is disabled
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
})

// Parse and validate process.env
try {
  envSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:', error.flatten().fieldErrors)
    process.exit(1)
  }
}

export const env = envSchema.parse(process.env)
