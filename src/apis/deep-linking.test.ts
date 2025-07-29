import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDeepLinkingTools } from './deep-linking.js';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BranchApiError } from '../utils/errors.js';

// Mock McpServer to check for both registerTool and tool calls
const mockRegisterTool = jest.fn();
const mockTool = jest.fn();
const mockServer = {
  registerTool: mockRegisterTool,
  tool: mockTool,
} as unknown as McpServer;

describe('Deep Linking API Tools', () => {
  let mock: MockAdapter;
  const config: BranchMcpConfig = {
    branch_key: 'key_live_123',
    branch_secret: 'secret_123',
    app_id: '12345',
    auth_token: 'token_123',
    branch_url: 'api2.branch.io',
  };
  const baseUrl = `https://${config.branch_url}`;
  const url = `${baseUrl}/v1/url`;
  const bulkUrl = `${baseUrl}/v1/url/bulk`;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mockRegisterTool.mockClear();
    mockTool.mockClear();
  });

  afterEach(() => {
    mock.reset();
  });

  it('should register all deep linking tools', () => {
    registerDeepLinkingTools(mockServer, config);
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_create_deep_link', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_bulk_create_deep_links', expect.any(Object), expect.any(Function));
    expect(mockTool).toHaveBeenCalledWith('branch_read_deep_link', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_update_deep_link', expect.any(Object), expect.any(Function));
    expect(mockTool).toHaveBeenCalledWith('branch_delete_deep_link', expect.any(String), expect.any(Object), expect.any(Function));
  });

  describe('branch_create_deep_link', () => {
    it('should create a deep link successfully', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockRegisterTool.mock.calls.find((call) => call[0] === 'branch_create_deep_link')![2] as (params: any) => Promise<any>;
      const params = { data: { foo: 'bar' } };
      const mockResponse = { url: 'https://branch.io/link' };
      mock.onPost(url).reply(200, mockResponse);
      const result = await toolImpl(params);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw an error if branch_key is missing', async () => {
      registerDeepLinkingTools(mockServer, {});
      const toolImpl = mockRegisterTool.mock.calls.find((call) => call[0] === 'branch_create_deep_link')![2] as (params: any) => Promise<any>;
      await expect(toolImpl({ data: {} })).rejects.toThrow('Branch Key is not configured');
    });

    it('should throw BranchApiError on API error', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockRegisterTool.mock.calls.find((call) => call[0] === 'branch_create_deep_link')![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(500, { error: { message: 'Server Error' } });
      await expect(toolImpl({ data: {} })).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(500));
    });
  });

  describe('branch_bulk_create_deep_links', () => {
    it('should bulk create deep links successfully', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockRegisterTool.mock.calls.find((call) => call[0] === 'branch_bulk_create_deep_links')![2] as (params: any) => Promise<any>;
      const params = { links: [{ data: { foo: 'bar' } }] };
      const mockResponse = [{ url: 'https://branch.io/link' }];
      mock.onPost(`${bulkUrl}/${config.branch_key}`).reply(200, mockResponse);
      const result = await toolImpl(params);
      expect(result.structuredContent).toEqual({ links: mockResponse });
    });

    it('should throw an error if branch_key is missing', async () => {
      registerDeepLinkingTools(mockServer, {});
      const toolImpl = mockRegisterTool.mock.calls.find((call) => call[0] === 'branch_bulk_create_deep_links')![2] as (params: any) => Promise<any>;
      await expect(toolImpl({ links: [] })).rejects.toThrow('Branch Key is not configured');
    });

    it('should throw BranchApiError on API error', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockRegisterTool.mock.calls.find((call) => call[0] === 'branch_bulk_create_deep_links')![2] as (params: any) => Promise<any>;
      mock.onPost(`${bulkUrl}/${config.branch_key}`).reply(500, { error: { message: 'Server Error' } });
      await expect(toolImpl({ links: [] })).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(500));
    });
  });

  describe('branch_read_deep_link', () => {
    it('should read a deep link successfully', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockTool.mock.calls.find((call) => call[0] === 'branch_read_deep_link')![3] as (params: any) => Promise<any>;
      const params = { url: 'https://branch.io/link' };
      const mockResponse = { data: { foo: 'bar' } };
      mock.onGet(url).reply(200, mockResponse);
      const result = await toolImpl(params);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse);
    });

    it('should throw an error if branch_key is missing', async () => {
      registerDeepLinkingTools(mockServer, {});
      const toolImpl = mockTool.mock.calls.find((call) => call[0] === 'branch_read_deep_link')![3] as (params: any) => Promise<any>;
      await expect(toolImpl({ url: 'https://branch.io/link' })).rejects.toThrow('Branch Key is not configured');
    });

    it('should throw BranchApiError on API error', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockTool.mock.calls.find((call) => call[0] === 'branch_read_deep_link')![3] as (params: any) => Promise<any>;
      mock.onGet(url).reply(404, { error: { message: 'Not Found' } });
      await expect(toolImpl({ url: 'https://branch.io/link' })).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(404));
    });
  });

  describe('branch_update_deep_link', () => {
    it('should update a deep link successfully', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockRegisterTool.mock.calls.find((call) => call[0] === 'branch_update_deep_link')![2] as (params: any) => Promise<any>;
      const params = { url: 'https://branch.io/link', data: { foo: 'baz' } };
      const mockResponse = { data: { foo: 'baz' } };
      mock.onPut(url).reply(200, mockResponse);
      const result = await toolImpl(params);
      expect(result.structuredContent).toEqual(mockResponse);
    });

    it('should throw an error if branch_key or branch_secret is missing', async () => {
      registerDeepLinkingTools(mockServer, {});
      const toolImpl = mockRegisterTool.mock.calls.find((call) => call[0] === 'branch_update_deep_link')![2] as (params: any) => Promise<any>;
      await expect(toolImpl({ url: 'https://branch.io/link' })).rejects.toThrow('Branch Key is not configured');
      await expect(toolImpl({ url: 'https://branch.io/link', branch_key: 'key' })).rejects.toThrow('Branch Secret is not configured');
    });

    it('should throw BranchApiError on API error', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockRegisterTool.mock.calls.find((call) => call[0] === 'branch_update_deep_link')![2] as (params: any) => Promise<any>;
      mock.onPut(url).reply(500, { error: { message: 'Server Error' } });
      await expect(toolImpl({ url: 'https://branch.io/link' })).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(500));
    });
  });

  describe('branch_delete_deep_link', () => {
    it('should delete a deep link successfully', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockTool.mock.calls.find((call) => call[0] === 'branch_delete_deep_link')![3] as (params: any) => Promise<any>;
      const params = { url: 'https://branch.io/link' };
      const mockResponse = {};
      mock.onDelete(url).reply(200, mockResponse);
      const result = await toolImpl(params);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse);
    });

    it('should throw an error if app_id or auth_token is missing', async () => {
      registerDeepLinkingTools(mockServer, {});
      const toolImpl = mockTool.mock.calls.find((call) => call[0] === 'branch_delete_deep_link')![3] as (params: any) => Promise<any>;
      await expect(toolImpl({ url: 'https://branch.io/link' })).rejects.toThrow('Branch App ID is not configured');
      await expect(toolImpl({ url: 'https://branch.io/link', app_id: '123' })).rejects.toThrow('Branch Auth Token is not configured');
    });

    it('should throw BranchApiError on API error', async () => {
      registerDeepLinkingTools(mockServer, config);
      const toolImpl = mockTool.mock.calls.find((call) => call[0] === 'branch_delete_deep_link')![3] as (params: any) => Promise<any>;
      mock.onDelete(url).reply(500, { error: { message: 'Server Error' } });
      await expect(toolImpl({ url: 'https://branch.io/link' })).rejects.toThrow(BranchApiError)
        .catch((e: BranchApiError) => expect(e.status).toBe(500));
    });
  });
});
