require('dotenv').config(); // ✅ MUST be at top

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const config            = require('./config');
const { connectDB }     = require('./config/database');
const routes            = require('./routes');
const { errorHandler }  = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const logger            = require('./config/logger');

const app = express();


// ── Security ─────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ────────────────────────────────────────────────
const allowedOrigins = [
  config.corsOrigin,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // allow all (demo mode)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));


// ── Rate Limiting ───────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please try again in 15 minutes.' },
});
app.use('/api', limiter);


// ── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// ── Static Files ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));


// ── Logging ─────────────────────────────────────────────
app.use(morgan('dev'));
app.use(requestLogger);


// ── Routes ──────────────────────────────────────────────
app.use('/api', routes);


// ── Health Check ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'JanSahay API',
    version: '2.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});


// ── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});


// ── Error Handler ───────────────────────────────────────
app.use(errorHandler);


// ── START SERVER ────────────────────────────────────────
async function start() {
  try {
    // ✅ DEBUG (VERY IMPORTANT)
    console.log("Mongo URI from config:", config.mongoUri);

    // ❌ If undefined → .env issue
    if (!config.mongoUri) {
      throw new Error("MONGO URI is missing. Check your .env file");
    }

    // ✅ Connect DB
    await connectDB(config.mongoUri);

    // ✅ Start Server
    app.listen(config.port, () => {
      logger.info('JanSahay API started', {
        port: config.port,
        env: config.nodeEnv,
        corsOrigin: config.corsOrigin,
      });

      console.log(`\n🚀 Server running at: http://localhost:${config.port}`);
      console.log(`📊 Health check: http://localhost:${config.port}/health\n`);
    });

  } catch (err) {
    logger.error('Failed to start server', { message: err.message });
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app;