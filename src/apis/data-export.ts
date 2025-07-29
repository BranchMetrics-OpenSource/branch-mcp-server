import axios from 'axios';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BranchMcpConfig } from '../config.js';
import { getBranchBaseUrl, MCP_USER_AGENT } from '../utils/api.js';
import { BranchApiError, getErrorMessage } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { getResolvedAuth } from '../utils/auth.js';
import { createTable } from '../utils/tables.js';
import { branchKeySchema, branchSecretSchema, apiKeySchema, appIdOrOrgIdInput, appIdOrOrgIdValidator } from '../schemas/auth.js';
import { customExportReportTypes, customExportFields } from './data-export-data.js';

const customExportReportTypeEnum = z.enum(Object.keys(customExportReportTypes) as [string, ...string[]]);

const customExportReportTypesTable = createTable(customExportReportTypes);

const customExportFieldsEnum = z.enum(Object.keys(customExportFields) as [string, ...string[]]);
const customExportFieldsTable = createTable(customExportFields);

/**
 * Registers Data Export API tools with the MCP server.
 * This includes tools for daily exports, custom exports, and checking data readiness.
 * @see https://help.branch.io/developers-hub/reference/custom-exports-api
 * @see https://help.branch.io/developers-hub/reference/daily-exports-api
 * @param server The MCP server instance.
 * @param config The Branch MCP configuration.
 */
