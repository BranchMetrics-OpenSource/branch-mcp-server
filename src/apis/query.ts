import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BranchMcpConfig } from '../config.js';
import { getBranchBaseUrl, MCP_USER_AGENT, handleApiError } from '../utils/api.js';
import axios from 'axios';
import { getErrorMessage } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { getResolvedAuth } from '../utils/auth.js';
import { branchKeySchema, branchSecretSchema } from '../schemas/auth.js';
import { queryDataSources } from './query-data.js';
import { createTable } from '../utils/tables.js';

/**
 * Registers Query API tools with the MCP server.
 * This includes a powerful tool for querying Branch analytics data with various metrics, dimensions, and filters.
 * @see https://help.branch.io/apidocs/query-api
 * @param server The MCP server instance.
 * @param config The Branch MCP configuration.
 */
export function registerQueryTools(server: McpServer, config: BranchMcpConfig) {

  const querySchema = z.object({
    start_date: z.string().describe("A timestamp representing the oldest date to return data for. Format is an ISO-8601 compliant date-time string, e.g., '2024-01-20'. Timezone is set in your Branch Dashboard."),
    end_date: z.string().describe("A timestamp representing the most recent date to return data for. Cannot be more than 7 days after the start_date. Format is an ISO-8601 compliant date-time string, e.g., '2024-01-27'."),
        data_source: z.enum(Object.keys(queryDataSources) as [string, ...string[]]).describe(`The type of event to query for.\n\n${createTable(queryDataSources)}`),
    aggregation: z.enum(['unique_count', 'total_count', 'revenue', 'cost', 'cost_in_local_currency']).describe("How to count events. 'unique_count' counts each user once. 'total_count' counts all events. Other options: 'revenue', 'cost', 'cost_in_local_currency'."),
    dimensions: z.array(z.string()).describe('List of event fields to group results by (aka breakdowns). See Branch Query API documentation for a full list of available dimensions.'),
    filters: z.record(z.unknown()).optional().describe("Key-value pairs to filter results. Each key must be a valid dimension. Values should be an array of strings. Example: { 'last_attributed_touch_data_tilde_channel': ['Facebook'] }."),
    enable_install_recalculation: z.boolean().optional().describe('Enables deduplication of unattributed installs, providing more accurate measurement, especially from ATT-restricted environments.'),
    granularity: z.enum(['all', 'day']).optional().describe("Time grouping for results. 'day' for daily breakdowns, 'all' for a single aggregate total."),
    limit: z.number().optional().describe('The maximum number of results to return per granularity unit. Default: 100, Max: 1000. For example, with day granularity and a 5-day range, a limit of 1000 could return up to 5000 results.'),
    ordered: z.enum(['ascending', 'descending']).optional().describe("Sort direction for the results, either 'ascending' or 'descending'."),
    ordered_by: z.string().optional().describe('Field to sort results by. Often aligns with your aggregation metric (e.g., total_count) or a selected dimension.'),
    zero_fill: z.boolean().optional().describe('When true, include zero-result rows for dimension combinations without data. Useful for complete breakdowns across a time range.'),
    after: z.number().optional().describe('A pagination parameter that indicates the index of the first result to return in the response. Default: 0.'),
    query_id: z.string().optional().describe('A pagination parameter that locks the last event to include in a query, preventing count changes over time between paged requests.')
  });

  const queryToolSchema = querySchema.merge(branchKeySchema).merge(branchSecretSchema);

  server.tool(
    'branch_query',
    'Query Branch data with metrics, dimensions, and filters.',
    queryToolSchema.shape,
    async (params: z.infer<typeof queryToolSchema>) => {
      logger.debug('Executing tool: branch_query with params:', params);
      const { branch_key, branch_secret } = getResolvedAuth(params, config);
      if (!branch_key || !branch_secret) {
        throw new Error('Branch Key and Secret are not configured. Please provide them in the tool parameters or server configuration.');
      }

      const { limit, after, query_id, ...body } = params;
      const queryParams: Record<string, string | number> = {};
      if (limit) {
        queryParams.limit = limit;
      }
      if (after) {
        queryParams.after = after;
      }
      if (query_id) {
        queryParams.query_id = query_id;
      }

      try {
        const url = `${getBranchBaseUrl(config)}/v1/query/analytics`;
        const response = await axios.post(url, { ...body, branch_key, branch_secret }, {
          params: queryParams,
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': MCP_USER_AGENT }
        });
        return response.data;
      } catch (error) {
        logger.error(`Error in branch_query: ${getErrorMessage(error)}`);
        handleApiError(error);
      }
    }
  );
}
