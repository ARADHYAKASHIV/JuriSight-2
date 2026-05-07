#!/usr/bin/env node
/**
 * kill-port.js — Cross-platform pre-dev helper.
 * Finds and kills whatever process is listening on PORT (default 3001)
 * so that `tsx watch` never crashes with EADDRINUSE on hot-reload.
 */
const { execSync } = require('child_process')

const PORT = process.env.PORT || 3001

try {
  if (process.platform === 'win32') {
    // Windows: find PID via netstat, kill it
    const result = execSync(
      `netstat -ano | findstr :${PORT}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    )
    const lines = result.split('\n').filter(l => l.includes('LISTENING'))
    const pids = [...new Set(lines.map(l => l.trim().split(/\s+/).pop()).filter(Boolean))]
    pids.forEach(pid => {
      if (pid && pid !== '0') {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
          console.log(`[kill-port] Freed port ${PORT} (killed PID ${pid})`)
        } catch (_) { /* already gone */ }
      }
    })
  } else {
    // Unix/macOS: lsof → kill
    const result = execSync(`lsof -ti tcp:${PORT}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
    const pids = result.trim().split('\n').filter(Boolean)
    pids.forEach(pid => {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
        console.log(`[kill-port] Freed port ${PORT} (killed PID ${pid})`)
      } catch (_) { /* already gone */ }
    })
  }
} catch (_) {
  // Nothing was using the port — that's fine
}
