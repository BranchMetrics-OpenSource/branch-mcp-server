import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BranchMcpConfig } from '../config.js';
import { z } from 'zod';
import axios from 'axios';
import { getBranchBaseUrl, MCP_USER_AGENT } from '../utils/api.js';
import { apiKeySchema, appIdOrOrgIdInput, appIdOrOrgIdValidator } from '../schemas/auth.js';
import { BranchApiError, getErrorMessage } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { createTable } from '../utils/tables.js';
import {
  crossEventExportDimensions,
  crossEventExportDataSources
} from './cross-event-exports-data.js';

const crossEventExportDimensionsEnum = z.enum(Object.keys(crossEventExportDimensions) as [string, ...string[]]);
const crossEventExportDimensionsTable = createTable(crossEventExportDimensions);

const crossEventExportDataSourcesEnum = z.enum(Object.keys(crossEventExportDataSources) as [string, ...string[]]);
const crossEventExportDataSourcesTable = createTable(crossEventExportDataSources);

const granularityOptions = {
  'day': 'Granularity by day.',
  'week': 'Granularity by week.',
  'month': 'Granularity by month.',
  'all': 'No time granularity, aggregates over the entire date range.'
} as const;
const granularityEnum = z.enum(Object.keys(granularityOptions) as [string, ...string[]]);
const granularityTable = createTable(granularityOptions);

const aggregationMappings = {
  'eo_install, eo_install_blocked, eo_impression, eo_impression_blocked, eo_click, eo_click_blocked': [
    'total_count', 'sketch_unique_count', 'cost', 'cost_in_local_currency', 'cost_in_app_local_currency'
  ],
  'eo_reinstall, eo_reinstall_blocked, eo_open, eo_open_blocked, eo_web_session_start, eo_web_session_start_blocked, eo_pageview, eo_pageview_blocked, eo_dismissal, eo_dismissal_blocked, eo_content_event, eo_content_event_blocked, eo_user_lifecycle_event, eo_user_lifecycle_event_blocked, eo_custom_event, eo_custom_event_blocked, eo_branch_cta_view, eo_branch_cta_view_blocked, xx_impression, xx_click': [
    'total_count', 'sketch_unique_count'
  ],
  'eo_commerce_event, eo_commerce_event_blocked': [
    'total_count', 'sketch_unique_count', 'revenue', 'revenue_in_local_currency'
  ],
  'link, skadnetwork_valid_messages, skadnetwork_invalid_messages': [
    'total_count'
  ],
  'cost, cost_actions, cost_clicks, cost_installs, cost_impressions': [
    'cost', 'cost_in_local_currency', 'cost_in_app_local_currency'
  ],
  'skan_unified_view': [
    'skan_count', 'skan_revenue', 'non_skan_revenue', 'unified_revenue', 'non_skan_total_count', 'unified_total_count', 'non_skan_unique_count', 'unified_unique_count'
  ]
};

const createAggregationTable = (data: Record<string, string[]>) => `| Data Source(s) | Valid Aggregation Fields |\n|---|---|\n${Object.entries(data).map(([key, value]) => `| ${key.split(', ').map((k) => `\`${k}\``).join(', ')} | ${value.map((v) => `\`${v}\``).join(', ')} |`).join('\n')}`;
const crossEventExportAggregationsTable = createAggregationTable(aggregationMappings);



const aggregationSchema = z.object({
  field_name: z.string().describe('The field name to aggregate. The valid values depend on the selected \'data_source\'. Please see the mapping in the parent aggregations description.'),
  display_name: z.string().describe('The display name for the aggregated field.'),
  data_source: crossEventExportDataSourcesEnum.describe(`The data source for the aggregation. Available data sources:\n${crossEventExportDataSourcesTable}`),
  filter: z.record(z.unknown()).optional().describe('A JSON object representing one or more filters, applicable to only this aggregation.'),
  start_date_override: z.string().optional().describe('Override the global start_date set at the root level if this aggregation requires a specific date range.')
});

const sortColumnSchema = z.object({
  ascending_order: z.boolean().optional().describe('Whether to return the rows in ascending order. Defaults to true.'),
  column_to_sort: z.string().describe('The column name to sort by. This can be a dimension or a display name from an aggregation.')
});

