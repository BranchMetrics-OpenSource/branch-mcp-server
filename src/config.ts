/**
 * @file This file defines the configuration structure for the Branch MCP Server.
 * It includes the `BranchMcpConfig` interface, which specifies the shape of the
 * configuration object, and `DEFAULT_CONFIG`, which provides default values for
 * certain properties.
 */

/**
 * Defines the structure for the Branch MCP server's configuration object.
 * This interface includes all possible credentials and settings that can be used
 * to interact with the various Branch APIs.
 */
export interface BranchMcpConfig {
  /**
   * The Branch API key required for authentication
   */
  branch_key?: string;

  /**
   * Optional Branch API URL, defaults to api2.branch.io
   */
  branch_url?: string;

  /**
   * Optional Branch API secret
   */
  branch_secret?: string;

  /**
   * Optional Branch Access Token for v2 APIs
   */
  api_key?: string;

  /**
   * Optional Branch App ID
   */
  app_id?: string;

  /**
   * Optional Branch Organization ID
   */
  organization_id?: string;

  /**
   * Optional Branch Auth Token for sensitive API operations
   */
  auth_token?: string;
}

/**
 * Provides default values for the server configuration.
 * This ensures that essential settings, like the Branch API URL, have a fallback
 * value if not explicitly provided in the environment.
 */
export const DEFAULT_CONFIG: Partial<BranchMcpConfig> = {
  branch_url: 'api2.branch.io'
};