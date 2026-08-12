import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './routes/auth.js'
import submissionsRoutes from './routes/submissions.js'
import aiRoutes from './routes/ai.js'
import knowledgeBaseRoutes from './routes/knowledgeBase.js'
import settingsRoutes from './routes/settings.js'
import notificationsRoutes from './routes/notifications.js'
import auditRoutes from './routes/audit.js'
import usersRoutes from './routes/users.js'
import openapi from './openapi.js'
import { logger, httpLogger } from './lib/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  })
  logger.info('Sentry enabled.')
}

const app = express()

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:'],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
}

app.use((req, res, next) => {
  const isDocs = req.path.startsWith('/api-docs')
  helmet({
    contentSecurityPolicy: {
      directives: isDocs
        ? { ...cspDirectives, scriptSrc: ["'self'", "'unsafe-inline'"] }
        : cspDirectives,
    },
  })(req, res, next)
})

app.use(httpLogger)

const allowedOrigins = (process.env.APP_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      const host = `${req.protocol}://${req.headers.host}`
      const matches = (o: string | RegExp) => (o instanceof RegExp ? o.test(origin) : o === origin)
      const pool: (string | RegExp)[] = allowedOrigins.length
        ? allowedOrigins
        : [/^https?:\/\/localhost:\d+$/, /\.onrender\.com$/, /\.vercel\.app$/]
      callback(null, origin === host || pool.some(matches))
    },
  })(req, res, next)
})

app.use(express.json({ limit: '10mb' }))

const tooMany = (_req: express.Request, res: express.Response) => {
  res.status(429).json({ error: 'Too many requests. Please try again later.' })
}

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, handler: tooMany })
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, handler: tooMany })
const chatLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 90, standardHeaders: 'draft-8', legacyHeaders: false, handler: tooMany })

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/change-password', authLimiter)
app.use('/api/auth/register', registerLimiter)
app.use('/api/ai/chat', chatLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/submissions', submissionsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/knowledge-base', knowledgeBaseRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/admin/users', usersRoutes)

app.get('/api-docs.json', (_req, res) => {
  res.json(openapi)
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'LAVA API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
}))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

const frontendDist = path.join(__dirname, '../../frontend/dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
  logger.info(`Serving frontend build from ${frontendDist}`)
}

Sentry.setupExpressErrorHandler(app)

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

export default app
