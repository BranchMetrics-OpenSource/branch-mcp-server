import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerQueryTools } from './query.js';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Mock McpServer
const mockTool = jest.fn();
const mockServer = {
  tool: mockTool,
} as unknown as McpServer;

describe('Query API Tools', () => {
  let mock: MockAdapter;
  const config: BranchMcpConfig = {
    branch_key: 'test_key',
    branch_secret: 'test_secret',
    branch_url: 'api.branch.io',
    app_id: '12345',
    auth_token: 'test_auth_token',
    organization_id: 'test_org_id'
  };
  const baseUrl = `https://${config.branch_url}`;

  const requiredParams = {
    start_date: '2024-01-20',
    end_date: '2024-01-27',
    data_source: 'CUSTOM_EVENT',
    aggregation: 'total_count',
    dimensions: ['last_attributed_touch_data_tilde_channel']
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mockTool.mockClear();
  });

  afterEach(() => {
    mock.reset();
  });

  it('should register query tools', () => {
    registerQueryTools(mockServer, config);
    expect(mockTool).toHaveBeenCalledWith('branch_query', expect.any(String), expect.any(Object), expect.any(Function));
  });

  describe('branch_query', () => {
    const url = `${baseUrl}/v1/query/analytics`;

    it('should query data successfully', async () => {
      registerQueryTools(mockServer, config);
      const toolCall = mockTool.mock.calls.find(call => call[0] === 'branch_query');
      expect(toolCall).toBeDefined();
      const tool = toolCall![3] as (params: any) => Promise<any>;
      const params = { ...requiredParams, branch_key: 'key', branch_secret: 'secret' };
      const mockResponse = { results: [] };
      mock.onPost(url).reply(200, mockResponse);
      const result = await tool(params);
      expect(result).toEqual(mockResponse);
      expect(mock.history.post[0].params).toEqual({});
    });

    it('should handle query parameters correctly', async () => {
      registerQueryTools(mockServer, config);
      const toolCall = mockTool.mock.calls.find(call => call[0] === 'branch_query');
      expect(toolCall).toBeDefined();
      const tool = toolCall![3] as (params: any) => Promise<any>;
      const params = { ...requiredParams, branch_key: 'key', branch_secret: 'secret', limit: 100, after: 10, query_id: 'qid' };
      const mockResponse = { results: [] };
      mock.onPost(url).reply(200, mockResponse);
      await tool(params);
      expect(mock.history.post[0].params).toEqual({ limit: 100, after: 10, query_id: 'qid' });
      const postData = JSON.parse(mock.history.post[0].data);
      expect(postData).not.toHaveProperty('limit');
      expect(postData).not.toHaveProperty('after');
      expect(postData).not.toHaveProperty('query_id');
    });

    it('should throw an error if branch_key or branch_secret are missing', async () => {
      registerQueryTools(mockServer, {});
      const toolCall = mockTool.mock.calls.find(call => call[0] === 'branch_query');
      expect(toolCall).toBeDefined();
      const tool = toolCall![3] as (params: any) => Promise<any>;
      await expect(tool(requiredParams)).rejects.toThrow('Branch Key and Secret are not configured.');
    });

    it('should throw BranchApiError on API error', async () => {
      registerQueryTools(mockServer, config);
      const toolCall = mockTool.mock.calls.find(call => call[0] === 'branch_query');
      expect(toolCall).toBeDefined();
      const tool = toolCall![3] as (params: any) => Promise<any>;
      const params = { ...requiredParams, branch_key: 'key', branch_secret: 'secret' };
      mock.onPost(url).reply(400, { message: 'Bad Request' });
      await expect(tool(params)).rejects.toThrow('Branch API error: 400 undefined');
    });

    it('should throw BranchApiError on other errors', async () => {
      registerQueryTools(mockServer, config);
      const toolCall = mockTool.mock.calls.find(call => call[0] === 'branch_query');
      expect(toolCall).toBeDefined();
      const tool = toolCall![3] as (params: any) => Promise<any>;
      const params = { ...requiredParams, branch_key: 'key', branch_secret: 'secret' };
      mock.onPost(url).networkError();
      await expect(tool(params)).rejects.toThrow('Branch API error: Network Error');
    });
  });
});
