/**
 * @file This file contains utility functions for resolving Branch authentication credentials.
 * It provides a standardized way to merge credentials provided at runtime with those
 * from the server configuration, ensuring a consistent authentication strategy.
 */
import type { BranchMcpConfig } from '../config.js';

/**
 * Defines the shape of authentication parameters that can be passed into a tool.
 * These parameters correspond to the various keys and tokens required by the Branch API.
 */
interface AuthParams {
  api_key?: string;
  branch_key?: string;
  branch_secret?: string;
  app_id?: string;
  organization_id?: string;
  auth_token?: string;
}

/**
 * Resolves authentication parameters by merging credentials from tool input and server configuration.
 *
 * This function follows a clear priority order for each credential:
 * 1. Use the value provided in the `params` object (i.e., from tool input).
 * 2. If not present in `params`, use the value from the `config` object (server configuration).
 *
 * It also treats `api_key` and `auth_token` as synonyms, resolving them to a single value
 * to simplify downstream usage.
 *
 * @param params The authentication parameters passed to the tool at runtime.
 * @param config The server's static configuration object.
 * @returns An object containing the final, resolved authentication keys to be used for an API call.
 */
export function getResolvedAuth(params: AuthParams, config: BranchMcpConfig) {
  // Prioritize tool params, then config, treating api_key and auth_token as synonyms.
  const resolvedApiKey = params.api_key ?? params.auth_token ?? config.api_key ?? config.auth_token;
  const resolvedAppId = params.app_id ?? config.app_id;
  const resolvedOrgId = params.organization_id ?? config.organization_id;

  return {
    api_key: resolvedApiKey,
    branch_key: params.branch_key ?? config.branch_key,
    branch_secret: params.branch_secret ?? config.branch_secret,
    app_id: resolvedAppId,
    organization_id: resolvedOrgId,
    auth_token: resolvedApiKey // Ensure both return the same resolved value
  };
}
