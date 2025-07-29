import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerQuickLinksTools } from './quick-links.js';
import type { BranchMcpConfig } from '../config.js';
import _axios from 'axios';
const axios = _axios as jest.Mocked<typeof _axios>;
import MockAdapter from 'axios-mock-adapter';
import { BranchApiError } from '../utils/errors.js';



// Mock McpServer
const mockTool = jest.fn();
const mockRegisterTool = jest.fn();
const mockServer = {
  tool: mockTool,
  registerTool: mockRegisterTool,
} as unknown as McpServer;

describe('Quick Links API Tools', () => {
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

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mockTool.mockClear();
    mockRegisterTool.mockClear();
  });

  afterEach(() => {
    mock.reset();
  });

  it('should register quick links tools', () => {
    registerQuickLinksTools(mockServer, config);
    expect(mockTool).toHaveBeenCalledWith('branch_create_quick_link', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_update_quick_link', expect.any(Object), expect.any(Function));
    expect(mockRegisterTool).toHaveBeenCalledWith('branch_bulk_create_quick_links', expect.any(Object), expect.any(Function));
  });

  describe('branch_create_quick_link', () => {
    const url = `${baseUrl}/v1/url`;
    const createParams = { alias: 'test_link', data: { '$og_title': 'Test' }, branch_key: 'key', branch_secret: 'secret' };

    it('should create a quick link successfully', async () => {
      registerQuickLinksTools(mockServer, config);
      const createCall = mockTool.mock.calls.find(call => call[0] === 'branch_create_quick_link');
      expect(createCall).toBeDefined();
      const tool = createCall![3] as (params: any) => Promise<any>;
      const mockResponse = { url: 'https://branch.io/link' };
      mock.onPost(url).reply(200, mockResponse);
      const result = await tool(createParams);
      expect(result).toEqual(mockResponse);
      expect(JSON.parse(mock.history.post[0].data)).toEqual(expect.objectContaining({ alias: 'test_link' }));
    });

    it('should handle API errors', async () => {
      registerQuickLinksTools(mockServer, config);
      const createCall = mockTool.mock.calls.find(call => call[0] === 'branch_create_quick_link');
      expect(createCall).toBeDefined();
      const tool = createCall![3] as (params: any) => Promise<any>;
      mock.onPost(url).networkError();
      await expect(tool(createParams)).rejects.toThrow(BranchApiError);
    });

    it('should handle API errors with a message', async () => {
      registerQuickLinksTools(mockServer, config);
      const createCall = mockTool.mock.calls.find(call => call[0] === 'branch_create_quick_link');
      expect(createCall).toBeDefined();
      const tool = createCall![3] as (params: any) => Promise<any>;
      mock.onPost(url).reply(400, { error: { message: 'Specific error message' } });
      await expect(tool(createParams)).rejects.toThrow('Specific error message');
    });

        it('should handle non-Axios errors', async () => {
      registerQuickLinksTools(mockServer, config);
      const createCall = mockTool.mock.calls.find(call => call[0] === 'branch_create_quick_link');
      expect(createCall).toBeDefined();
      const tool = createCall![3] as (params: any) => Promise<any>;

      // Mock a network error and then mock isAxiosError to return false
      mock.onPost(url).networkError();
      const isAxiosErrorSpy = jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);

      await expect(tool(createParams)).rejects.toThrow(new BranchApiError('Network Error', { status: 0 }));
      isAxiosErrorSpy.mockRestore();
    });

    it('should throw error if marketing link is missing title', async () => {
      registerQuickLinksTools(mockServer, config);
      const createCall = mockTool.mock.calls.find(call => call[0] === 'branch_create_quick_link');
      expect(createCall).toBeDefined();
      const tool = createCall![3] as (params: any) => Promise<any>;
      const marketingParams = { ...createParams, type: 'MARKETING', data: {} };
      await expect(tool(marketingParams)).rejects.toThrow('A $marketing_title is required in the data object for links to be visible on the dashboard (when type is MARKETING).');
    });

    it('should throw error if credentials are missing', async () => {
      registerQuickLinksTools(mockServer, {});
      const createCall = mockTool.mock.calls.find(call => call[0] === 'branch_create_quick_link');
      expect(createCall).toBeDefined();
      const tool = createCall![3] as (params: any) => Promise<any>;
      await expect(tool({ alias: 'test' })).rejects.toThrow('Branch Key and Secret are not configured. Please provide them in the tool parameters or server configuration.');
    });
  });

  describe('branch_update_quick_link', () => {
    const url = `${baseUrl}/v1/url`;
    const updateParams = { url: 'https://branch.io/link', link_data: { data: { '$og_title': 'Updated' } }, branch_key: 'key', branch_secret: 'secret' };

    it('should update a quick link successfully', async () => {
      registerQuickLinksTools(mockServer, config);
      const updateCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_quick_link');
      expect(updateCall).toBeDefined();
      const tool = updateCall![2] as (params: any) => Promise<any>;
      const getMockResponse = { data: { '$og_title': 'Old' } };
      const putMockResponse = { url: 'https://branch.io/link' };
      mock.onGet(url).reply(200, getMockResponse);
      mock.onPut(url).reply(200, putMockResponse);
      const result = await tool(updateParams);
      expect(result.structuredContent).toEqual(putMockResponse);
      expect(mock.history.get.length).toBe(1);
      expect(mock.history.put.length).toBe(1);
    });

    it('should handle API errors during GET', async () => {
      registerQuickLinksTools(mockServer, config);
      const updateCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_quick_link');
      expect(updateCall).toBeDefined();
      const tool = updateCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).reply(500);
            await expect(tool(updateParams)).rejects.toThrow(BranchApiError);
    });

    it('should handle API errors with a message', async () => {
      registerQuickLinksTools(mockServer, config);
      const updateCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_quick_link');
      expect(updateCall).toBeDefined();
      const tool = updateCall![2] as (params: any) => Promise<any>;
      mock.onGet(url).reply(400, { error: { message: 'Specific update error' } });
      await expect(tool(updateParams)).rejects.toThrow('Specific update error');
    });

    it('should handle non-Axios errors', async () => {
      registerQuickLinksTools(mockServer, config);
      const updateCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_quick_link');
      expect(updateCall).toBeDefined();
      const tool = updateCall![2] as (params: any) => Promise<any>;

      mock.onGet(url).networkError();
      const isAxiosErrorSpy = jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);

      await expect(tool(updateParams)).rejects.toThrow(new BranchApiError('Network Error', { status: 0 }));
      isAxiosErrorSpy.mockRestore();
    });

    it('should return error for restricted link URLs', async () => {
      registerQuickLinksTools(mockServer, config);
      const updateCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_quick_link');
      expect(updateCall).toBeDefined();
      const tool = updateCall![2] as (params: any) => Promise<any>;
      const result = await tool({ ...updateParams, url: 'https://bnc.lt/c/123' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Update failed');
    });

    it('should throw error if credentials are missing', async () => {
      registerQuickLinksTools(mockServer, {});
      const updateCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_quick_link');
      expect(updateCall).toBeDefined();
      const tool = updateCall![2] as (params: any) => Promise<any>;
      await expect(tool({ url: 'http://a.co', link_data: {} })).rejects.toThrow('Branch Key is not configured.');
    });

    it('should throw error if branch_secret is missing', async () => {
      registerQuickLinksTools(mockServer, {});
      const updateCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_update_quick_link');
      expect(updateCall).toBeDefined();
      const tool = updateCall![2] as (params: any) => Promise<any>;
      await expect(tool({ url: 'http://a.co', link_data: {}, branch_key: 'key' })).rejects.toThrow('Branch Secret is not configured.');
    });
  });

  describe('branch_bulk_create_quick_links', () => {
    const branchKey = 'key';
    const url = `${baseUrl}/v1/url/bulk/${branchKey}`;
    const bulkParams = { links: [{ alias: 'link1' }, { alias: 'link2' }], branch_key: branchKey };

    it('should bulk create links successfully', async () => {
      registerQuickLinksTools(mockServer, config);
      const bulkCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_bulk_create_quick_links');
      expect(bulkCall).toBeDefined();
      const tool = bulkCall![2] as (params: any) => Promise<any>;
      const mockResponse = [{ url: 'url1' }, { url: 'url2' }];
      mock.onPost(url).reply(200, mockResponse);
      const result = await tool(bulkParams);
      expect(result.structuredContent).toEqual(mockResponse);
      expect(mock.history.post[0].data).toBe(JSON.stringify(bulkParams.links));
    });

    it('should handle API errors', async () => {
      registerQuickLinksTools(mockServer, config);
      const bulkCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_bulk_create_quick_links');
      expect(bulkCall).toBeDefined();
      const tool = bulkCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(500);
            await expect(tool(bulkParams)).rejects.toThrow(BranchApiError);
    });

    it('should handle API errors with a message', async () => {
      registerQuickLinksTools(mockServer, config);
      const bulkCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_bulk_create_quick_links');
      expect(bulkCall).toBeDefined();
      const tool = bulkCall![2] as (params: any) => Promise<any>;
      mock.onPost(url).reply(400, { error: { message: 'Specific bulk error' } });
      await expect(tool(bulkParams)).rejects.toThrow('Specific bulk error');
    });

    it('should handle the marketing type correctly', async () => {
      registerQuickLinksTools(mockServer, config);
      const bulkCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_bulk_create_quick_links');
      expect(bulkCall).toBeDefined();
      const tool = bulkCall![2] as (params: any) => Promise<any>;
      const marketingParams = { links: [{ alias: 'link1', type: 'MARKETING', data: { '$marketing_title': 'title' } }], branch_key: branchKey };
      const mockResponse = [{ url: 'url1' }];
      mock.onPost(url).reply(200, mockResponse);
      const result = await tool(marketingParams);
      expect(result.structuredContent).toEqual(mockResponse);
      expect(JSON.parse(mock.history.post[0].data)[0].type).toBe(2);
    });

        it('should handle non-Axios errors', async () => {
      registerQuickLinksTools(mockServer, config);
      const bulkCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_bulk_create_quick_links');
      expect(bulkCall).toBeDefined();
      const tool = bulkCall![2] as (params: any) => Promise<any>;

      // Mock a network error and then mock isAxiosError to return false
      mock.onPost(url).networkError();
      const isAxiosErrorSpy = jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);

      await expect(tool(bulkParams)).rejects.toThrow(new BranchApiError('Network Error', { status: 0 }));
      isAxiosErrorSpy.mockRestore();
    });

    it('should return validation error for marketing link without title', async () => {
      registerQuickLinksTools(mockServer, config);
      const bulkCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_bulk_create_quick_links');
      expect(bulkCall).toBeDefined();
      const tool = bulkCall![2] as (params: any) => Promise<any>;
      const params = { links: [{ type: 'MARKETING', data: {} }], branch_key: 'key' };
      const result = await tool(params);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
    });

    it('should throw error if credentials are missing', async () => {
      registerQuickLinksTools(mockServer, {});
      const bulkCall = mockRegisterTool.mock.calls.find(call => call[0] === 'branch_bulk_create_quick_links');
      expect(bulkCall).toBeDefined();
      const tool = bulkCall![2] as (params: any) => Promise<any>;
      await expect(tool({ links: [] })).rejects.toThrow('Branch Key is not configured.');
    });
  });
});
