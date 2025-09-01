// Server Configuration
const config = {
  // Server settings
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database settings
  dbPath: process.env.DB_PATH || './yahtzee_remote.db',
  
  // CORS settings
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  
  // Logging settings
  logLevel: process.env.LOG_LEVEL || 'info',
  enableDebugLogs: process.env.ENABLE_DEBUG_LOGS === 'true',
  
  // Game settings
  maxPlayers: parseInt(process.env.MAX_PLAYERS) || 6,
  gameCleanupInterval: parseInt(process.env.GAME_CLEANUP_INTERVAL) || 86400000, // 24 hours
  gameRetentionDays: parseInt(process.env.GAME_RETENTION_DAYS) || 7,
  
  // Production settings
  isProduction: process.env.NODE_ENV === 'production',
  
  // API settings
  apiBaseUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
};

// Helper functions
config.shouldLog = (level) => {
  const levels = { error: 0, warn: 1, info: 2, debug: 3 };
  return levels[level] <= levels[config.logLevel];
};

config.log = (level, message, ...args) => {
  if (config.shouldLog(level)) {
    if (level === 'debug' && !config.enableDebugLogs) return;
    console[level](`[${new Date().toISOString()}] ${message}`, ...args);
  }
};

export default config;
