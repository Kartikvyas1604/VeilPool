import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { NodeMonitor } from './node-monitor';
import { PythIntegration } from './pyth-integration';
import { RoutingEngine } from './routing-engine';
import { RedisCache } from './redis-cache';
import { UserRoutingRequest } from './types';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PYTH_ENDPOINT = process.env.PYTH_ENDPOINT || 'https://pyth.network';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3001;

const nodeMonitor = new NodeMonitor(RPC_URL);
const pythIntegration = new PythIntegration(PYTH_ENDPOINT);
const routingEngine = new RoutingEngine(nodeMonitor, pythIntegration);
const redisCache = new RedisCache();

const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
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
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected');
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

app.get('/api/routing/optimal-node', async (req: Request, res: Response) => {
  try {
    const { user_location, destination, priority = 'balanced' } = req.query;

    if (!user_location || !destination) {
      return res.status(400).json({
        error: 'Missing required parameters: user_location, destination',
      });
    }

    const request: UserRoutingRequest = {
      userLocation: user_location as string,
      destination: destination as string,
      requiredBandwidth: 10,
      priorityMode: priority as 'speed' | 'privacy' | 'balanced',
    };

    const cachedDecision = await redisCache.getCachedRouting(
      `${user_location}-${destination}`
    );

    if (cachedDecision) {
      return res.json({
        ...cachedDecision,
        cached: true,
      });
    }

    const decision = await routingEngine.selectOptimalNode(request);
    
    await redisCache.cacheRoutingDecision(
      `${user_location}-${destination}`,
      decision
    );

    res.json(decision);
  } catch (error: any) {
    console.error('Routing error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/routing/report-failure', async (req: Request, res: Response) => {
  try {
    const { node_id, failure_reason } = req.body;

    if (!node_id || !failure_reason) {
      return res.status(400).json({
        error: 'Missing required fields: node_id, failure_reason',
      });
    }

    console.log(`Node failure reported: ${node_id} - ${failure_reason}`);

    await redisCache.incrementCounter(`failures:${node_id}`);

    broadcastUpdate({
      type: 'node_failure',
      nodeId: node_id,
      reason: failure_reason,
      timestamp: Date.now(),
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nodes/health-status', (req: Request, res: Response) => {
  try {
    const nodes = nodeMonitor.getActiveNodes();
    const stats = routingEngine.getRoutingStats();

    res.json({
      nodes,
      stats,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nodes/:nodeId', (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const node = nodeMonitor.getNodeById(nodeId);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(node);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threat-intel/:countryCode', (req: Request, res: Response) => {
  try {
    const { countryCode } = req.params;
    const intel = pythIntegration.getThreatLevel(countryCode);

    res.json(intel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threat-intel', (req: Request, res: Response) => {
  try {
    const allThreatData = pythIntegration.getAllThreatData();
    const threatArray = Array.from(allThreatData.entries()).map(([country, intel]) => ({
      country,
      ...intel,
    }));

    res.json(threatArray);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const routingStats = routingEngine.getRoutingStats();
    const redisStats = await redisCache.getStats();

    res.json({
      routing: routingStats,
      redis: redisStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  try {
    console.log('Starting VeilPool Routing Engine...');

    await redisCache.connect(REDIS_URL);
    
    await nodeMonitor.startMonitoring();
    await pythIntegration.startMonitoring();

    setInterval(() => {
      const stats = routingEngine.getRoutingStats();
      broadcastUpdate({
        type: 'stats_update',
        data: stats,
        timestamp: Date.now(),
      });
    }, 30000);

    server.listen(PORT, () => {
      console.log(`Routing Engine API listening on port ${PORT}`);
      console.log(`WebSocket server ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  nodeMonitor.stopMonitoring();
  pythIntegration.stopMonitoring();
  await redisCache.disconnect();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();
