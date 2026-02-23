import dotenv from 'dotenv';

dotenv.config();

interface Config {
  // Server
  nodeEnv: string;
  port: number;
  host: string;
  
  // Database
  databaseUrl: string;
  
  // Redis
  redisUrl: string;
  redisPassword?: string;
  redisTTL: number;
  
  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequestsFree: number;
  rateLimitMaxRequestsPro: number;
  rateLimitMaxRequestsEnterprise: number;
  
  // Blockchain APIs
  etherscanApiKey: string;
  polygonscanApiKey: string;
  bscscanApiKey: string;
  arbiscanApiKey: string;
  
  // AI Configuration
  openaiApiKey?: string;
  aiModel: string;
  aiMaxTokens: number;
  aiTemperature: number;
  
  // CORS
  corsOrigin: string[];
  
  // Logging
  logLevel: string;
  logFilePath: string;
  
  // Security
  bcryptRounds: number;
  maxContractSizeBytes: number;
  allowedChains: string[];
  
  // PDF
  pdfGenerationTimeout: number;
  
  // Feature Flags
  enableCaching: boolean;
  enableStaticAnalysis: boolean;
  enablePdfReports: boolean;
  enableAuditLogging: boolean;
}

const config: Config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisPassword: process.env.REDIS_PASSWORD,
  redisTTL: parseInt(process.env.REDIS_TTL || '3600', 10),
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequestsFree: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_FREE || '10', 10),
  rateLimitMaxRequestsPro: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_PRO || '100', 10),
  rateLimitMaxRequestsEnterprise: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_ENTERPRISE || '1000', 10),
  
  // Blockchain APIs
  etherscanApiKey: process.env.ETHERSCAN_API_KEY || '',
  polygonscanApiKey: process.env.POLYGONSCAN_API_KEY || '',
  bscscanApiKey: process.env.BSCSCAN_API_KEY || '',
  arbiscanApiKey: process.env.ARBISCAN_API_KEY || '',
  
  // AI Configuration
  openaiApiKey: process.env.OPENAI_API_KEY,
  aiModel: process.env.AI_MODEL || 'gpt-4',
  aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || '2048', 10),
  aiTemperature: parseFloat(process.env.AI_TEMPERATURE || '0.1'),
  
  // CORS
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5174').split(','),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFilePath: process.env.LOG_FILE_PATH || './logs',
  
  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  maxContractSizeBytes: parseInt(process.env.MAX_CONTRACT_SIZE_BYTES || '1048576', 10),
  allowedChains: (process.env.ALLOWED_CHAINS || 'ethereum,polygon,bsc,arbitrum,optimism').split(','),
  
  // PDF
  pdfGenerationTimeout: parseInt(process.env.PDF_GENERATION_TIMEOUT || '30000', 10),
  
  // Feature Flags
  enableCaching: process.env.ENABLE_CACHING === 'true',
  enableStaticAnalysis: process.env.ENABLE_STATIC_ANALYSIS === 'true',
  enablePdfReports: process.env.ENABLE_PDF_REPORTS === 'true',
  enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
};

// Validate required config
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  const key = envVar.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  if (!config[key as keyof Config]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
