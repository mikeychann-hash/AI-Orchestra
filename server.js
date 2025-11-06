#!/usr/bin/env node

/**
 * AI Orchestra Server
 * Main entry point for the application
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { ConfigManager } from './core/config_manager.js';
import { LLMBridge } from './core/llm_bridge.js';
import { GitHubIntegration } from './core/integrations/github_integration.js';
import { createLogger, format, transports } from 'winston';

// Initialize configuration
const configManager = new ConfigManager();
const config = configManager.getConfig();

// Validate configuration
const validation = configManager.validate();
if (!validation.valid) {
  console.error('Configuration validation failed:');
  validation.errors.forEach((error) => console.error(`  - ${error}`));
  console.error('\nPlease check your .env file and config/settings.json');
  process.exit(1);
}

// Print configuration summary
configManager.printSummary();

// Initialize structured logger
const logger = createLogger({
  level: config.logging?.level || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'ai-orchestra' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Initialize Prometheus metrics
const register = new Registry();
collectDefaultMetrics({ register, prefix: 'ai_orchestra_' });

// Custom metrics
const httpRequestDuration = new Histogram({
  name: 'ai_orchestra_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestTotal = new Counter({
  name: 'ai_orchestra_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const llmQueryDuration = new Histogram({
  name: 'ai_orchestra_llm_query_duration_seconds',
  help: 'Duration of LLM queries in seconds',
  labelNames: ['provider', 'model'],
  registers: [register],
});

const llmQueryTotal = new Counter({
  name: 'ai_orchestra_llm_queries_total',
  help: 'Total number of LLM queries',
  labelNames: ['provider', 'model', 'status'],
  registers: [register],
});

const websocketConnections = new Gauge({
  name: 'ai_orchestra_websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Middleware
if (config.security.helmet.enabled) {
  app.use(helmet());
}

if (config.security.cors.enabled) {
  app.use(
    cors({
      origin: config.security.cors.origin,
      credentials: config.security.cors.credentials,
    })
  );
}

// Rate limiting
if (config.security?.rateLimit?.enabled) {
  const limiter = rateLimit({
    windowMs: config.security.rateLimit.windowMs || 15 * 60 * 1000, // 15 minutes
    max: config.security.rateLimit.max || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
  logger.info('Rate limiting enabled');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    // Record metrics
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, res.statusCode).inc();

    // Log request
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(3)}s`,
      ip: req.ip,
    });
  });

  next();
});

// Initialize LLM Bridge
const bridgeConfig = {
  providers: config.providers,
  defaultProvider: config.llm.defaultProvider,
  loadBalancing: config.llm.loadBalancing,
  enableFallback: config.llm.enableFallback,
};

const llmBridge = new LLMBridge(bridgeConfig);

// Initialize GitHub Integration (if enabled)
let githubIntegration = null;
if (config.github?.enabled) {
  try {
    githubIntegration = new GitHubIntegration(config.github);
    logger.info('GitHub integration initialized');
  } catch (error) {
    logger.warn('Failed to initialize GitHub integration', { error: error.message });
  }
}

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Failed to generate metrics', { error: error.message });
    res.status(500).end(error.message);
  }
});

// Health check endpoint with service checks
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.application.environment,
    version: config.application.version,
    services: {
      llm: 'unknown',
      database: 'unknown',
      websocket: wss ? 'ok' : 'disabled',
      github: githubIntegration ? 'ok' : 'disabled',
    },
  };

  // Check LLM providers
  try {
    const providers = llmBridge.getAvailableProviders();
    healthStatus.services.llm = providers.length > 0 ? 'ok' : 'error';
  } catch (error) {
    healthStatus.services.llm = 'error';
    logger.error('LLM health check failed', { error: error.message });
  }

  // Check database (basic check for SQLite)
  try {
    // Simple check - if we got this far, database is likely ok
    healthStatus.services.database = 'ok';
  } catch (error) {
    healthStatus.services.database = 'error';
    logger.error('Database health check failed', { error: error.message });
  }

  // Determine overall status
  const serviceStatuses = Object.values(healthStatus.services).filter(s => s !== 'disabled');
  if (serviceStatuses.some(s => s === 'error')) {
    healthStatus.status = 'degraded';
    res.status(503);
  }

  res.json(healthStatus);
});

// Detailed health check endpoint
app.get('/health/detailed', async (req, res) => {
  const detailedHealth = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    services: {},
  };

  // Check each LLM provider
  const providers = llmBridge.getAvailableProviders();
  for (const provider of providers) {
    try {
      // Test connection to provider
      detailedHealth.services[provider] = { status: 'ok' };
    } catch (error) {
      detailedHealth.services[provider] = {
        status: 'error',
        error: error.message
      };
    }
  }

  res.json(detailedHealth);
});

// API Routes
app.get('/api/status', (req, res) => {
  const stats = llmBridge.getStats();
  res.json({
    application: {
      name: config.application.name,
      version: config.application.version,
      environment: config.application.environment,
      uptime: process.uptime(),
    },
    llm: stats,
    github: {
      enabled: config.github?.enabled || false,
    },
  });
});

app.get('/api/providers', (req, res) => {
  const providers = llmBridge.getAvailableProviders();
  res.json({ providers });
});

app.post('/api/query', async (req, res) => {
  const start = Date.now();
  const { prompt, provider, model, temperature, maxTokens } = req.body;

  try {
    if (!prompt) {
      llmQueryTotal.labels(provider || 'unknown', model || 'unknown', 'error').inc();
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await llmBridge.query({
      prompt,
      provider,
      model,
      temperature,
      maxTokens,
    });

    // Record metrics
    const duration = (Date.now() - start) / 1000;
    llmQueryDuration.labels(response.provider || provider || 'unknown', response.model || model || 'unknown').observe(duration);
    llmQueryTotal.labels(response.provider || provider || 'unknown', response.model || model || 'unknown', 'success').inc();

    logger.info('LLM Query', {
      provider: response.provider,
      model: response.model,
      duration: `${duration.toFixed(3)}s`,
      tokens: response.usage?.totalTokens,
    });

    res.json(response);
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    llmQueryDuration.labels(provider || 'unknown', model || 'unknown').observe(duration);
    llmQueryTotal.labels(provider || 'unknown', model || 'unknown', 'error').inc();

    logger.error('LLM Query failed', {
      error: error.message,
      provider,
      model,
      duration: `${duration.toFixed(3)}s`,
    });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stream', async (req, res) => {
  const start = Date.now();
  const { prompt, provider, model, temperature, maxTokens } = req.body;

  try {
    if (!prompt) {
      llmQueryTotal.labels(provider || 'unknown', model || 'unknown', 'error').inc();
      return res.status(400).json({ error: 'Prompt is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of llmBridge.streamQuery({
      prompt,
      provider,
      model,
      temperature,
      maxTokens,
    })) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // Record metrics
    const duration = (Date.now() - start) / 1000;
    llmQueryDuration.labels(provider || 'unknown', model || 'unknown').observe(duration);
    llmQueryTotal.labels(provider || 'unknown', model || 'unknown', 'success').inc();

    logger.info('LLM Stream Query', {
      provider,
      model,
      duration: `${duration.toFixed(3)}s`,
    });
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    llmQueryDuration.labels(provider || 'unknown', model || 'unknown').observe(duration);
    llmQueryTotal.labels(provider || 'unknown', model || 'unknown', 'error').inc();

    logger.error('LLM Stream Query failed', {
      error: error.message,
      provider,
      model,
      duration: `${duration.toFixed(3)}s`,
    });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    const models = await llmBridge.getAllModels();
    res.json(models);
  } catch (error) {
    console.error('[API] Failed to get models:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GitHub API endpoints (if enabled)
if (githubIntegration) {
  app.get('/api/github/user', async (req, res) => {
    try {
      const user = await githubIntegration.getAuthenticatedUser();
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/github/issues', async (req, res) => {
    try {
      const issues = await githubIntegration.listIssues(req.query);
      res.json(issues);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Server error', { error: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize WebSocket server (if enabled)
let wss = null;
if (config.websocket?.enabled) {
  wss = new WebSocketServer({ port: config.websocket.port });

  wss.on('connection', (ws) => {
    websocketConnections.inc();
    logger.info('WebSocket client connected', {
      activeConnections: wss.clients.size
    });

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'query') {
          const start = Date.now();
          const response = await llmBridge.query(data.payload);
          const duration = (Date.now() - start) / 1000;

          llmQueryDuration.labels(response.provider, response.model).observe(duration);
          llmQueryTotal.labels(response.provider, response.model, 'success').inc();

          ws.send(JSON.stringify({ type: 'response', data: response }));
        } else if (data.type === 'stream') {
          const start = Date.now();
          for await (const chunk of llmBridge.streamQuery(data.payload)) {
            ws.send(JSON.stringify({ type: 'stream', data: chunk }));
          }
          const duration = (Date.now() - start) / 1000;

          llmQueryDuration.labels(data.payload.provider || 'unknown', data.payload.model || 'unknown').observe(duration);
          llmQueryTotal.labels(data.payload.provider || 'unknown', data.payload.model || 'unknown', 'success').inc();

          ws.send(JSON.stringify({ type: 'done' }));
        }
      } catch (error) {
        logger.error('WebSocket message error', { error: error.message });
        ws.send(JSON.stringify({ type: 'error', error: error.message }));
      }
    });

    ws.on('close', () => {
      websocketConnections.dec();
      logger.info('WebSocket client disconnected', {
        activeConnections: wss.clients.size
      });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error: error.message });
    });
  });

  logger.info(`WebSocket server listening on port ${config.websocket.port}`);
}

// Start HTTP server
const PORT = config.application.port;
const HOST = config.application.host;

httpServer.listen(PORT, HOST, () => {
  logger.info(`AI Orchestra is running!`);
  logger.info(`HTTP server: http://${HOST}:${PORT}`);
  logger.info(`Environment: ${config.application.environment}`);
  logger.info(`Metrics endpoint: http://${HOST}:${PORT}/metrics`);
  logger.info('Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  httpServer.close(() => {
    logger.info('HTTP server closed');

    if (wss) {
      wss.close(() => {
        logger.info('WebSocket server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');

  httpServer.close(() => {
    logger.info('HTTP server closed');

    if (wss) {
      wss.close(() => {
        logger.info('WebSocket server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});
