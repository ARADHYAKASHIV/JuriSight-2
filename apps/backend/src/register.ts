/**
 * Bootstrap entry point.
 * CRITICAL: dotenv MUST be loaded before index.ts is imported, because
 * TypeScript top-level `import` statements are hoisted as CJS require() calls,
 * meaning config() in index.ts runs AFTER all modules are already loaded.
 *
 * Using require() here is intentional — it is NOT hoisted and runs sequentially.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { config } = require('dotenv')

// Load .env from monorepo root BEFORE anything else touches process.env
config({ path: path.resolve(__dirname, '../../../.env') })

// Now safe to load the app — all modules will see process.env values
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./index')
