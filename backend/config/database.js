const mongoose = require('mongoose');
const logger = require('./logger');

let memoryServer = null;

/**
 * Connect to MongoDB with automatic dev fallback.
 * If the configured URI (e.g. remote Atlas or local instance) fails or times out,
 * it will automatically start an embedded in-memory MongoDB instance so development
 * and demos work seamlessly without external dependencies.
 */
async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () =>
    logger.info('MongoDB connected', {
      uri: mongoose.connection.client.s.url?.replace(/\/\/.*@/, '//***@') || 'connected',
    }),
  );
  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB disconnected — reconnecting…'),
  );
  mongoose.connection.on('error', (err) =>
    logger.error('MongoDB connection error', { message: err.message }),
  );

  try {
    logger.info('Connecting to configured MongoDB URI...', {
      uri: uri ? uri.replace(/\/\/.*@/, '//***@') : 'none',
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Successfully connected to primary MongoDB.');
    return;
  } catch (err) {
    logger.warn(
      `Primary MongoDB connection failed (${err.message}). Starting embedded in-memory database fallback for seamless operation...`,
    );
  }

  // Fallback to MongoMemoryServer
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();

    logger.info('Embedded MongoDB memory server started at ' + memUri);
    await mongoose.connect(memUri);
    logger.info('Connected to embedded MongoDB fallback instance.');

    // Auto-seed if running on fallback so data is immediately available
    try {
      const { seedDatabase } = require('../scripts/seed');
      if (typeof seedDatabase === 'function') {
        logger.info('Seeding demo data into embedded database...');
        await seedDatabase();
        logger.info('Demo data populated into embedded database.');
      }
    } catch (seedErr) {
      logger.warn('Auto-seed check failed or already seeded:', { message: seedErr.message });
    }
  } catch (fallbackErr) {
    logger.error('Failed to start fallback in-memory MongoDB:', { message: fallbackErr.message });
    throw fallbackErr;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}

module.exports = { connectDB, disconnectDB };
