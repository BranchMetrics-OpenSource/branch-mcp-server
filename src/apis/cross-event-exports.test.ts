import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCrossEventExportsTools } from './cross-event-exports.js';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BranchApiError } from '../utils/errors.js';

// Mock McpServer
const mockRegisterTool = jest.fn();
const mockServer = {
  registerTool: mockRegisterTool,
} as unknown as McpServer;

describe('Cross-Event Export API Tools', () => {
  let mock: MockAdapter;
  const config: BranchMcpConfig = {
    branch_key: 'test_key',
    branch_secret: 'test_secret',
    branch_url: 'api.branch.io',
    app_id: 'default_app_id',
    auth_token: 'test_auth_token',
    organization_id: 'default_org_id'
  };
  const baseUrl = `https://${config.branch_url}`;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mockRegisterTool.mockClear();
  });

  afterEach(() => {
    mock.reset();
  });

  it('should register cross-event export tools', () => {
    registerCrossEventExportsTools(mockServer, config);
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_create_cross_event_export', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_get_cross_event_export_status', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledTimes(2);
  });

  describe('branch_create_cross_event_export', () => {
    const url = `${baseUrl}/v1/branch_aggregate/async/analytics`;
    const createParams = {
      api_key: 'test_api_key',
      app_id: '12345',
      start_date: '2023-01-01',
      end_date: '2023-01-31',
    };

    it('should create a cross-event export', async () => {
      registerCrossEventExportsTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_cross_event_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { job_id: 'job123' };
      mock.onPost(url).reply(200, mockResponse);

      const result = await createTool(createParams);

      expect(mock.history.post.length).toBe(1);
      expect(result.job_id).toEqual(mockResponse.job_id);
    });

    it('should throw error if api_key is missing', async () => {
      registerCrossEventExportsTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_cross_event_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      const { api_key, ...params } = createParams;
      await expect(createTool(params)).rejects.toThrow('Branch API Key must be provided in tool parameters.');
    });

    it('should handle API errors', async () => {
      registerCrossEventExportsTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_cross_event_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(500, { message: 'Server Error' });

      await expect(createTool(createParams)).rejects.toThrow(BranchApiError);
    });

    it('should handle generic errors', async () => {
      registerCrossEventExportsTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_cross_event_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).networkError();

      await expect(createTool(createParams)).rejects.toThrow('Error creating cross-event export: Network Error');
    });
  });

  describe('branch_get_cross_event_export_status', () => {
    const jobId = 'job123';
    const url = `${baseUrl}/v1/branch_aggregate/async/status/${jobId}`;
    const getParams = { api_key: 'test_api_key', app_id: '12345', job_id: jobId };

    it('should get cross-event export status', async () => {
      registerCrossEventExportsTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cross_event_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { status: 'completed', url: 'http://example.com/export.csv' };
      mock.onGet(url).reply(200, mockResponse);

      const result = await getTool(getParams);

      expect(mock.history.get.length).toBe(1);
      expect(result.status).toEqual(mockResponse.status);
    });

    it('should throw error if api_key is missing', async () => {
      registerCrossEventExportsTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cross_event_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const { api_key, ...params } = getParams;
      await expect(getTool(params)).rejects.toThrow('Branch API Key must be provided in tool parameters.');
    });

    it('should handle API errors', async () => {
      registerCrossEventExportsTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cross_event_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).reply(404, { message: 'Not Found' });

      await expect(getTool(getParams)).rejects.toThrow(BranchApiError);
    });

    it('should handle generic errors', async () => {
      registerCrossEventExportsTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cross_event_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).networkError();

      await expect(getTool(getParams)).rejects.toThrow('Error retrieving cross-event export status: Network Error');
    });
  });
});
