import { z } from 'zod';

/**
 * Zod schema for the Branch API Key (Access Token).
 * This key is used for authentication with certain Branch APIs.
 */
export const apiKeySchema = z.object({
  api_key: z.string().optional().describe('Your Branch API Key (Access Token). Overrides server configuration if provided.')
});

/**
 * Zod schema for the Branch Key.
 * This key identifies your Branch app.
 */
export const branchKeySchema = z.object({
  branch_key: z.string().optional().describe('Your Branch Key. Overrides server configuration if provided.')
});

/**
 * Zod schema for the Branch Secret.
 * This secret is used for authentication with your Branch Key.
 */
export const branchSecretSchema = z.object({
  branch_secret: z.string().optional().describe('Your Branch Secret. Overrides server configuration if provided.')
});

/**
 * Zod schema for the Branch App ID.
 * This ID uniquely identifies your app within Branch.
 */
export const appIdSchema = z.object({
  app_id: z.string().optional().describe('The Branch App ID. Falls back to config.')
});

/**
 * Zod schema for the Branch Organization ID.
 * This ID uniquely identifies your organization within Branch.
 */
export const organizationIdSchema = z.object({
  organization_id: z.string().optional().describe('The Branch Organization ID. Falls back to config.')
});

/**
 * Zod schema for the Branch Auth Token.
 * This token is used for sensitive API operations.
 */
export const authTokenSchema = z.object({
  auth_token: z.string().optional().describe('Your Branch Auth Token for sensitive API operations. Overrides server configuration if provided.')
});

/**
 * A simple ZodObject for defining the input shape for tools requiring one of app_id or organization_id.
 * The descriptions inform the agent of the requirement.
 */
export const appIdOrOrgIdInput = z.object({
  app_id: z.string().optional().describe('The Branch App ID. Either this or organization_id is required.'),
  organization_id: z.string().optional().describe('The Branch Organization ID. Either this or app_id is required.')
});

/**
 * A ZodEffects schema that can be used for runtime validation to enforce that one of
 * app_id or organization_id is provided.
 */
export const appIdOrOrgIdValidator = appIdOrOrgIdInput.refine(
  (data) => !!data.app_id || !!data.organization_id,
  { message: 'Either an app_id or an organization_id must be provided.' }
);
