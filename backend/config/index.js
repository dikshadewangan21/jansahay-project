module.exports = {
  port:       parseInt(process.env.PORT, 10) || 5000,
  nodeEnv:    process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  apiVersion: process.env.API_VERSION || 'v1',
  isProd:     process.env.NODE_ENV === 'production',
  mongoUri:   process.env.MONGODB_URI ,

  // JWT
  jwtSecret:    process.env.JWT_SECRET || 'changeme-use-a-long-random-string-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
