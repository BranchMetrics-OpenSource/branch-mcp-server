/**
 * @file This file contains utility functions for interacting with the Branch API.
 * It includes helpers for constructing the API base URL and for handling API errors
 * in a standardized way.
 */
import axios from 'axios';

/**
 * The User-Agent string to be sent with all requests to the Branch API.
 * This helps identify traffic coming from this MCP server.
 */
export const MCP_USER_AGENT = 'Branch-MCP-Server/1.0.0';
import type { BranchMcpConfig } from '../config.js';
import { BranchApiError, getErrorMessage } from './errors.js';

/**
 * Creates a base URL for Branch API requests.
 * It uses the `branch_url` from the configuration if available, otherwise it defaults to `api2.branch.io`.
 * @param config The Branch MCP configuration object.
 * @returns The constructed base URL for the Branch API (e.g., `https://api2.branch.io`).
 */
export function getBranchBaseUrl(config: BranchMcpConfig): string {
  const baseUrl = config.branch_url || 'api2.branch.io';
  return `https://${baseUrl}`;
}

/**
 * A general-purpose error handler for Branch API calls made with axios.
 * It checks if the error is an axios error and, if so, wraps it in a `BranchApiError`
 * to provide more context. Otherwise, it wraps the original error.
 * This function never returns; it always throws.
 * @param error The error object caught from a `try...catch` block.
 * @throws {BranchApiError} Always throws a `BranchApiError` with details from the original error.
 */
export function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response) {
    throw new BranchApiError(`Branch API error: ${error.response.status} ${error.response.statusText}`, {
      status: error.response.status,
      response: error.response
    });
  }
  throw new BranchApiError(`Branch API error: ${getErrorMessage(error)}`);
}