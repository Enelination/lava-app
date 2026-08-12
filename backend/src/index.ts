import app from './app.js'
import { logger } from './lib/logger.js'
import { initSupabase } from './lib/supabase.js'
import { pruneAuditLogs } from './routes/audit.js'

const PORT = parseInt(process.env.PORT || '3001')

logger.info('LAVA server starting…')
logger.info(`Node version: ${process.version}`)
logger.info(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`)

app.listen(PORT, () => {
  logger.info(`LAVA running on http://localhost:${PORT}`)
})

pruneAuditLogs()
  .then(() => logger.info('Audit log pruning complete (5-day retention).'))
  .catch((err) => logger.warn(`Audit log pruning failed: ${err.message}`))
setInterval(() => {
  pruneAuditLogs().catch((err) => logger.warn(`Audit log pruning failed: ${err.message}`))
}, 6 * 60 * 60 * 1000)

initSupabase()
  .then((ok) => logger.info(ok ? 'Supabase init complete.' : 'Supabase init incomplete.'))
  .catch((err) => logger.warn(`Supabase init failed: ${err.message}`))
