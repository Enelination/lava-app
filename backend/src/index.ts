import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import submissionsRoutes from './routes/submissions.js'
import aiRoutes from './routes/ai.js'
import knowledgeBaseRoutes from './routes/knowledgeBase.js'
import settingsRoutes from './routes/settings.js'
import { getDb } from './lib/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '3001')

app.use(cors())
app.use(express.json({ limit: '10mb' }))

getDb()

app.use('/api/auth', authRoutes)
app.use('/api/submissions', submissionsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/knowledge-base', knowledgeBaseRoutes)
app.use('/api/settings', settingsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

const frontendDist = path.join(__dirname, '../../frontend/dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
  console.log('Serving frontend build from', frontendDist)
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`LAVA running on http://localhost:${PORT}`)
})
