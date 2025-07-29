/**
 * @file This file defines custom error types and utility functions for robust error handling.
 * It provides a specialized `BranchApiError` class for API-specific issues and includes
 * type guards and helpers to safely extract error messages from unknown sources.
 */

/**
 * Custom error class for Branch API errors.
 * This class extends the standard `Error` and adds optional properties to hold
 * details from an HTTP response, such as the status code and response body.
 * This allows for more structured and informative error handling when interacting
 * with the Branch API.
 */
export class BranchApiError extends Error {
  status?: number;
  response?: {
    data?: unknown;
    status?: number;
    statusText?: string;
  };

  constructor(message: string, options?: {
    status?: number;
    response?: {
      data?: unknown;
      status?: number;
      statusText?: string;
    };
    cause?: Error;
  }) {
    super(message);
    this.name = 'BranchApiError';
    this.status = options?.status;
    this.response = options?.response;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BranchApiError);
    }
  }
}

/**
 * Type guard to check if an error is an instance of `BranchApiError`.
 * This allows for safely accessing the custom properties of `BranchApiError` in
 * `catch` blocks.
 * @param error The unknown error to check.
 * @returns `true` if the error is an instance of `BranchApiError`, otherwise `false`.
 */
export function isBranchApiError(error: unknown): error is BranchApiError {
  return error instanceof BranchApiError;
}

/**
 * A generic interface for error-like objects that have a `message` property.
 * This is useful for creating type guards that can handle a wider range of
 * error shapes beyond the standard `Error` class.
 */
export interface ErrorWithMessage {
  message: string;
  [key: string]: unknown;
}

/**
 * Type guard to check if an unknown error is an object with a string `message` property.
 * This provides a safe way to access the `message` property on objects that may not
 * be instances of the `Error` class.
 * @param error The unknown error to check.
 * @returns `true` if the error is an object with a `message` property, otherwise `false`.
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Safely extracts an error message from an `unknown` value.
 * It handles various types of errors, including `Error` instances, objects with a
 * `message` property, and plain strings. If the error type is unrecognized, it returns
 * a generic default message.
 * @param error The unknown error from which to extract a message.
 * @returns The extracted error message as a string.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}