import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BranchMcpConfig } from '../config.js';
import { getBranchBaseUrl, handleApiError, MCP_USER_AGENT } from '../utils/api.js';
import { deepLinkParamsSchema } from '../schemas/deep-link-params.js';
import { authTokenSchema, appIdSchema, branchKeySchema, branchSecretSchema } from '../schemas/auth.js';
import { getResolvedAuth } from '../utils/auth.js';
import axios from 'axios';

/**
 * Registers Deep Linking API tools with the MCP server.
 * This includes tools for creating, reading, updating, and deleting deep links.
 * @see https://help.branch.io/apidocs/deep-linking-api
 * @param server The MCP server instance.
 * @param config The Branch MCP configuration.
 */

export function registerDeepLinkingTools(server: McpServer, config: BranchMcpConfig) {
  const createDeepLinkSchema = deepLinkParamsSchema.merge(branchKeySchema);
  const bulkCreateDeepLinksSchema = z.object({ links: z.array(deepLinkParamsSchema).describe('An array of deep link objects to create.') }).merge(branchKeySchema);
  const readDeepLinkSchema = z.object({ url: z.string().describe('The Branch deep link URL to read') }).merge(branchKeySchema);
  const updateDeepLinkSchema = z.object({ url: z.string().describe('The Branch deep link URL to update') }).merge(deepLinkParamsSchema).merge(branchKeySchema).merge(branchSecretSchema);
  const deleteDeepLinkSchema = z.object({ url: z.string().describe('The Branch deep link URL to delete') }).merge(appIdSchema).merge(authTokenSchema);
  // Create a Deep Link URL
  server.registerTool(
    'branch_create_deep_link',
    {
      description: 'Create a Branch deep link URL',
      inputSchema: createDeepLinkSchema.shape,
      outputSchema: z.object({
        url: z.string().url()
      }).passthrough().shape
    },
    async (params: z.infer<typeof createDeepLinkSchema>) => {
      try {
        const branch_key = params.branch_key ?? config.branch_key;
        if (!branch_key) {
          throw new Error('Branch Key is not configured. Please provide it in the tool parameters or server configuration.');
        }
        const url = `${getBranchBaseUrl(config)}/v1/url`;
        const response = await axios.post(url, { ...params, branch_key }, {
          headers: { 'Content-Type': 'application/json', 'User-Agent': MCP_USER_AGENT }
        });
        return { structuredContent: response.data, content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      } catch (error) {
        handleApiError(error);
      }
    }
  );

  // Bulk Create Deep Link URLs
  server.registerTool(
    'branch_bulk_create_deep_links',
    {
      description: 'Create multiple Branch deep link URLs in a single request',
      inputSchema: bulkCreateDeepLinksSchema.shape,
      outputSchema: z.object({ links: z.array(z.object({ url: z.string().url() }).passthrough()) }).shape
    },
    async (params: z.infer<typeof bulkCreateDeepLinksSchema>) => {
      const { links } = params;
      const branch_key = params.branch_key ?? config.branch_key;
      if (!branch_key) {
        throw new Error('Branch Key is not configured. Please provide it in the tool parameters or server configuration.');
      }
      try {
        const url = `${getBranchBaseUrl(config)}/v1/url/bulk/${branch_key}`;
        const response = await axios.post(url, links, {
          headers: { 'Content-Type': 'application/json', 'User-Agent': MCP_USER_AGENT }
        });
        return { structuredContent: { links: response.data }, content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      } catch (error) {
        handleApiError(error);
      }
    }
  );

  // Read a Deep Link URL
  server.tool(
    'branch_read_deep_link',
    'Read the data associated with a Branch deep link URL',
    readDeepLinkSchema.shape,
    async (params: z.infer<typeof readDeepLinkSchema>) => {
      try {
        const { branch_key } = getResolvedAuth(params, config);
        if (!branch_key) {
          throw new Error('Branch Key is not configured. Please provide it in the tool parameters or server configuration.');
        }
        const readUrl = `${getBranchBaseUrl(config)}/v1/url`;
        const response = await axios.get(readUrl, {
          params: { ...params, branch_key },
          headers: { Accept: 'application/json', 'User-Agent': MCP_USER_AGENT }
        });
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      } catch (error) {
        handleApiError(error);
      }
    }
  );

  // Update a Deep Link URL
  server.registerTool(
    'branch_update_deep_link',
    {
      description: 'Update a Branch deep link URL',
      inputSchema: updateDeepLinkSchema.shape,
      outputSchema: deepLinkParamsSchema.passthrough().shape
    },
    async (params: z.infer<typeof updateDeepLinkSchema>) => {
      const { branch_key, branch_secret } = getResolvedAuth(params, config);
      if (!branch_key) {
        throw new Error('Branch Key is not configured. Please provide it in the tool parameters or server configuration.');
      }
      if (!branch_secret) {
        throw new Error('Branch Secret is not configured and is required for this operation. Please provide it in the tool parameters or server configuration.');
      }
      try {
        const { url, ...rest } = params;
        const endpointUrl = `${getBranchBaseUrl(config)}/v1/url`;
        const requestBody = {
          ...rest,
          branch_key,
          branch_secret
        };
        const response = await axios.put(endpointUrl, requestBody, {
          params: { url },
          headers: { 'Content-Type': 'application/json', 'User-Agent': MCP_USER_AGENT }
        });
        return { structuredContent: response.data, content: [] };
      } catch (error) {
        handleApiError(error);
      }
    }
  );

  // Delete a Deep Link URL
  server.tool(
    'branch_delete_deep_link',
    'Delete a Branch deep link URL',
    deleteDeepLinkSchema.shape,
    async (params: z.infer<typeof deleteDeepLinkSchema>) => {
      const { auth_token, app_id } = getResolvedAuth(params, config);
      if (!app_id) {
        throw new Error('Branch App ID is not configured. Please provide it in the tool parameters or server configuration.');
      }
      if (!auth_token) {
        throw new Error('Branch Auth Token is not configured. Please provide it in the tool parameters or server configuration.');
      }

      const url = `${getBranchBaseUrl(config)}/v1/url`;
      try {
        const response = await axios.delete(url, {
          params: { url: params.url, app_id },
          headers: {
            'Access-Token': auth_token,
            'User-Agent': MCP_USER_AGENT
          }
        });
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      } catch (error) {
        handleApiError(error);
      }
    }
  );
}