const limitSortSpecSchema = z.object({
  sort_columns: z.array(sortColumnSchema).optional().describe('An array of sort column objects.'),
  limit: z.number().optional().describe('The maximum number of rows to return.'),
  aggregations: z.array(aggregationSchema).optional().describe('An array of aggregation objects to apply sorting and limiting to.')
});

/**
 * Registers Cross-Event Exports API tools with the MCP server.
 * This includes tools for creating and checking the status of cross-event data exports.
 * @see https://help.branch.io/developers-hub/reference/cross-events-export-api
 * @param server The MCP server instance.
 * @param config The Branch MCP configuration.
 */
export function registerCrossEventExportsTools(server: McpServer, config: BranchMcpConfig) {
  const createExportSchema = z.object({
    start_date: z.string().describe('The start of the interval time range represented as an ISO-8601 complete date.'),
    end_date: z.string().describe('The end of the interval time range represented as an ISO-8601 complete date.'),
    dimensions: z.array(crossEventExportDimensionsEnum).optional().describe(`An array of dimensions to group by. Available dimensions:\n${crossEventExportDimensionsTable}`),
    filter: z.record(z.unknown()).optional().describe('A JSON object representing one or more filters. This is a global filter and will be applied to all aggregations.'),
    granularity: granularityEnum.optional().describe(`Granularity level. Setting a day, week, or month will automatically add a \`date_range\` dimension. Defaults to \`all\`.\n${granularityTable}`),
    limit_sort_spec: limitSortSpecSchema.optional().describe('Special object for sorting and limiting results.'),
    aggregations: z.array(aggregationSchema).optional().describe(`An array of aggregation objects. The valid field_name values are dependent on the data_source provided. Here is the mapping:\n${crossEventExportAggregationsTable}`)
  });

  const createCrossEventExportSchema = createExportSchema.merge(apiKeySchema).merge(appIdOrOrgIdInput);
  const getStatusSchema = z.object({ job_id: z.string() });
  const getCrossEventExportStatusSchema = getStatusSchema.merge(apiKeySchema).merge(appIdOrOrgIdInput);

  server.registerTool(
    'branch_create_cross_event_export',
    {
      description: 'Request a new Cross-Event data export from Branch.',
      inputSchema: createCrossEventExportSchema.shape,
      outputSchema: z.object({}).passthrough().shape
    },
    async (params: z.infer<typeof createCrossEventExportSchema>) => {
      logger.debug('Executing tool: branch_create_cross_event_export with params:', params);
      const { api_key, app_id, organization_id, ...requestBody } = createCrossEventExportSchema.and(appIdOrOrgIdValidator).parse(params);
      if (!api_key) {
        throw new Error('Branch API Key must be provided in tool parameters.');
      }

      try {
        const url = `${getBranchBaseUrl(config)}/v1/branch_aggregate/async/analytics`;
        const headers = { 'Accept': 'application/json', 'access-token': api_key, 'User-Agent': MCP_USER_AGENT };
        const queryParams = { app_id, organization_id };

        const response = await axios.post(url, requestBody, { headers, params: queryParams });
        return {
          ...response.data,
          _request: { url, headers, queryParams, body: requestBody }
        };
      } catch (error) {
        throw new BranchApiError(`Error creating cross-event export: ${getErrorMessage(error)}`);
      }
    }
  );

  server.registerTool(
    'branch_get_cross_event_export_status',
    {
      description: 'Retrieve the status of a cross-event export job.',
      inputSchema: getCrossEventExportStatusSchema.shape,
      outputSchema: z.object({}).passthrough().shape
    },
    async (params: z.infer<typeof getCrossEventExportStatusSchema>) => {
      logger.debug('Executing tool: branch_get_cross_event_export_status with params:', params);
      const { api_key, app_id, organization_id, job_id } = getCrossEventExportStatusSchema.and(appIdOrOrgIdValidator).parse(params);
      if (!api_key) {
        throw new Error('Branch API Key must be provided in tool parameters.');
      }

      try {
        const url = `${getBranchBaseUrl(config)}/v1/branch_aggregate/async/status/${job_id}`;
        const headers = { 'Accept': 'application/json', 'access-token': api_key, 'User-Agent': MCP_USER_AGENT };
        const queryParams = { app_id, organization_id };

        const response = await axios.get(url, { headers, params: queryParams });
        return {
          ...response.data,
          _request: { url, headers, queryParams }
        };
      } catch (error) {
        throw new BranchApiError(`Error retrieving cross-event export status: ${getErrorMessage(error)}`);
      }
    }
  );
}
