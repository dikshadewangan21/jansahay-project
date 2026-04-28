
const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Connect to MongoDB with retry logic.
 * Mongoose 8 handles buffering internally, so operations issued before
 * the connection is ready will queue automatically.
 */
async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () =>
    logger.info('MongoDB connected', { uri: uri.replace(/\/\/.*@/, '//***@') }),
  );
  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB disconnected — reconnecting…'),
  );
  mongoose.connection.on('error', (err) =>
    logger.error('MongoDB connection error', { message: err.message }),
  );

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });
}

module.exports = { connectDB };
