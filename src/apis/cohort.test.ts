import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCohortTools } from './cohort.js';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BranchApiError } from '../utils/errors.js';

// Mock McpServer
const mockRegisterTool = jest.fn();
const mockServer = {
  registerTool: mockRegisterTool,
} as unknown as McpServer;

describe('Cohort API Tools', () => {
  let mock: MockAdapter;
  const config: BranchMcpConfig = {
    branch_key: 'test_key',
    branch_secret: 'test_secret',
    branch_url: 'api.branch.io',
    app_id: 'default_app_id',
    auth_token: 'test_auth_token',
    organization_id: 'default_org_id'
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mockRegisterTool.mockClear();
  });

  afterEach(() => {
    mock.reset();
  });

  it('should register branch_create_cohort_export and branch_get_cohort_export_status tools', () => {
    registerCohortTools(mockServer, config);
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_create_cohort_export', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_get_cohort_export_status', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledTimes(2);
  });

  describe('branch_create_cohort_export', () => {
    const url = 'https://api.branch.io/v2/analytics';
    const createParams = {
      api_key: 'test_api_key',
      app_id: '12345',
      start_date: '2023-01-01',
      end_date: '2023-01-31',
      data_source: 'install_cohort',
      measures: ['total_installs'],
      granularity_band_count: 1,
      dimensions: ['campaign']
    };

    it('should create a cohort export', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_cohort_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { job_id: 'job123' };
      mock.onPost(url).reply(200, mockResponse);

      const result = await createTool(createParams);

      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw error if api_key is missing', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_cohort_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      const { api_key, ...params } = createParams;
      await expect(createTool(params)).rejects.toThrow('Branch API Key must be provided in tool parameters.');
    });

    it('should handle API errors', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_cohort_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(500, { message: 'Server Error' });

      await expect(createTool(createParams)).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(500));
    });

    it('should handle generic errors', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_cohort_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).networkError();

      await expect(createTool(createParams)).rejects.toThrow('Error creating cohort export: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_create_cohort_export');
      expect(toolCall).toBeDefined();
      const createTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(() => Promise.reject(new axios.AxiosError('Network Error')));

      await expect(createTool(createParams)).rejects.toThrow('Error creating cohort export: Network Error');
    });
  });

  describe('branch_get_cohort_export_status', () => {
    const jobId = 'job123';
    const url = `https://api.branch.io/v2/analytics/${jobId}`;
    const getParams = { api_key: 'test_api_key', app_id: '12345', job_id: jobId };

    it('should get cohort export status with app_id', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cohort_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { status: 'completed', url: 'http://example.com/export.csv' };
      const expectedUrl = `${url}?app_id=12345`;
      mock.onGet(expectedUrl).reply(200, mockResponse);

      const result = await getTool(getParams);

      expect(mock.history.get[0].url).toBe(expectedUrl);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should get cohort export status with organization_id', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cohort_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { status: 'completed', url: 'http://example.com/export.csv' };
      const { app_id, ...rest } = getParams;
      const orgParams = { ...rest, organization_id: 'org123' };
      const expectedUrl = `${url}?organization_id=org123`;
      mock.onGet(expectedUrl).reply(200, mockResponse);

      const result = await getTool(orgParams);

      expect(mock.history.get[0].url).toBe(expectedUrl);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw error if api_key is missing', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cohort_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const { api_key, ...params } = getParams;
      await expect(getTool(params)).rejects.toThrow('Branch API Key must be provided in tool parameters.');
    });

    it('should handle API errors', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cohort_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).reply(404, { message: 'Not Found' });

      await expect(getTool(getParams)).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(404));
    });

    it('should handle generic errors', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cohort_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const expectedUrl = `${url}?app_id=12345`;
      mock.onGet(expectedUrl).networkError();

      await expect(getTool(getParams)).rejects.toThrow('Error getting cohort export status: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerCohortTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_cohort_export_status');
      expect(toolCall).toBeDefined();
      const getTool = toolCall![2] as (params: any) => Promise<any>;
      const expectedUrl = `${url}?app_id=12345`;
      mock.onGet(expectedUrl).reply(() => Promise.reject(new axios.AxiosError('Network Error')));

      await expect(getTool(getParams)).rejects.toThrow('Error getting cohort export status: Network Error');
    });
  });
});
