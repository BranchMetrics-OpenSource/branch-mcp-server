import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BranchMcpConfig } from '../config.js';
import { getErrorMessage, BranchApiError } from '../utils/errors.js';
import { MCP_USER_AGENT } from '../utils/api.js';
import logger from '../utils/logger.js';
import axios from 'axios';
import { getResolvedAuth } from '../utils/auth.js';
import { branchKeySchema, branchSecretSchema } from '../schemas/auth.js';

/**
 * Registers App API tools with the MCP server.
 * This includes tools for getting and updating Branch app settings.
 * @see https://help.branch.io/apidocs/app-api
 * @param server The MCP server instance.
 * @param config The Branch MCP configuration.
 */
export function registerAppTools(server: McpServer, config: BranchMcpConfig) {
  const getBranchBaseUrl = () => {
    const baseUrl = config.branch_url || 'api2.branch.io';
    return `https://${baseUrl}`;
  };

  const authSchema = branchKeySchema.merge(branchSecretSchema);

  const appSettingsSchema = z.object({
    app_name: z.string().optional(),
    dev_name: z.string().optional(),
    dev_email: z.string().email().optional(),
    short_url_domain: z.string().optional(),
    default_desktop_url: z.string().url().optional(),
    android_app_link_check_for_app_install: z.boolean().optional(),
    ios_app_store_id: z.string().optional(),
    ios_bundle_id: z.string().optional(),
    ios_team_id: z.string().optional(),
    ios_app_store_country: z.string().optional(),
    android_uri_scheme: z.string().optional(),
    android_package_name: z.string().optional(),
    android_sha256_cert_fingerprints: z.array(z.string()).optional(),
    fire_uri_scheme: z.string().optional(),
    windows_phone_uri_scheme: z.string().optional(),
    blackberry_uri_scheme: z.string().optional(),
    web_to_app_requires_app_token: z.boolean().optional(),
    text_message_footer: z.string().optional(),
    custom_sms_text_option: z.boolean().optional(),
    uri_redirect_mode: z.boolean().optional(),
    universal_linking_enabled: z.boolean().optional(),
    always_open_app_setting: z.boolean().optional(),
    imessage_app_id: z.string().optional(),
    snapshot_link_behavior: z.string().optional()
  });

  const updateAppSettingsSchema = appSettingsSchema.merge(authSchema);

  // Get App Settings
  server.registerTool(
    'branch_get_app_settings',
    {
      description: 'Get the settings for a Branch app',
      inputSchema: authSchema.shape,
      outputSchema: z.object({}).passthrough().shape,
      annotations: {
        examples: [
          {
            params: {},
            result: {
              branch_key: 'key_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
              app_name: 'My Awesome App',
              dev_name: 'Branch Developer',
              dev_email: 'developer@branch.io'
            }
          }
        ]
      }
    },
    async (params: z.infer<typeof authSchema>) => {
      logger.debug('Executing tool: branch_get_app_settings');
      const { branch_key, branch_secret } = getResolvedAuth(params, config);
      if (!branch_key || !branch_secret) {
        throw new Error('Branch Key and Secret must be provided in tool parameters or server configuration.');
      }
      try {
        const url = `${getBranchBaseUrl()}/v1/app/${branch_key}`;
        const response = await axios.get(url, {
          params: { branch_secret },
          headers: { Accept: 'application/json', 'User-Agent': MCP_USER_AGENT }
        });

        return {
          structuredContent: response.data,
          content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw new BranchApiError(`Branch API error: ${error.response.status} ${error.response.statusText}`, {
            status: error.response.status,
            response: error.response
          });
        }
        throw new BranchApiError(`Error getting app settings: ${getErrorMessage(error)}`);
      }
    }
  );



  // Update App Settings
  server.registerTool(
    'branch_update_app_settings',
    {
      description: 'Update the settings for a Branch app',
      inputSchema: updateAppSettingsSchema.shape,
      outputSchema: z.object({}).passthrough().shape,
      annotations: {
        examples: [
          {
            params: {
              dev_email: 'developer@example.com',
              app_name: 'Updated App Name',
              og_title: 'My Updated OG Title'
            },
            result: {
              branch_key: 'key_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
              app_name: 'Updated App Name',
              og_title: 'My Updated OG Title',
              dev_email: 'developer@example.com'
            }
          }
        ]
      }
    },
    async (params: z.infer<typeof updateAppSettingsSchema>) => {
      logger.debug('Executing tool: branch_update_app_settings with params:', params);
      const { branch_key, branch_secret } = getResolvedAuth(params, config);
      if (!branch_key || !branch_secret) {
        throw new Error('Branch Key and Secret must be provided in tool parameters or server configuration.');
      }
      try {
        const url = `${getBranchBaseUrl()}/v1/app/${branch_key}`;
        const body = { ...params, branch_secret };

        const response = await axios.put(url, body, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': MCP_USER_AGENT
          }
        });

        return {
          structuredContent: response.data,
          content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw new BranchApiError(`Branch API error: ${error.response.status} ${error.response.statusText}`, {
            status: error.response.status,
            response: error.response
          });
        }
        throw new BranchApiError(`Error updating app settings: ${getErrorMessage(error)}`);
      }
    }
  );
}