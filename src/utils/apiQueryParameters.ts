/**
 * @file This file contains a utility for constructing API query parameters.
 * It standardizes how `app_id` and `organization_id` are resolved from either
 * tool input or the server configuration.
 */
import type { BranchMcpConfig } from '../config.js';

/**
 * Constructs a query parameters object for Branch API requests, prioritizing `app_id`
 * over `organization_id`.
 *
 * The resolution logic is as follows:
 * 1. Use `app_id` from the `params` object if available.
 * 2. If not, use `app_id` from the `config` object if available.
 * 3. If an `app_id` is found, return immediately with only that parameter.
 * 4. If no `app_id` is found, use `organization_id` from `params` if available.
 * 5. If not, use `organization_id` from `config` if available.
 *
 * @param params An object potentially containing `app_id` or `organization_id` from tool input.
 * @param config The Branch MCP server configuration, which may contain fallback credentials.
 * @returns A record of query parameters to be used in an API request.
 */
export function getApiQueryParams(params: { app_id?: string; organization_id?: string }, config: BranchMcpConfig) {
  const queryParams: Record<string, string> = {};
  if (params.app_id) {
    queryParams.app_id = params.app_id;
  } else if (config.app_id) {
    queryParams.app_id = config.app_id;
  }

  if (queryParams.app_id) {
    return queryParams;
  }

  if (params.organization_id) {
    queryParams.organization_id = params.organization_id;
  } else if (config.organization_id) {
    queryParams.organization_id = config.organization_id;
  }

  return queryParams;
}
