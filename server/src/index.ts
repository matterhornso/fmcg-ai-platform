import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase, db } from './db/database';
import qualityRoutes from './routes/quality';
import complaintsRoutes from './routes/complaints';
import financeRoutes from './routes/finance';
import dashboardRoutes from './routes/dashboard';
import { errorHandler } from './middleware/errorHandler';
import { getCacheStats } from './utils/cache';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Validate required env
const requiredEnv = ['PORT'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} not set in .env, using default`);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const startTime = Date.now();

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', apiLimiter);

// Middleware — allow any localhost port for dev (Vite may pick 5173–5176+)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Color-coded status
    let statusColor: string;
    if (status >= 500) {
      statusColor = `\x1b[31m${status}\x1b[0m`; // red
    } else if (status >= 400) {
      statusColor = `\x1b[33m${status}\x1b[0m`; // yellow
    } else {
      statusColor = `\x1b[32m${status}\x1b[0m`; // green
    }

    // Request body size for POST/PUT/PATCH
    let bodySizeInfo = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentLength = req.headers['content-length'];
      if (contentLength) {
        bodySizeInfo = ` body=${contentLength}B`;
      }
    }

    // Cache hit indicator
    const cacheHit = res.getHeader('X-Cache') === 'HIT' ? ' [CACHE HIT]' : '';

    console.log(`${req.method} ${req.path} ${statusColor} ${duration}ms${bodySizeInfo}${cacheHit}`);
  });
  next();
});

// Initialize database
initDatabase();

// API Routes
app.use('/api/quality', qualityRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Enhanced health check
app.get('/api/health', (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const aiEnabled = !!(apiKey && apiKey !== 'your_key_here' && apiKey.startsWith('sk-ant-'));

  // Database status check
  let dbStatus = 'ok';
  try {
    db.prepare('SELECT 1').get();
  } catch {
    dbStatus = 'error';
  }

  // Uptime
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);

  // Memory usage
  const memUsage = process.memoryUsage();

  // Cache stats
  const cacheStats = getCacheStats();

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    aiEnabled,
    message: aiEnabled ? 'All AI features active' : 'AI features require ANTHROPIC_API_KEY in .env',
    database: dbStatus,
    uptime: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
    cache: cacheStats,
  });
});

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

// Error handler — must be last middleware
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`\n🚀 FMCG AI Platform Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/stats`);
  console.log(`✅ Quality API:   http://localhost:${PORT}/api/quality`);
  console.log(`📋 Complaints API: http://localhost:${PORT}/api/complaints`);
  console.log(`💰 Finance API:   http://localhost:${PORT}/api/finance\n`);
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    try {
      db.close();
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error closing database:', err);
    }
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
