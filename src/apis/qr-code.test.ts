import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerQrCodeTools } from './qr-code.js';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BranchApiError } from '../utils/errors.js';

// Mock McpServer
const mockTool = jest.fn();
const mockServer = {
  tool: mockTool,
} as unknown as McpServer;

describe('QR Code API Tools', () => {
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
  const url = `${baseUrl}/v2/qr-code`;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mockTool.mockClear();
  });

  afterEach(() => {
    mock.reset();
  });

  it('should register qr code tools', () => {
    registerQrCodeTools(mockServer, config);

    expect(mockTool).toHaveBeenCalledWith('branch_create_qr_code', expect.any(String), expect.any(Object), expect.any(Function));
    expect(mockTool).toHaveBeenCalledTimes(1);
  });

  describe('branch_create_qr_code', () => {
    it('should create a QR code successfully', async () => {
      registerQrCodeTools(mockServer, config);
      const tool = mockTool.mock.calls[0][3] as (params: any) => Promise<any>;
      const params = { branch_key: 'key', link_data: { alias: 'test' } };
      const mockResponseData = Buffer.from('imagedata');
      mock.onPost(url).reply(200, mockResponseData);

      const result = await tool(params);

      expect(result.content[0].text).toBe('QR Code created successfully. The image is below.');
      expect(result.content[1].type).toBe('image');
      expect(result.content[1].data).toBe(mockResponseData.toString('base64'));
      expect(result.content[1].mimeType).toBe('image/png');
      expect(mock.history.post[0].data).toBe(JSON.stringify({ branch_key: 'key', data: { alias: 'test' } }));
    });

    it('should create a QR code with custom settings', async () => {
      registerQrCodeTools(mockServer, config);
      const tool = mockTool.mock.calls[0][3] as (params: any) => Promise<any>;
      const params = {
        branch_key: 'key',
        link_data: { alias: 'test' },
        qr_code_settings: {
          code_pattern: 'CIRCLES',
          finder_pattern: 'ROUNDED_SQUARE',
          image_format: 'SVG'
        }
      };
      const mockResponseData = Buffer.from('imagedata');
      mock.onPost(url).reply(200, mockResponseData);

      const result = await tool(params);

      expect(result.content[1].mimeType).toBe('image/svg');
      const expectedBody = {
        branch_key: 'key',
        data: { alias: 'test' },
        qr_code_settings: {
          code_pattern: 3, // CIRCLES
          finder_pattern: 2, // ROUNDED_SQUARE
          image_format: 'SVG'
        }
      };
      expect(JSON.parse(mock.history.post[0].data)).toEqual(expectedBody);
    });

    it('should throw an error if branch_key is missing', async () => {
      registerQrCodeTools(mockServer, {});
      const tool = mockTool.mock.calls[0][3] as (params: any) => Promise<any>;
      await expect(tool({})).rejects.toThrow('Branch Key is not configured. Please provide it in the tool parameters or server configuration.');
    });

    it('should handle API errors gracefully', async () => {
      registerQrCodeTools(mockServer, config);
      const tool = mockTool.mock.calls[0][3] as (params: any) => Promise<any>;
      const params = { branch_key: 'key' };
      mock.onPost(url).reply(500, { error: { message: 'API Error' } });

      await expect(tool(params)).rejects.toThrow(new BranchApiError('API Error', { status: 500 }));
    });

    it('should handle network errors gracefully', async () => {
      registerQrCodeTools(mockServer, config);
      const tool = mockTool.mock.calls[0][3] as (params: any) => Promise<any>;
      const params = { branch_key: 'key' };
      mock.onPost(url).networkError();

      await expect(tool(params)).rejects.toThrow(new BranchApiError('Network Error', { status: 0 }));
    });
  });
});
