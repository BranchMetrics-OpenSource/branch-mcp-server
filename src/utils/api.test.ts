import axios, { AxiosError } from 'axios';
import { getBranchBaseUrl, handleApiError, MCP_USER_AGENT } from './api.js';
import { BranchApiError } from './errors.js';
import type { BranchMcpConfig } from '../config.js';

// Test for the constant
describe('MCP_USER_AGENT', () => {
  it('should be defined correctly', () => {
    expect(MCP_USER_AGENT).toBe('Branch-MCP-Server/1.0.0');
  });
});

describe('getBranchBaseUrl', () => {
  it('should return the default base URL if not provided in config', () => {
    const config: BranchMcpConfig = {};
    expect(getBranchBaseUrl(config)).toBe('https://api2.branch.io');
  });

  it('should return the base URL from config if provided', () => {
    const config: BranchMcpConfig = { branch_url: 'custom.api.branch.io' };
    expect(getBranchBaseUrl(config)).toBe('https://custom.api.branch.io');
  });
});

describe('handleApiError', () => {
  it('should throw a BranchApiError for Axios errors with a response', () => {
    // Mock AxiosError
    const mockError = new AxiosError(
      'Request failed with status code 404',
      '404',
      undefined,
      null,
      {
        data: { error: 'details' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: {} as any },
      }
    );

    expect(() => handleApiError(mockError)).toThrow(
      new BranchApiError('Branch API error: 404 Not Found', {
        status: 404,
        response: mockError.response,
      })
    );
  });

  it('should throw a BranchApiError for non-Axios errors', () => {
    const genericError = new Error('Something went wrong');
    expect(() => handleApiError(genericError)).toThrow('Branch API error: Something went wrong');
  });

  it('should throw a BranchApiError for string errors', () => {
    const stringError = 'A string error';
    expect(() => handleApiError(stringError)).toThrow('Branch API error: A string error');
  });

  it('should throw a BranchApiError with a generic message for unknown errors', () => {
    const unknownError = { some: 'object' };
    expect(() => handleApiError(unknownError)).toThrow('Branch API error: Unknown error occurred');
  });
});
