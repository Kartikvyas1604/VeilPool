import express, { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { NodeMonitor } from './node-monitor';
import { PythIntegration } from './pyth-integration';
import { RoutingEngine } from './routing-engine';
import { RedisCache } from './redis-cache';
import { ConnectionManager } from './connection-manager';
import { UserRoutingRequest } from './types';
import { logger } from './logger';
import { errorHandler, notFoundHandler, asyncHandler, ValidationError } from './error-handler';
import { RateLimiter } from './rate-limiter';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

app.use(express.json());

const rateLimiter = new RateLimiter();
app.use('/api/', rateLimiter.middleware());

app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).correlationId = randomUUID();
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    correlationId: (req as any).correlationId,
  });
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).correlationId = randomUUID();
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId: (req as any).correlationId,
    });
  });
  
  next();
});

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PYTH_ENDPOINT = process.env.PYTH_ENDPOINT || 'https://pyth.network';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3001;

const nodeMonitor = new NodeMonitor(RPC_URL);
const pythIntegration = new PythIntegration(PYTH_ENDPOINT);
const routingEngine = new RoutingEngine(nodeMonitor, pythIntegration);
const redisCache = new RedisCache();
const connectionManager = new ConnectionManager();

const clients = new Set<WebSocket>();

connectionManager.on('connectionEstablished', (data) => {
  broadcastUpdate({ type: 'connection_established', data });
});

connectionManager.on('connectionTerminated', (data) => {
  broadcastUpdate({ type: 'connection_terminated', data });
});

connectionManager.on('nodeSwitched', (data) => {
  broadcastUpdate({ type: 'node_switched', data });
});

connectionManager.on('connectionFailed', (data) => {
  broadcastUpdate({ type: 'connection_failed', data });
});

wss.on('connection', (ws: WebSocket) => {
  logger.info('WebSocket client connected');
  clients.add(ws);

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'subscribe_routing') {
        ws.send(JSON.stringify({
          type: 'routing_update',
          data: routingEngine.getRoutingStats(),
        }));
      }
    } catch (error) {
      logger.error('WebSocket message error', { error });
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    logger.info('WebSocket client disconnected');
  });
});

function broadcastUpdate(data: any) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    nodes: nodeMonitor.getNodeCount(),
    uptime: process.uptime(),
  });
});

app.get('/api/routing/optimal-node', asyncHandler(async (req: Request, res: Response) => {
  const { user_location, destination, priority = 'balanced' } = req.query;

  if (!user_location || !destination) {
    throw new ValidationError('Missing required parameters: user_location, destination');
  }

  const request: UserRoutingRequest = {
    userLocation: user_location as string,
    destination: destination as string,
    requiredBandwidth: 10,
    priorityMode: priority as 'speed' | 'privacy' | 'balanced',
  };

  const cacheKey = `${user_location}-${destination}`;
  const cachedDecision = await redisCache.getCachedRouting(cacheKey);

  if (cachedDecision) {
    logger.debug('Returning cached routing decision', { cacheKey });
    return res.json({
      ...cachedDecision,
      cached: true,
    });
  }

  const decision = await routingEngine.selectOptimalNode(request);
  await redisCache.cacheRoutingDecision(cacheKey, decision);

  res.json(decision);
}));

app.post('/api/routing/report-failure', asyncHandler(async (req: Request, res: Response) => {
  const { node_id, failure_reason } = req.body;

  if (!node_id || !failure_reason) {
    throw new ValidationError('Missing required fields: node_id, failure_reason');
  }

  logger.warn('Node failure reported', { nodeId: node_id, reason: failure_reason });

  await redisCache.incrementCounter(`failures:${node_id}`);

  broadcastUpdate({
    type: 'node_failure',
    nodeId: node_id,
    reason: failure_reason,
    timestamp: Date.now(),
  });

  res.json({ success: true });
}));

app.get('/api/nodes/health-status', asyncHandler(async (req: Request, res: Response) => {
  const nodes = nodeMonitor.getActiveNodes();
  const stats = routingEngine.getRoutingStats();

  res.json({
    nodes,
    stats,
    timestamp: Date.now(),
  });
}));

app.get('/api/nodes/:nodeId', asyncHandler(async (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const node = nodeMonitor.getNodeById(nodeId);

  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }

  res.json(node);
}));

app.get('/api/threat-intel/:countryCode', asyncHandler(async (req: Request, res: Response) => {
  const { countryCode } = req.params;
  const intel = pythIntegration.getThreatLevel(countryCode);

  res.json(intel);
}));

app.get('/api/threat-intel', asyncHandler(async (req: Request, res: Response) => {
  const allThreatData = pythIntegration.getAllThreatData();
  const threatArray = Array.from(allThreatData.entries()).map(([country, intel]) => ({
    country,
    ...intel,
  }));

  res.json(threatArray);
}));

app.get('/api/stats', asyncHandler(async (req: Request, res: Response) => {
  const routingStats = routingEngine.getRoutingStats();
  const redisStats = await redisCache.getStats();

  res.json({
    routing: routingStats,
    redis: redisStats,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
}));

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    logger.info('Starting VeilPool Routing Engine...');

    await redisCache.connect(REDIS_URL);
    logger.info('Redis connected successfully');
    
    await nodeMonitor.startMonitoring();
    logger.info('Node monitoring started');
    
    await pythIntegration.startMonitoring();
    logger.info('Pyth integration monitoring started');

    setInterval(() => {
      const stats = routingEngine.getRoutingStats();
      broadcastUpdate({
        type: 'stats_update',
        data: stats,
        timestamp: Date.now(),
      });
    }, 30000);

    server.listen(PORT, () => {
      logger.info(`Routing Engine API listening on port ${PORT}`);
      logger.info('WebSocket server ready for connections');
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  
  nodeMonitor.stopMonitoring();
  pythIntegration.stopMonitoring();
  await redisCache.disconnect();
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', { reason });
  process.exit(1);
});

startServer();
