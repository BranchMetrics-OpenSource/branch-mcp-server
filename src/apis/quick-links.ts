import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import { getBranchBaseUrl, MCP_USER_AGENT } from '../utils/api.js';
import { BranchApiError, getErrorMessage } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { deepLinkParamsSchema } from '../schemas/deep-link-params.js';
import { branchKeySchema, branchSecretSchema } from '../schemas/auth.js';
import { getResolvedAuth } from '../utils/auth.js';

// Schema for creating a Quick Link, with an option for dashboard visibility.
const quickLinkCreateParamsSchema = deepLinkParamsSchema;
// Note: The validation that $marketing_title is required when type is 'MARKETING'
// is handled inside the tool's implementation.

// Schema for updating a Quick Link. Note: some fields are immutable.
const quickLinkUpdateParamsSchema = deepLinkParamsSchema.omit({
  alias: true, // Cannot be updated
  type: true, // Cannot be updated
  identity: true // Cannot be updated
});

/**
 * Registers Quick Links API tools with the MCP server.
 * This includes tools for creating, updating, and bulk-creating Quick Links.
 * @see https://help.branch.io/apidocs/quick-links-api
 * @param server The MCP server instance.
 * @param config The Branch MCP configuration.
 */
export function registerQuickLinksTools(server: McpServer, config: BranchMcpConfig) {
  // Create Quick Link
  server.tool(
    'branch_create_quick_link',
    'Create a Branch Quick Link, with an option to make it visible on the dashboard.',
    quickLinkCreateParamsSchema.merge(branchKeySchema).merge(branchSecretSchema).shape,
    async (params: z.infer<typeof quickLinkCreateParamsSchema & typeof branchKeySchema & typeof branchSecretSchema>) => {
      logger.debug('Executing tool: branch_create_quick_link with params:', params);
      const { branch_key, branch_secret } = getResolvedAuth(params, config);
      if (!branch_key || !branch_secret) {
        throw new Error('Branch Key and Secret are not configured. Please provide them in the tool parameters or server configuration.');
      }

      if (params.type === 'MARKETING' && !params.data?.$marketing_title) {
        throw new Error('A $marketing_title is required in the data object for links to be visible on the dashboard (when type is MARKETING).');
      }

      try {
        const { type, ...linkParams } = params;
        const requestBody = {
          ...linkParams,
          branch_key,
          branch_secret,
          type: type === 'MARKETING' ? 2 : 0
        };

        const url = `${getBranchBaseUrl(config)}/v1/url`;
        const response = await axios.post(url, requestBody, {
          headers: { 'Content-Type': 'application/json', 'User-Agent': MCP_USER_AGENT }
        });
        return response.data;
      } catch (error) {
        let message = getErrorMessage(error);
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
          message = error.response.data.error.message;
        }
        logger.error(`Error in branch_create_quick_link: ${message}`);
        if (axios.isAxiosError(error)) {
          throw new BranchApiError(message, { status: error.response?.status ?? 0, response: error.response });
        }
        throw new BranchApiError(message, { status: 0 });
      }
    }
  );

  // Update Quick Link
  server.registerTool(
    'branch_update_quick_link',
    {
      description: 'Update an existing Branch Quick Link. This follows a read-then-write pattern.\n\n**Link Update Restrictions**\n- Not all links can be updated (e.g., links with the structure of bnc.lt/c/ or bnc.lt/d/).\n- The following fields are immutable and cannot be updated: `alias`, `identity`, `type`, `app_id`, `randomized_bundle_token`, `domain`, `state`, `creation_source`, `app_short_identifier`.\n- For dashboard visibility, `type` must have been set to `2` during creation and cannot be changed.',
      inputSchema: z.object({
        url: z.string().url().describe('The Branch Quick Link URL to update.'),
        link_data: quickLinkUpdateParamsSchema
      }).merge(branchKeySchema).merge(branchSecretSchema).shape,
      outputSchema: z.object({}).passthrough().shape
    },
    async (params: z.infer<z.ZodObject<{url: z.ZodString, link_data: typeof quickLinkUpdateParamsSchema}> & typeof branchKeySchema & typeof branchSecretSchema>) => {
      const { url, link_data } = params;
      logger.debug('Executing tool: branch_update_quick_link with params:', { url, link_data });
      const { branch_key, branch_secret } = getResolvedAuth(params, config);

      if (!branch_key) {
        throw new Error('Branch Key is not configured. Please provide it in the tool parameters or server configuration.');
      }
      if (!branch_secret) {
        throw new Error('Branch Secret is not configured. Please provide it in the tool parameters or server configuration.');
      }

      // Enforce update restrictions: check link structure.
      if (url.includes('bnc.lt/c/') || url.includes('bnc.lt/d/')) {
        return {
          content: [{ type: 'text', text: 'Update failed: Links with the structure bnc.lt/c/ or bnc.lt/d/ cannot be updated.' }],
          isError: true
        };
      }

      try {
        // Per Branch.io docs, update is a read-then-write operation to avoid data loss.
        // 1. Read the existing link data.
        const getUrl = `${getBranchBaseUrl(config)}/v1/url`;
        const getResponse = await axios.get(getUrl, {
          params: { url, branch_key },
          headers: { 'Accept': 'application/json', 'User-Agent': MCP_USER_AGENT }
        });
        const existingLinkData = getResponse.data;

        // 2. Merge existing data with the new data.
        const updatedLinkData = {
          ...existingLinkData,
          ...link_data,
          branch_key,
          branch_secret,
          url: url
        };

        // 3. Enforce update restrictions: filter out immutable fields from the payload.
        const immutableKeys = [
          'alias', 'identity', 'type', 'app_id', 'randomized_bundle_token',
          'domain', 'state', 'creation_source', 'app_short_identifier'
        ];

        const payload = { ...updatedLinkData };
        for (const key of immutableKeys) {
          delete (payload as Record<string, unknown>)[key];
        }

        // 4. Write the updated data back.
        const endpointUrl = `${getBranchBaseUrl(config)}/v1/url`;
        const response = await axios.put(endpointUrl, payload, {
          params: { url },
          headers: { 'Content-Type': 'application/json', 'User-Agent': MCP_USER_AGENT }
        });
        return { structuredContent: response.data, content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      } catch (error) {
        let message = getErrorMessage(error);
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
          message = error.response.data.error.message;
        }
        logger.error(`Error in branch_update_quick_link: ${message}`);
        if (axios.isAxiosError(error)) {
          throw new BranchApiError(message, { status: error.response?.status ?? 0, response: error.response });
        }
        throw new BranchApiError(message, { status: 0 });
      }
    }
  );

  // Bulk Create Quick Links
  // working as of 6/25/2025
  const bulkCreateSchema = z.object({
    links: z.array(quickLinkCreateParamsSchema).describe('An array of quick link objects to create.')
  });

  server.registerTool(
    'branch_bulk_create_quick_links',
    {
      description: 'Create multiple Branch Quick Links in a single request',
      inputSchema: bulkCreateSchema.merge(branchKeySchema).shape,
      outputSchema: z.object({ links: z.array(z.object({ url: z.string().url() }).passthrough()) }).shape
    },
    async (params: z.infer<typeof bulkCreateSchema & typeof branchKeySchema>) => {
      const { links } = params;
      logger.debug('Executing tool: branch_bulk_create_quick_links with params:', links);
      const { branch_key } = getResolvedAuth(params, config);

      if (!branch_key) {
        throw new Error('Branch Key is not configured. Please provide it in the tool parameters or server configuration.');
      }

      // Pre-flight validation for all links.
      for (const link of links) {
        if (link.type === 'MARKETING' && !link.data?.$marketing_title) {
          return {
            content: [{ type: 'text', text: `Validation Error: A $marketing_title is required for links to be visible on the dashboard. Problematic link data: ${JSON.stringify(link)}` }],
            isError: true
          };
        }
      }

      try {
                const transformedLinks = links.map((link: z.infer<typeof quickLinkCreateParamsSchema>) => {
          const { type, ...rest } = link;
          const newLink: Record<string, unknown> = { ...rest };
          if (type === 'MARKETING') {
            newLink.type = 2;
          }
          return newLink;
        });

        // The API endpoint for bulk creation is /v1/url/bulk/:branch_key and it expects an array payload.
        const url = `${getBranchBaseUrl(config)}/v1/url/bulk/${branch_key}`;
        const response = await axios.post(url, transformedLinks, {
          headers: { 'Content-Type': 'application/json', 'User-Agent': MCP_USER_AGENT }
        });
        return { structuredContent: response.data, content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      } catch (error) {
        let message = getErrorMessage(error);
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
          message = error.response.data.error.message;
        }
        logger.error(`Error in branch_bulk_create_quick_links: ${message}`);
        if (axios.isAxiosError(error)) {
          throw new BranchApiError(message, { status: error.response?.status ?? 0, response: error.response });
        }
        throw new BranchApiError(message, { status: 0 });
      }
    }
  );
}