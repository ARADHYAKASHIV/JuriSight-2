import { PrismaClient } from '@prisma/client'
import { createClient } from 'redis'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Create a robust mock redis client for local development without Redis
const createMockRedis = () => {
  const mock = {
    on: (event: string, cb: Function) => {
      // Keep track of listeners if needed
      return mock
    },
    connect: async () => {
      console.log('--- SYSTEM: MOCK REDIS CONNECTED ---')
    },
    disconnect: async () => {},
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    isOpen: true,
    isReady: true,
    ping: async () => 'PONG',
    quit: async () => 'OK',
    sendCommand: async () => null,
  }
  return mock as any
}

// Global flag to easily toggle Redis for dev
const USE_MOCK_REDIS = process.env.NODE_ENV === 'development' && (!process.env.REDIS_URL || process.env.REDIS_URL.includes('localhost'))

export const redis = USE_MOCK_REDIS ? createMockRedis() : createClient({
  url: process.env.REDIS_URL,
})

// Optional: Add error listener to real client if used
if (!USE_MOCK_REDIS) {
  redis.on('error', (err: Error) => {
    console.error('Redis Connection Error:', err.message)
  })
}