export function registerDataExportTools(server: McpServer, config: BranchMcpConfig) {
  const dailyExportsSchema = z.object({
    export_date: z.string().describe('The UTC date of the requested data export, in YYYY-MM-DD format.')
  }).merge(branchKeySchema).merge(branchSecretSchema);
  // Daily Exports API (V3)
  server.registerTool(
    'branch_get_daily_exports',
    {
      description: 'Pull granular Branch event data for a specific day.',
      inputSchema: dailyExportsSchema.shape,
      outputSchema: z.object({}).passthrough().shape
    },
    async (params: z.infer<typeof dailyExportsSchema>) => {
      logger.debug('Executing tool: branch_get_daily_exports with params:', params);
      const { branch_key, branch_secret, export_date } = params;
      const resolvedAuth = getResolvedAuth({ branch_key, branch_secret }, config);
      if (!resolvedAuth.branch_key || !resolvedAuth.branch_secret) {
        throw new Error('Branch Key and Secret are not configured.');
      }
      try {
        const url = `${getBranchBaseUrl(config)}/v3/export`;
        const response = await axios.post(url, {
          branch_key: resolvedAuth.branch_key,
          branch_secret: resolvedAuth.branch_secret,
          export_date
        }, {
          headers: {
            'Content-Type': 'application/json',
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
        throw new BranchApiError(`Error getting daily exports: ${getErrorMessage(error)}`);
      }
    }
  );

  // Custom Exports API (V2)
  const createCustomExportInputSchema = z.object({
    start_date: z.string().describe('The beginning datetime for the requested results, in ISO-8601 format (e.g., 2016-01-01T00:00:00Z). Must be within the last 120 days.'),
    end_date: z.string().describe('The end datetime for the requested results, in ISO-8601 format (e.g., 2016-01-01T23:59:59:999Z).'),
    report_type: customExportReportTypeEnum.describe(`The Branch EO topic to be exported. The available topics are:\n${customExportReportTypesTable}`),
    fields: z.array(customExportFieldsEnum).describe(`List of fields desired in results. **Note:** Not all fields are valid for every report_type. Please consult the Branch documentation for valid combinations.\n\n**Available Fields:**\n${customExportFieldsTable}`),
    limit: z.number().optional().describe('Limit the number of records returned (max 15 million). Disregarded if allow_multiple_files is true.'),
    timezone: z.string().optional().describe('Timezone for results, accepts tz database strings (e.g., America/Los_Angeles). Defaults to dashboard timezone or UTC.'),
    filter: z.array(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Filter for the export, using Cthulhu Filter Specification. This is an array of 3-element arrays, e.g., ["gt","last_attributed_touch_timestamp", 1604015756]'),
    response_format: z.enum(['json', 'csv']).optional().describe('Format of the response. Defaults to CSV.'),
    allow_multiple_files: z.boolean().optional().describe('Set to true to return more than 15 million records, split into multiple files.'),
    response_format_compression: z.enum(['gz', 'snappy']).optional().describe('The file compression method to use for the data. Required if allow_multiple_files is true.')
  });

  const createCustomExportSchema = createCustomExportInputSchema.merge(apiKeySchema).merge(appIdOrOrgIdInput);

  server.registerTool(
    'branch_create_custom_export',
    {
      description: 'Request a custom data export job.',
      inputSchema: createCustomExportSchema.shape,
      outputSchema: z.object({ request_handle: z.string(), export_job_status_url: z.string() }).shape
    },
    async (params: z.infer<typeof createCustomExportSchema>) => {
      logger.debug('Executing tool: branch_create_custom_export with params:', params);
      const { api_key, ...rest } = params;
      if (!api_key) {
        throw new Error('Branch API Key must be provided in tool parameters.');
      }
      const { app_id, organization_id } = appIdOrOrgIdValidator.parse(rest);

      const queryParams: Record<string, string> = {};
      if (app_id) {
        queryParams.app_id = app_id;
      }
      if (organization_id) {
        queryParams.organization_id = organization_id;
      }

      const { start_date, end_date, report_type, fields, ...optionalParams } = rest;
      const requestBody = { start_date, end_date, report_type, fields, ...optionalParams };

      try {
        const url = `${getBranchBaseUrl(config)}/v2/logs`;
        const response = await axios.post(url, requestBody, {
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
        throw new BranchApiError(`Error creating custom export: ${getErrorMessage(error)}`);
      }
    }
  );

  // Get Export Status (V2)
  const getCustomExportStatusSchema = z.object({
    request_handle: z.string().describe('The unique request handle ID returned by the create custom export request.'),
    limit: z.number().optional().describe('The maximum number of results to return.'),
    format: z.enum(['json', 'csv']).optional().describe('Format of returned data (json or csv).')
  });

  const getExportStatusSchema = getCustomExportStatusSchema.merge(apiKeySchema).merge(appIdOrOrgIdInput);

  server.registerTool(
    'branch_get_export_status',
    {
      description: 'Get the status of a custom data export job.',
      inputSchema: getExportStatusSchema.shape,
      outputSchema: z.object({}).passthrough().shape
    },
    async (params: z.infer<typeof getExportStatusSchema>) => {
      logger.debug('Executing tool: branch_get_export_status with params:', params);
      const { api_key, request_handle, ...rest } = params;
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
        const url = `${getBranchBaseUrl(config)}/v2/logs/${request_handle}`;
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
        throw new BranchApiError(`Error getting export status: ${getErrorMessage(error)}`);
      }
    }
  );

  // Check Data Readiness (V2)
  const checkDataReadinessSchema = z.object({
    date: z.string().describe('The start of the interval time range, in the format YYYY-MM-DD hh:mm:ss.'),
    warehouse_meta_type: z.enum(['EVENT', 'AGGREGATE']).describe('The type of data to check for.'),
    topic: z.string().describe('The Branch EO topic to be exported.')
  });

  const checkDataReadinessInputSchema = checkDataReadinessSchema
    .merge(apiKeySchema)
    .merge(z.object({ app_id: z.string().describe('The app ID to check data readiness for.') }));

  server.registerTool(
    'branch_check_data_readiness',
    {
      description: 'Check if data is ready for export for a given time.',
      inputSchema: checkDataReadinessInputSchema.shape,
      outputSchema: z.object({ data_ready: z.boolean(), date: z.string() }).shape
    },
    async (params: z.infer<typeof checkDataReadinessInputSchema>) => {
      logger.debug('Executing tool: branch_check_data_readiness with params:', params);
      const { api_key, app_id, date, warehouse_meta_type, topic } = params;

      if (!api_key) {
        throw new Error('Branch API Key must be provided in tool parameters.');
      }

      try {
        const url = `${getBranchBaseUrl(config)}/v2/data/ready`;
        const requestBody = { date, warehouse_meta_type, topic, app_id };

        const response = await axios.post(url, requestBody, {
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
        throw new BranchApiError(`Error checking data readiness: ${getErrorMessage(error)}`);
      }
    }
  );
}