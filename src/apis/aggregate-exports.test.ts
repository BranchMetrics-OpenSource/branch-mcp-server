import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAggregateExportTools } from './aggregate-exports.js';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BranchApiError } from '../utils/errors.js';

// Mock McpServer
const mockRegisterTool = jest.fn();
const mockServer = {
  registerTool: mockRegisterTool,
} as unknown as McpServer;

describe('Aggregate Export API Tools', () => {
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

  it('should register aggregate export tools', () => {
    registerAggregateExportTools(mockServer, config);
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_create_aggregate_export', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_get_aggregate_export_status', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledTimes(2);
  });

  describe('branch_create_aggregate_export', () => {
    const url = `${baseUrl}/v2/analytics`;
    const createParams = {
      api_key: 'test_api_key',
      app_id: '12345',
      start_date: '2023-01-01',
      end_date: '2023-01-31',
      data_source: 'clicks',
      dimensions: ['campaign']
    };

    it('should create an aggregate export', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_aggregate_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { job_id: 'job123' };
      mock.onPost(url).reply(200, mockResponse);

      const result = await createTool(createParams);

      expect(mock.history.post.length).toBe(1);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw error if api_key is missing', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_aggregate_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      const { api_key, ...params } = createParams;
      await expect(createTool(params)).rejects.toThrow('Branch API Key must be provided in tool parameters.');
    });

    it('should handle API errors', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_aggregate_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(500, { message: 'Server Error' });

      await expect(createTool(createParams)).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(500));
    });

    it('should handle generic errors', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_aggregate_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).networkError();

      await expect(createTool(createParams)).rejects.toThrow('Error creating aggregate export: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_aggregate_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(() => Promise.reject(new axios.AxiosError('Network Error')));

      await expect(createTool(createParams)).rejects.toThrow('Error creating aggregate export: Network Error');
    });

    it('should handle optional parameters', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_aggregate_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { job_id: 'job123' };
      mock.onPost(url).reply(200, mockResponse);

      const { app_id: _app_id, ...baseParams } = createParams;
      const fullParams = {
        ...baseParams,
        organization_id: 'org123',
        limit: 100,
        format: 'json',
      };

      await createTool(fullParams);

      expect(mock.history.post[0].params).toEqual({
        organization_id: 'org123',
        limit: 100,
        format: 'json'
      });
    });
  });

  describe('branch_get_aggregate_export_status', () => {
    const jobId = 'job123';
    const url = `${baseUrl}/v2/analytics/${jobId}`;
    const getParams = { api_key: 'test_api_key', app_id: '12345', job_id: jobId };

    it('should get aggregate export status', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_aggregate_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { status: 'completed', url: 'http://example.com/export.csv' };
      mock.onGet(url).reply(200, mockResponse);

      const result = await getTool(getParams);

      expect(mock.history.get.length).toBe(1);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw error if api_key is missing', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_aggregate_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const { api_key, ...params } = getParams;
      await expect(getTool(params)).rejects.toThrow('Branch API Key must be provided in tool parameters.');
    });

    it('should handle API errors', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_aggregate_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).reply(404, { message: 'Not Found' });

      await expect(getTool(getParams)).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(404));
    });

    it('should handle generic errors', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_aggregate_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).networkError();

      await expect(getTool(getParams)).rejects.toThrow('Error getting aggregate export status: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_aggregate_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).reply(() => Promise.reject(new axios.AxiosError('Network Error')));

      await expect(getTool(getParams)).rejects.toThrow('Error getting aggregate export status: Network Error');
    });

    it('should handle optional organization_id parameter', async () => {
      registerAggregateExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_aggregate_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { status: 'completed' };
      mock.onGet(url).reply(200, mockResponse);

      const { app_id: _app_id, ...baseParams } = getParams;
      const orgParams = { ...baseParams, organization_id: 'org456' };

      await getTool(orgParams);

      expect(mock.history.get[0].params).toEqual(expect.objectContaining({ organization_id: 'org456' }));
    });
  });
});
