import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BranchMcpConfig } from '../config.js';
import { getBranchBaseUrl, MCP_USER_AGENT } from '../utils/api.js';
import axios from 'axios';
import { BranchApiError, getErrorMessage } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { createTable } from '../utils/tables.js';
import { apiKeySchema, appIdOrOrgIdInput, appIdOrOrgIdValidator } from '../schemas/auth.js';
import {
  cohortMeasures,
  installCohortDimensions,
  reengagementCohortDimensions,
  userDimensions,
  otherDimensions
} from './cohort-data.js';

const cohortDataSources = {
  'install_cohort': 'Analyze performance by acquisition date (app install only).',
  'reengagement_cohort': 'Analyze by re-engagement date (web and app sessions).'
} as const;

const cohortDataSourceEnum = z.enum(Object.keys(cohortDataSources) as [keyof typeof cohortDataSources, ...(keyof typeof cohortDataSources)[]]);
const cohortMeasuresEnum = z.enum(Object.keys(cohortMeasures) as [string, ...string[]]);
const cohortDimensionsEnum = z.enum([
  ...Object.keys(installCohortDimensions),
  ...Object.keys(reengagementCohortDimensions),
  ...Object.keys(userDimensions),
  ...Object.keys(otherDimensions)
] as [string, ...string[]]);

const measuresTable = createTable(cohortMeasures);
const installDimensionsTable = createTable(installCohortDimensions);
const reengagementDimensionsTable = createTable(reengagementCohortDimensions);
const userDimensionsTable = createTable(userDimensions);
const otherDimensionsTable = createTable(otherDimensions);

/**
 * Registers Cohort API tools with the MCP server.
 * This includes tools for creating and checking the status of cohort data exports.
 * @see https://help.branch.io/developers-hub/reference/cohort-api
 * @param server The MCP server instance.
 * @param config The Branch MCP configuration.
 */
export function registerCohortTools(server: McpServer, config: BranchMcpConfig) {
  const getStatusSchema = z.object({
    job_id: z.string().describe('The job ID returned from the create cohort export request.')
  });

  const createCohortSchema = z.object({
    start_date: z.string().describe('The start of the interval time range, represented as an ISO-8601 complete date (e.g., 2021-12-12).'),
    end_date: z.string().describe('The end of the interval time range, represented as an ISO-8601 complete date (e.g., 2021-12-18).'),
    data_source: cohortDataSourceEnum.describe(`The cohort type. The available types are:\n${Object.entries(cohortDataSources).map(([key, value]) => `- '${key}': ${value}`).join('\n')}`),
    measures: z.array(cohortMeasuresEnum).describe(`The cohort measures names to return (limit 3). Supported measures are:\n${measuresTable}`),
    granularity_band_count: z.number().int().describe('Number of time units since the cohort event to return to the user.'),
    dimensions: z.array(cohortDimensionsEnum).describe(`An array of dimensions to group by (limit 11). The available dimensions depend on the selected 'data_source'.\n\n**Install Cohort Dimensions:**\n${installDimensionsTable}\n\n**Reengagement Cohort Dimensions:**\n${reengagementDimensionsTable}\n\n**User Dimensions:**\n${userDimensionsTable}\n\n**Other Dimensions:**\n${otherDimensionsTable}`),
    filters: z.record(z.unknown()).optional().describe('An object defining filters to match on dimensions. Keys are dimension names, and values are arrays of strings to match.'),
    ordered: z.enum(['ascending', 'descending']).optional().describe('Order of response, based on ordered_by value. Defaults to "descending".'),
    ordered_by: cohortDimensionsEnum.optional().describe('The dimension name used for sorting. Must be one of the dimensions listed above.'),
    cumulative: z.boolean().optional().describe('If true, sum across bands so that a given band value is the sum of all preceding values, plus the band value. Defaults to false.'),
    per_user: z.boolean().optional().describe('If true, divide each band value by the user count. Defaults to false.'),
    granularity: z.string().optional().describe('The time granularity that each band value will represent. Defaults to "day".'),
    enable_install_recalculation: z.boolean().optional().describe('If true, Branch will de-dupe unattributed installs caused by duplicate events from non-opt-in users coming from paid ads.'),
    limit: z.number().optional().describe('The maximum number of results to return. Default: 100, Min: 1, Max: 50000.'),
    format: z.string().optional().describe('Format of returned data. Defaults to CSV.')
  });

  const createCohortExportSchema = createCohortSchema.merge(apiKeySchema).merge(appIdOrOrgIdInput);
  const getCohortExportStatusSchema = getStatusSchema.merge(apiKeySchema).merge(appIdOrOrgIdInput);

  server.registerTool(
    'branch_create_cohort_export',
    {
      description: 'Request a new cohort data export.',
      inputSchema: createCohortExportSchema.shape,
      outputSchema: z.object({ job_id: z.string() }).passthrough().shape
    },
    async (params: z.infer<typeof createCohortExportSchema>) => {
      logger.debug('Executing tool: branch_create_cohort_export with params:', params);
      const { api_key, ...rest } = params;
      if (!api_key) {
        throw new Error('Branch API Key must be provided in tool parameters.');
      }
      const { app_id, organization_id } = appIdOrOrgIdValidator.parse(rest);
      const { limit, format, ...bodyParams } = rest;

      try {
        const url = `${getBranchBaseUrl(config)}/v2/analytics`;
        const queryParams = { app_id, organization_id, limit, format };
        const headers = { 'Content-Type': 'application/json', 'access-token': api_key, 'Accept': 'application/json', 'User-Agent': MCP_USER_AGENT };
        const response = await axios.post(url, bodyParams, { params: queryParams, headers });

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
        throw new BranchApiError(`Error creating cohort export: ${getErrorMessage(error)}`);
      }
    }
  );

  server.registerTool(
    'branch_get_cohort_export_status',
    {
      description: 'Get the status of a cohort data export job.',
      inputSchema: getCohortExportStatusSchema.shape,
      outputSchema: z.object({}).passthrough().shape
    },
    async (params: z.infer<typeof getCohortExportStatusSchema>) => {
      logger.debug('Executing tool: branch_get_cohort_export_status with params:', params);
      const { api_key, job_id, ...rest } = params;
      if (!api_key) {
        throw new Error('Branch API Key must be provided in tool parameters.');
      }
      const { app_id, organization_id } = appIdOrOrgIdValidator.parse(rest);

      try {
        const url = new URL(`${getBranchBaseUrl(config)}/v2/analytics/${job_id}`);
        if (app_id) {
          url.searchParams.append('app_id', app_id);
        }
        if (organization_id) {
          url.searchParams.append('organization_id', organization_id);
        }

        const headers = { 'Content-Type': 'application/json', 'access-token': api_key, 'Accept': 'application/json', 'User-Agent': MCP_USER_AGENT };
        const response = await axios.get(url.toString(), { headers });

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
        throw new BranchApiError(`Error getting cohort export status: ${getErrorMessage(error)}`);
      }
    }
  );
}
