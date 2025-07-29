import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDataExportTools } from './data-export.js';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BranchApiError } from '../utils/errors.js';

// Mock McpServer
const mockRegisterTool = jest.fn();
const mockServer = {
  registerTool: mockRegisterTool,
} as unknown as McpServer;

describe('Data Export API Tools', () => {
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

  it('should register data export tools', () => {
    registerDataExportTools(mockServer, config);
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_get_daily_exports', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_create_custom_export', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_get_export_status', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_check_data_readiness', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledTimes(4);
  });

  describe('branch_get_daily_exports', () => {
    const url = `${baseUrl}/v3/export`;
    const params = { branch_key: 'key', branch_secret: 'secret', export_date: '2023-01-01' };

    it('should get daily exports', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_daily_exports');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { status: 'success' };
      mock.onPost(url).reply(200, mockResponse);
      const result = await tool(params);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw error if credentials are missing', async () => {
      registerDataExportTools(mockServer, {});
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_daily_exports');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const { branch_key, ...rest } = params;
      await expect(tool(rest)).rejects.toThrow('Branch Key and Secret are not configured.');
    });

    it('should handle Branch API errors', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_daily_exports');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(400, { message: 'Bad Request' });
      await expect(tool(params)).rejects.toThrow(BranchApiError).catch((e: BranchApiError) => expect(e.status).toBe(400));
    });

    it('should handle generic errors', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_daily_exports');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).networkError();
      await expect(tool(params)).rejects.toThrow('Error getting daily exports: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_daily_exports');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(() => Promise.reject(new axios.AxiosError('Network Error')));
      await expect(tool(params)).rejects.toThrow('Error getting daily exports: Network Error');
    });
  });

  describe('branch_create_custom_export', () => {
    const url = `${baseUrl}/v2/logs`;
    const params = { api_key: 'key', app_id: '12345', start_date: '2023-01-01T00:00:00Z', end_date: '2023-01-01T23:59:59Z', report_type: 'eo_click', fields: ['last_attributed_touch_data_tilde_campaign'] };

    it('should create a custom export', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_custom_export');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { request_handle: 'handle' };
      mock.onPost(url).reply(200, mockResponse);
      const result = await tool(params);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw error if api_key is missing', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_custom_export');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const { api_key, ...rest } = params;
      await expect(tool(rest)).rejects.toThrow('Branch API Key must be provided in tool parameters.');
    });

    it('should create a custom export using organization_id', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_custom_export');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const { app_id, ...rest } = params;
      const orgParams = { ...rest, organization_id: 'org_123' };
      const mockResponse = { request_handle: 'handle_org' };
      mock.onPost(url).reply(200, mockResponse);
      const result = await tool(orgParams);
      expect(result.structuredContent).toEqual(mockResponse);
      expect(mock.history.post[0].params).toEqual({ organization_id: 'org_123' });
    });

    it('should handle Branch API errors', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_custom_export');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(500, { message: 'Server Error' });
      await expect(tool(params)).rejects.toThrow(BranchApiError).catch((e: BranchApiError) => expect(e.status).toBe(500));
    });

    it('should handle generic errors', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_custom_export');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).networkError();
      await expect(tool(params)).rejects.toThrow('Error creating custom export: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_custom_export');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(() => Promise.reject(new axios.AxiosError('Network Error')));
      await expect(tool(params)).rejects.toThrow('Error creating custom export: Network Error');
    });
  });

  describe('branch_get_export_status', () => {
    const handle = 'handle';
    const url = `${baseUrl}/v2/logs/${handle}`;
    const params = { api_key: 'key', app_id: '12345', request_handle: handle };

    it('should get export status', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_export_status');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { status: 'completed' };
      mock.onGet(url).reply(200, mockResponse);
      const result = await tool(params);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw error if api_key is missing', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_export_status');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const { api_key, ...rest } = params;
      await expect(tool(rest)).rejects.toThrow('Branch API Key must be provided in tool parameters.');
    });

    it('should get export status using organization_id', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_export_status');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const { app_id, ...rest } = params;
      const orgParams = { ...rest, organization_id: 'org_123', limit: 100, format: 'csv' };
      const mockResponse = { status: 'running' };
      mock.onGet(url).reply(200, mockResponse);
      const result = await tool(orgParams);
      expect(result.structuredContent).toEqual(mockResponse);
      expect(mock.history.get[0].params).toEqual({ organization_id: 'org_123', limit: 100, format: 'csv' });
    });

    it('should handle Branch API errors', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_export_status');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).reply(404, { message: 'Not Found' });
      await expect(tool(params)).rejects.toThrow(BranchApiError).catch((e: BranchApiError) => expect(e.status).toBe(404));
    });

    it('should handle generic errors', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_export_status');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).networkError();
      await expect(tool(params)).rejects.toThrow('Error getting export status: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_export_status');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).reply(() => Promise.reject(new axios.AxiosError('Network Error')));
      await expect(tool(params)).rejects.toThrow('Error getting export status: Network Error');
    });
  });

  describe('branch_check_data_readiness', () => {
    const url = `${baseUrl}/v2/data/ready`;
    const params = { api_key: 'key', app_id: '123', date: '2023-01-01 00:00:00', warehouse_meta_type: 'EVENT', topic: 'eo_click' };

    it('should check data readiness', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_check_data_readiness');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { data_ready: true };
      mock.onPost(url).reply(200, mockResponse);
      const result = await tool(params);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw error if api_key is missing', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_check_data_readiness');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      const { api_key, ...rest } = params;
      await expect(tool(rest)).rejects.toThrow('Branch API Key must be provided in tool parameters.');
    });

    it('should handle Branch API errors', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_check_data_readiness');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(401, { message: 'Unauthorized' });
      await expect(tool(params)).rejects.toThrow(BranchApiError).catch((e: BranchApiError) => expect(e.status).toBe(401));
    });

    it('should handle generic errors', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_check_data_readiness');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).networkError();
      await expect(tool(params)).rejects.toThrow('Error checking data readiness: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerDataExportTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_check_data_readiness');
      expect(toolCall).toBeDefined();
      const tool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(() => Promise.reject(new axios.AxiosError('Network Error')));
      await expect(tool(params)).rejects.toThrow('Error checking data readiness: Network Error');
    });
  });
});
