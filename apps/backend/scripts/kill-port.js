#!/usr/bin/env node
/**
 * kill-port.js — Cross-platform pre-dev helper.
 * Finds and kills ALL processes listening on PORT (default 3001),
 * then waits for the OS to fully release the socket.
 */
const { execSync, spawnSync } = require('child_process')

const PORT = process.env.PORT || 3001

/** Sleep synchronously for `ms` milliseconds */
function sleepSync(ms) {
  spawnSync('node', ['-e', `setTimeout(()=>{},${ms})`], { stdio: 'ignore' })
}

let killed = false

try {
  if (process.platform === 'win32') {
    // Windows: netstat → find all PIDs in LISTENING state on this port
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
          killed = true
        } catch (_) { /* already gone */ }
      }
    })
  } else {
    // Unix/macOS: lsof → kill all
    const result = execSync(`lsof -ti tcp:${PORT}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
    const pids = result.trim().split('\n').filter(Boolean)
    pids.forEach(pid => {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
        console.log(`[kill-port] Freed port ${PORT} (killed PID ${pid})`)
        killed = true
      } catch (_) { /* already gone */ }
    })
  }
} catch (_) {
  // Nothing was using the port — that's fine
}

// Give the OS time to fully release the socket before the new server binds
if (killed) {
  sleepSync(600)
}
