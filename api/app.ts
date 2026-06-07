/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import session from 'express-session'
import authRoutes from './routes/auth.js'
import questionRoutes from './routes/questions.js'
import studyRoutes from './routes/study.js'
import importRoutes from './routes/import.js'
import quizRoutes from './routes/quiz.js'
import materialRoutes from './routes/materials.js'
import tutorRoutes from './routes/tutor.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors({
  credentials: true,
  origin: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7天有效期
  }
}))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/study', studyRoutes)
app.use('/api/import', importRoutes)
app.use('/api/quiz', quizRoutes)
app.use('/api/materials', materialRoutes)
app.use('/api/tutor', tutorRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
