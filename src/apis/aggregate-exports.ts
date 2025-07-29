import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import { getBranchBaseUrl, MCP_USER_AGENT } from '../utils/api.js';
import { BranchApiError, getErrorMessage } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { apiKeySchema, appIdOrOrgIdInput, appIdOrOrgIdValidator } from '../schemas/auth.js';
import { createTable } from '../utils/tables.js';
import { aggregateExportDataSources, aggregateExportDimensions } from './aggregate-exports-data.js';

const aggregateExportDataSourceEnum = z.enum(Object.keys(aggregateExportDataSources) as [string, ...string[]]);
const aggregateExportDimensionsEnum = z.enum(Object.keys(aggregateExportDimensions) as [string, ...string[]]);

const dataSourcesTable = createTable(aggregateExportDataSources);
const dimensionsTable = createTable(aggregateExportDimensions);

/**
 * Registers Aggregate Exports API tools with the MCP server.
 * This includes tools for creating and checking the status of aggregate data exports.
 * @see https://help.branch.io/developers-hub/reference/aggregate-api
 * @param server The MCP server instance.
 * @param config The Branch MCP configuration.
 */
export function registerAggregateExportTools(server: McpServer, config: BranchMcpConfig) {
  const createExportSchema = z.object({
    start_date: z.string().describe('The start of the interval time range represented as an ISO-8601 complete date.'),
    end_date: z.string().describe('The end of the interval time range represented as an ISO-8601 complete date.'),
    data_source: aggregateExportDataSourceEnum.describe(`The data source topic for the export. The available topics are:\n${dataSourcesTable}`),
    dimensions: z.array(aggregateExportDimensionsEnum).describe(`An array of dimensions to group by (limit 11). The available dimensions are:\n${dimensionsTable}`),
    filters: z.record(z.unknown()).optional().describe('An object for filtering results. Keys correspond to dimensions. Filters are combined with AND logic. Multiple values for a single key are combined with OR logic. Example: { "user_data_os": ["IOS", "ANDROID"] }'),
    granularity: z.enum(['day', 'week', 'month']).optional().describe("The time granularity for the data. Can be 'day', 'week', or 'month'. Default is 'day'. Note: When using 'day' granularity, use 'name' in dimensions instead of 'timestamp'."),
    aggregation: z.enum(['unique_count', 'total_count', 'revenue', 'cost', 'cost-in-local-currency']).optional().describe("How to count events. Defaults to 'total_count'. When using 'eo_commerce_event' as the data_source, 'revenue' can be used to sum revenue from matching events."),
    enable_install_recalculation: z.boolean().optional().describe('If true, Branch will de-dupe unattributed installs from non-opt-in users, primarily related to iOS 14.5+ privacy changes. Default is false.'),
    limit: z.number().optional().describe('The maximum number of results to return. Default is 50000.'),
    format: z.string().optional().describe('Format of returned data. Defaults to CSV.')
  });

  // Request Aggregate Export
  server.registerTool(
    'branch_create_aggregate_export',
    {
      description: 'Request a new aggregate data export.',
      inputSchema: createExportSchema.merge(apiKeySchema).merge(appIdOrOrgIdInput).shape,
      outputSchema: z.object({ job_id: z.string() }).passthrough().shape
    },
    async (params: z.infer<typeof createExportSchema & typeof apiKeySchema & typeof appIdOrOrgIdInput>) => {
      logger.debug('Executing tool: branch_create_aggregate_export with params:', params);
      const { api_key, ...rest } = params;
      if (!api_key) {
        throw new Error('Branch API Key must be provided in tool parameters.');
      }
      const { app_id, organization_id } = appIdOrOrgIdValidator.parse(rest);

      const queryParams: Record<string, string | number> = {};
      if (app_id) {
        queryParams.app_id = app_id;
      }
      if (organization_id) {
        queryParams.organization_id = organization_id;
      }
      if (rest.limit) {
        queryParams.limit = rest.limit;
      }
      if (rest.format) {
        queryParams.format = rest.format;
      }

      const { limit: _limit, format: _format, ...bodyParams } = rest;

      try {
        const url = `${getBranchBaseUrl(config)}/v2/analytics`;
        const response = await axios.post(url, bodyParams, {
          params: queryParams,
          headers: {
            'Content-Type': 'application/json',
            'Access-Token': api_key,
            'Accept': 'application/json',
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
        throw new BranchApiError(`Error creating aggregate export: ${getErrorMessage(error)}`);
      }
    }
  );

  // Get Export Download Status
  const getStatusSchema = z.object({
    job_id: z.string().describe('The unique ID of the export request, obtained from the response of branch_create_aggregate_export.'),
    limit: z.number().optional().describe('The maximum number of results to return.'),
    format: z.string().optional().describe('Format of returned data, e.g., json or csv.')
  });

  server.registerTool(
    'branch_get_aggregate_export_status',
    {
      description: 'Get the status of an aggregate data export job.',
      inputSchema: getStatusSchema.merge(apiKeySchema).merge(appIdOrOrgIdInput).shape,
      outputSchema: z.object({}).passthrough().shape
    },
    async (params: z.infer<typeof getStatusSchema & typeof apiKeySchema & typeof appIdOrOrgIdInput>) => {
      logger.debug('Executing tool: branch_get_aggregate_export_status with params:', params);
      const { api_key, job_id, ...rest } = params;
      if (!api_key) {
        throw new Error('Branch API Key must be provided in tool parameters.');
      }
      const { app_id, organization_id } = appIdOrOrgIdValidator.parse(rest);

      const queryParams: Record<string, string | number | undefined> = { ...rest };
      if (app_id) {
        queryParams.app_id = app_id;
      }
      if (organization_id) {
        queryParams.organization_id = organization_id;
      }

      try {
        const url = `${getBranchBaseUrl(config)}/v2/analytics/${job_id}`;
        const response = await axios.get(url, {
          params: queryParams,
          headers: {
            'Access-Token': api_key,
            'Accept': 'application/json',
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
        throw new BranchApiError(`Error getting aggregate export status: ${getErrorMessage(error)}`);
      }
    }
  );
}