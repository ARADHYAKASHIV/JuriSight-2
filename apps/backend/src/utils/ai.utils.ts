import { encoding_for_model, TiktokenModel } from 'tiktoken'
import { logger } from './logger'

/**
 * Execute a promise-returning function with exponential backoff retries.
 * @param fn The function to execute
 * @param retries Maximum number of retries
 * @param baseDelay Base delay in milliseconds
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> {
  let attempt = 0
  while (attempt < retries) {
    try {
      return await fn()
    } catch (error: any) {
      attempt++
      // Only retry on specific status codes if it's an API error (e.g. 429 Too Many Requests, 500, 502, 503, 504)
      const isRetryable = error.status === 429 || (error.status >= 500 && error.status <= 504) || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT'
      
      if (!isRetryable || attempt >= retries) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 200 // Add jitter
      logger.warn(`API call failed (Attempt ${attempt}/${retries}): ${error.message}. Retrying in ${delay.toFixed(0)}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Unreachable')
}

/**
 * Truncate text to a maximum number of tokens safely.
 * @param text The input text
 * @param maxTokens Maximum allowed tokens
 * @param model The fallback tiktoken encoding model to use (default: gpt-3.5-turbo)
 */
export function truncateToTokens(text: string, maxTokens: number, model: TiktokenModel = 'gpt-3.5-turbo'): string {
  try {
    const enc = encoding_for_model(model)
    const tokens = enc.encode(text)
    
    if (tokens.length <= maxTokens) {
      enc.free()
      return text
    }
    
    // Slice up to maxTokens
    const truncatedTokens = tokens.slice(0, maxTokens)
    const truncatedText = new TextDecoder().decode(enc.decode(truncatedTokens))
    enc.free()
    
    return truncatedText
  } catch (err) {
    // Fallback if tiktoken fails
    logger.warn('Token truncation failed, falling back to basic string split')
    return text.substring(0, maxTokens * 4)
  }
}
