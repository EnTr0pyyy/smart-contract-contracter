/**
 * Server Entry Point
 * Initialize and start the Express server
 */

import { createApp } from './app';
import config from './config';
import cacheService from './services/caching/redis.service';

async function startServer() {
  try {
    console.log('🚀 Starting AI Smart Contract Risk Analyzer API...');
    console.log(`📦 Environment: ${config.nodeEnv}`);

    // Connect to Redis
    if (config.enableCaching) {
      console.log('🔄 Connecting to Redis...');
      await cacheService.connect();
      console.log('✅ Redis connected');
    } else {
      console.log('⚠️  Caching disabled');
    }

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      console.log(`✅ Server running on http://${config.host}:${config.port}`);
      console.log(`📡 API available at http://${config.host}:${config.port}/api/v1`);
      console.log(`💚 Health check: http://${config.host}:${config.port}/api/v1/health`);
      console.log('\n🎯 Production-grade AI Smart Contract Risk Analyzer is online!\n');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('🔌 HTTP server closed');

        // Disconnect Redis
        if (cacheService.isConnected()) {
          await cacheService.disconnect();
          console.log('🔌 Redis disconnected');
        }

        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
