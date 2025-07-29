#!/usr/bin/env node
/**
 * @file This is the main entry point for the Branch MCP Server.
 *
 * It performs the following key functions:
 * 1. Initializes the MCP (Model Context Protocol) server instance.
 * 2. Reads configuration from environment variables, with sensible defaults.
 * 3. Dynamically imports and registers all available Branch API tools.
 * 4. Seeds the language model with context about Branch's documentation.
 * 5. Sets up and starts a transport layer for communication (Stdio, SSE, or HTTP).
 * 6. Launches a separate monitoring server that exposes /health, /ready, and /metrics endpoints.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, {Request, Response} from 'express';
import { DEFAULT_CONFIG } from './config.js';
import type { BranchMcpConfig } from './config.js';
import { seedLLMWithBranchDocs } from './utils/docs-fetcher.js';
import logger from './utils/logger.js';
import * as client from 'prom-client';

// Get configuration from environment variables
const config: BranchMcpConfig = {
  branch_key: process.env.BRANCH_KEY ?? '',
  branch_url: process.env.BRANCH_URL || DEFAULT_CONFIG.branch_url,
  branch_secret: process.env.BRANCH_SECRET ?? '',
  app_id: process.env.BRANCH_APP_ID ?? '',
  auth_token: process.env.USER_AUTH_TOKEN ?? '',
  organization_id: process.env.BRANCH_ORGANIZATION_ID ?? ''
};

const mcpTransport = process.env.MCP_TRANSPORT || 'streamable-http';
const mcpPort = 8080;

// Create MCP server
const server = new McpServer({
  name: 'branch',
  description: 'Branch.io API tools for deep linking, attribution, and analytics',
  version: '1.0.0'
});

// Import API modules and register tools
import { registerDeepLinkingTools } from './apis/deep-linking.js';
import { registerQrCodeTools } from './apis/qr-code.js';

import { registerAppTools } from './apis/app.js';
import { registerQuickLinksTools } from './apis/quick-links.js';
import { registerAggregateExportTools } from './apis/aggregate-exports.js';
import { registerDataExportTools } from './apis/data-export.js';
import { registerCrossEventExportsTools } from './apis/cross-event-exports.js';
import { registerCohortTools } from './apis/cohort.js';
import { registerQueryTools } from './apis/query.js';

// Register all API tools
registerDeepLinkingTools(server, config);
registerQrCodeTools(server, config);
registerAppTools(server, config);
registerQuickLinksTools(server, config);
registerAggregateExportTools(server, config);
registerDataExportTools(server, config);
registerCrossEventExportsTools(server, config);
registerCohortTools(server, config);
registerQueryTools(server, config);

// Start server
async function runServer() {
  try {
    // Seed the LLM with Branch documentation before connecting
    await seedLLMWithBranchDocs(server);

    if (mcpTransport === 'stdio') {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error('Branch MCP Server running on stdio');
    } else {
      const app = express();
      app.use(express.json());

      // Monitoring server for health/readiness/metrics
      const monitorApp = express();
      const monitorPort = 8081;
      const register = new client.Registry();
      client.collectDefaultMetrics({ register });

      monitorApp.get('/health', (_req: Request, res: Response) => {
        res.status(200).send('OK');
      });

      monitorApp.get('/ready', (_req: Request, res: Response) => {
        res.status(200).send('OK');
      });

      monitorApp.get('/metrics', async (_req: Request, res: Response) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      });

      monitorApp.listen(monitorPort, () => {
        logger.info(`Monitoring server running on http://localhost:${monitorPort}`);
      });

      if (mcpTransport === 'sse') {
        const transports = new Map<string, SSEServerTransport>();

        app.get('/sse', async (req, res) => {
          const transport = new SSEServerTransport('/sse', res);
          transports.set(transport.sessionId, transport);
          req.on('close', () => {
            transports.delete(transport.sessionId);
          });
          await server.connect(transport);
        });

        app.post('/sse', (req, res) => {
          const sessionId = req.query.sessionId as string;
          const transport = transports.get(sessionId);
          if (transport) {
            transport.handlePostMessage(req, res, req.body);
          } else {
            res.status(404).send('Session not found');
          }
        });

        app.listen(mcpPort, () => {
          console.error(`Branch MCP Server (SSE) running on http://localhost:${mcpPort}/sse`);
        });
      } else if (mcpTransport === 'streamable-http') {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        await server.connect(transport);

        app.all('/mcp', (req: Request, res: Response) => {
          transport.handleRequest(req, res, req.body);
        });

        app.listen(mcpPort, () => {
          console.error(`Branch MCP Server (Streamable HTTP) running on http://localhost:${mcpPort}/mcp`);
        });
      }
    }
  } catch (error) {
    console.error("Error starting server:", error);
    throw error;
  }
}

runServer().catch((error) => {
  logger.error("Fatal error running server:", error);
  process.exit(1);
});