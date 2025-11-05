#!/usr/bin/env node

/**
 * AI Orchestra Server
 * Main entry point for the application
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { ConfigManager } from './core/config_manager.js';
import { LLMBridge } from './core/llm_bridge.js';
import { GitHubIntegration } from './core/integrations/github_integration.js';

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    console.log('[Server] GitHub integration initialized');
  } catch (error) {
    console.warn('[Server] Failed to initialize GitHub integration:', error.message);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.application.environment,
    version: config.application.version,
  });
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
  try {
    const { prompt, provider, model, temperature, maxTokens } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await llmBridge.query({
      prompt,
      provider,
      model,
      temperature,
      maxTokens,
    });

    res.json(response);
  } catch (error) {
    console.error('[API] Query failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stream', async (req, res) => {
  try {
    const { prompt, provider, model, temperature, maxTokens } = req.body;

    if (!prompt) {
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
  } catch (error) {
    console.error('[API] Stream query failed:', error.message);
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
  console.error('[Server] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize WebSocket server (if enabled)
let wss = null;
if (config.websocket?.enabled) {
  wss = new WebSocketServer({ port: config.websocket.port });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'query') {
          const response = await llmBridge.query(data.payload);
          ws.send(JSON.stringify({ type: 'response', data: response }));
        } else if (data.type === 'stream') {
          for await (const chunk of llmBridge.streamQuery(data.payload)) {
            ws.send(JSON.stringify({ type: 'stream', data: chunk }));
          }
          ws.send(JSON.stringify({ type: 'done' }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', error: error.message }));
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
    });
  });

  console.log(`[WebSocket] Server listening on port ${config.websocket.port}`);
}

// Start HTTP server
const PORT = config.application.port;
const HOST = config.application.host;

httpServer.listen(PORT, HOST, () => {
  console.log(`\n[Server] AI Orchestra is running!`);
  console.log(`[Server] HTTP: http://${HOST}:${PORT}`);
  console.log(`[Server] Environment: ${config.application.environment}`);
  console.log(`[Server] Press Ctrl+C to stop\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');

  httpServer.close(() => {
    console.log('[Server] HTTP server closed');

    if (wss) {
      wss.close(() => {
        console.log('[Server] WebSocket server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');

  httpServer.close(() => {
    console.log('[Server] HTTP server closed');

    if (wss) {
      wss.close(() => {
        console.log('[Server] WebSocket server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
