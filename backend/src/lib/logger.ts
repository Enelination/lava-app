import pino from 'pino'
import pinoHttp from 'pino-http'

const env = process.env.NODE_ENV || 'development'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'lava-backend', env },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export const httpLogger = pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } })
