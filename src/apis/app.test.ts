import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTools } from './app.js';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BranchApiError } from '../utils/errors.js';

// Mock McpServer
const mockRegisterTool = jest.fn();
const mockServer = {
  registerTool: mockRegisterTool,
} as unknown as McpServer;

describe('App API Tools', () => {
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

  it('should register branch_get_app_settings and branch_update_app_settings tools', () => {
    registerAppTools(mockServer, config);
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_get_app_settings', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_update_app_settings', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledTimes(2);
  });

  describe('branch_get_app_settings', () => {
    it('should call the Branch API and return app settings', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_app_settings');
      expect(toolCall).toBeDefined();
      const getAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { app_name: 'Test App' };
      mock.onGet('https://api.branch.io/v1/app/test_key').reply(200, mockResponse);

      const result = await getAppSettingsTool({ branch_key: 'test_key', branch_secret: 'test_secret' });

      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw an error if branch_key or branch_secret are missing', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_app_settings');
      expect(toolCall).toBeDefined();
      const getAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;

      // When branch_key is missing, it results in a 404 from the API call to /v1/app/undefined
      mock.onGet('https://api.branch.io/v1/app/undefined').reply(404);

      await expect(getAppSettingsTool({})).rejects.toThrow(BranchApiError);
      await expect(getAppSettingsTool({ branch_key: 'test_key' })).rejects.toThrow(BranchApiError);
      await expect(getAppSettingsTool({ branch_secret: 'test_secret' })).rejects.toThrow(BranchApiError);
    });

    it('should handle Branch API errors', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_app_settings');
      expect(toolCall).toBeDefined();
      const getAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet('https://api.branch.io/v1/app/test_key').reply(401, { message: 'Unauthorized' });

      await expect(getAppSettingsTool({ branch_key: 'test_key', branch_secret: 'test_secret' })).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(401));
    });

    it('should handle generic errors', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_app_settings');
      expect(toolCall).toBeDefined();
      const getAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet('https://api.branch.io/v1/app/test_key').networkError();

      await expect(getAppSettingsTool({ branch_key: 'test_key', branch_secret: 'test_secret' })).rejects.toThrow('Error getting app settings: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_app_settings');
      expect(toolCall).toBeDefined();
      const getAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onGet('https://api.branch.io/v1/app/test_key').reply(() => {
        const error = new axios.AxiosError('Network Error');
        error.response = undefined;
        return Promise.reject(error);
      });

      await expect(getAppSettingsTool({ branch_key: 'test_key', branch_secret: 'test_secret' })).rejects.toThrow('Error getting app settings: Network Error');
    });

    it('should use the default branch_url if not provided in config', async () => {
      const configWithoutUrl: BranchMcpConfig = {
        branch_key: 'test_key',
        branch_secret: 'test_secret',
        app_id: 'default_app_id',
        auth_token: '',
        organization_id: ''
      };
      registerAppTools(mockServer, configWithoutUrl);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_get_app_settings');
      expect(toolCall).toBeDefined();
      const getAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { app_name: 'Test App' };
      mock.onGet('https://api2.branch.io/v1/app/test_key').reply(200, mockResponse);

      await getAppSettingsTool({ branch_key: 'test_key', branch_secret: 'test_secret' });

      expect(mock.history.get.length).toBe(1);
      expect(mock.history.get[0].url).toBe('https://api2.branch.io/v1/app/test_key');
    });
  });

  describe('branch_update_app_settings', () => {
    const updateParams = { branch_key: 'test_key', branch_secret: 'test_secret', app_name: 'Updated App' };

    it('should call the Branch API and update app settings', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_app_settings');
      expect(toolCall).toBeDefined();
      const updateAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;
      const mockResponse = { app_name: 'Updated App' };
      mock.onPut('https://api.branch.io/v1/app/test_key').reply(200, mockResponse);

      const result = await updateAppSettingsTool(updateParams);

      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw an error if branch_key or branch_secret are missing', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_app_settings');
      expect(toolCall).toBeDefined();
      const updateAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;

      // When branch_key is missing, it results in a 404 from the API call to /v1/app/undefined
      mock.onPut('https://api.branch.io/v1/app/undefined').reply(404);

      await expect(updateAppSettingsTool({ app_name: 'Test' })).rejects.toThrow(BranchApiError);
    });

    it('should handle Branch API errors', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_app_settings');
      expect(toolCall).toBeDefined();
      const updateAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPut('https://api.branch.io/v1/app/test_key').reply(400, { message: 'Bad Request' });

      await expect(updateAppSettingsTool(updateParams)).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(400));
    });

    it('should handle generic errors', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_app_settings');
      expect(toolCall).toBeDefined();
      const updateAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPut('https://api.branch.io/v1/app/test_key').networkError();

      await expect(updateAppSettingsTool(updateParams)).rejects.toThrow('Error updating app settings: Network Error');
    });

    it('should handle Axios errors without a response', async () => {
      registerAppTools(mockServer, config);
      const toolCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_app_settings');
      expect(toolCall).toBeDefined();
      const updateAppSettingsTool = toolCall![2] as (params: any) => Promise<any>;
      mock.onPut('https://api.branch.io/v1/app/test_key').reply(() => {
        const error = new axios.AxiosError('Network Error');
        error.response = undefined;
        return Promise.reject(error);
      });

      await expect(updateAppSettingsTool(updateParams)).rejects.toThrow('Error updating app settings: Network Error');
    });
  });
});
