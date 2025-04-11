/**
 * @fileoverview AugmentOS Cloud Server entry point.
 * Initializes core services and sets up HTTP/WebSocket servers.
 */
// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

// import "./instrument";
// import "./sentry";

import express from 'express';
import { Server } from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

// Import services
import { webSocketService } from './services/core/websocket.service';
import { healthMonitorService } from './services/core/health-monitor.service';

// Import routes
import appRoutes from './routes/apps.routes';
import authRoutes from './routes/auth.routes';
import transcriptRoutes from './routes/transcripts.routes';
import tpaSettingsRoutes from './routes/tpa-settings.routes';
import errorReportRoutes from './routes/error-report.routes';
import devRoutes from './routes/developer.routes';
import serverRoutes from './routes/server.routes';
import adminRoutes from './routes/admin.routes';
import tpaServerRoutes from './routes/tpa-server.routes';

import path from 'path';

// Load configuration from environment
import * as mongoConnection from "./connections/mongodb.connection";
import { logger } from "@augmentos/utils";

// Initialize MongoDB connection
mongoConnection.init()
  .then(() => {
    logger.info('MongoDB connection initialized successfully');
    
    // Log admin emails from environment for debugging
    const adminEmails = process.env.ADMIN_EMAILS || '';
    logger.info('ENVIRONMENT VARIABLES CHECK:');
    logger.info(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    logger.info(`- ADMIN_EMAILS: "${adminEmails}"`);
    
    // Log additional environment details
    logger.info(`- Current working directory: ${process.cwd()}`);
    
    if (adminEmails) {
      const emails = adminEmails.split(',').map(e => e.trim());
      logger.info(`Admin access configured for ${emails.length} email(s): [${emails.join(', ')}]`);
    } else {
      logger.warn('No ADMIN_EMAILS environment variable found. Admin panel will be inaccessible.');
      
      // For development, log a helpful message
      if (process.env.NODE_ENV === 'development') {
        logger.info('Development mode: set ADMIN_EMAILS environment variable to enable admin access');
      }
    }
  })
  .catch(error => {
    logger.error('MongoDB connection failed:', error);
  });

// Initialize Express and HTTP server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 80; // Default http port.
const app = express();
const server = new Server(app);

// Middleware setup
app.use(helmet());
app.use(cors({
  credentials: true,
  origin: [
    '*',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5174',
    'http://localhost:5173',
    'http://localhost:53216',
    'http://localhost:6173',
    'https://cloud.augmentos.org',
    'https://dev.augmentos.org',
    'https://www.augmentos.org',
    'https://augmentos.org',
    "https://augmentos.dev",

    // AugmentOS App Store / Developer Portal
    "https://augmentos.dev",
    "https://appstore.augmentos.dev",

    "https://dev.appstore.augmentos.dev",
    "https://dev.augmentos.dev",
    "https://staging.appstore.augmentos.dev",
    "https://staging.augmentos.dev",
    "https://prod.appstore.augmentos.dev",
    "https://prod.augmentos.dev",

    "https://augmentos-developer-portal.netlify.app",

    "https://appstore.augmentos.org",
    "https://console.augmentos.org",

    "https://augmentos.pages.dev",
    "https://augmentos-appstore-2.pages.dev",
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/apps', appRoutes);
app.use('/api/auth', authRoutes);
app.use('/apps', appRoutes);
app.use('/auth', authRoutes);
app.use('/tpasettings', tpaSettingsRoutes);
app.use('/api/dev', devRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tpa-server', tpaServerRoutes);
app.use('/api/server', serverRoutes);

app.use(errorReportRoutes);
app.use(transcriptRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, './public')));

// Initialize WebSocket service
webSocketService.setupWebSocketServers(server);

// Start the server
server.listen(PORT, () => {
  logger.info(`\n
              ☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️
              😎 AugmentOS Cloud Server🚀
              🌐 Listening on port ${PORT}             🌐
              ☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️☁️ \n`);
});

export default server;
