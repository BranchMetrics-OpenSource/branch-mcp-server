import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BranchMcpConfig } from '../config.js';
import axios from 'axios';
import { getBranchBaseUrl, MCP_USER_AGENT } from '../utils/api.js';
import { deepLinkParamsSchema } from '../schemas/deep-link-params.js';
import { BranchApiError, getErrorMessage } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { getResolvedAuth } from '../utils/auth.js';
import { branchKeySchema } from '../schemas/auth.js';
import { createTable } from '../utils/tables.js';

/**
 * Registers QR Code API tools with the MCP server.
 * This includes a tool for creating a customized Branch QR code.
 * @see https://help.branch.io/apidocs/qr-code-api
 * @param server The MCP server instance.
 * @param config The Branch MCP configuration.
 */
const codePatterns = {
  STANDARD: 'Standard',
  SQUARES: 'Squares',
  CIRCLES: 'Circles',
  TRIANGLES: 'Triangles',
  DIAMONDS: 'Diamonds',
  HEXAGONS: 'Hexagons',
  OCTAGONS: 'Octagons'
} as const;

const finderPatterns = {
  SQUARE: 'Square',
  ROUNDED_SQUARE: 'Rounded Square',
  CIRCLE: 'Circle'
} as const;

export function registerQrCodeTools(server: McpServer, config: BranchMcpConfig) {
  const codePatternMap: { [key in keyof typeof codePatterns]: number } = {
    STANDARD: 1,
    SQUARES: 2,
    CIRCLES: 3,
    TRIANGLES: 4,
    DIAMONDS: 5,
    HEXAGONS: 6,
    OCTAGONS: 7
  };

  const finderPatternMap: { [key in keyof typeof finderPatterns]: number } = {
    SQUARE: 1,
    ROUNDED_SQUARE: 2,
    CIRCLE: 3
  };

  const qrCodeSettingsSchema = z.object({
    code_color: z.string().optional().describe('Hex color value of the QR Code itself (e.g., #000000).'),
    background_color: z.string().optional().describe('Hex color value of the background of the QR code (e.g., #FFFFFF).'),
    margin: z.number().optional().describe('The number of pixels for the margin (minimum: 0). Defaults to 3% of the width.'),
    width: z.number().optional().describe('Output size of QR Code image in pixels (min: 300, max: 2000). Applies to JPEG/PNG.'),
    image_format: z.enum(['PNG', 'JPEG', 'SVG']).optional().describe('Image format of the QR code. Defaults to PNG.'),
    center_logo_url: z.string().url().optional().describe('A URL to a logo that will be placed in the center of the QR code.'),
    code_pattern: z.enum(Object.keys(codePatterns) as [keyof typeof codePatterns]).optional().describe(`The shape of the QR code pattern.\n\n${createTable(codePatterns)}`),
    finder_pattern: z.enum(Object.keys(finderPatterns) as [keyof typeof finderPatterns]).optional().describe(`The shape of the finder patterns (the corners).\n\n${createTable(finderPatterns)}`),
    finder_pattern_color: z.string().optional().describe('Hex color value of the finder pattern.'),
    background_image_url: z.string().url().optional().describe('URL of an image to layer the QR code on top of.'),
    code_pattern_url: z.string().url().optional().describe('URL of an image to be used as the code pattern itself.'),
    finder_eye_color: z.string().optional().describe('Hex color value of the finder eye.')
  }).optional();

  const createQrCodeSchema = z.object({
    qr_code_settings: qrCodeSettingsSchema,
    link_data: deepLinkParamsSchema.optional().describe('Link data to embed in the QR code.')
  });

  const createQrCodeToolSchema = createQrCodeSchema.merge(branchKeySchema);

  // Create QR Code
  server.tool(
    'branch_create_qr_code',
    'Create a Branch QR code',
    createQrCodeToolSchema.shape,
    async (params: z.infer<typeof createQrCodeToolSchema>) => {
      logger.debug('Executing tool: branch_create_qr_code with params:', params);
      const { branch_key } = getResolvedAuth(params, config);
      if (!branch_key) {
        throw new Error('Branch Key is not configured. Please provide it in the tool parameters or server configuration.');
      }
      try {
        const { link_data, ...rest } = params;
        const requestBody: Record<string, unknown> = {
          branch_key,
          ...rest,
          data: link_data ?? {}
        };

        if (params.qr_code_settings) {
          const { code_pattern, finder_pattern, ...otherSettings } = params.qr_code_settings;
          const transformedSettings: Record<string, unknown> = { ...otherSettings };
          if (code_pattern) {
            transformedSettings.code_pattern = codePatternMap[code_pattern];
          }
          if (finder_pattern) {
            transformedSettings.finder_pattern = finderPatternMap[finder_pattern];
          }
          requestBody.qr_code_settings = transformedSettings;
        }
        const url = `${getBranchBaseUrl(config)}/v2/qr-code`;
        const response = await axios.post(url, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'image/*',
            'User-Agent': MCP_USER_AGENT
          },
          responseType: 'arraybuffer'
        });
        const image = Buffer.from(response.data, 'binary').toString('base64');
        return {
          content: [
            {
              type: 'text',
              text: 'QR Code created successfully. The image is below.'
            },
            {
              type: 'image',
              data: image,
              mimeType: `image/${params.qr_code_settings?.image_format?.toLowerCase() || 'png'}`
            }
          ]
        };
      } catch (error) {
        let message = getErrorMessage(error);
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
          message = error.response.data.error.message;
        }
        logger.error(`Error in branch_create_qr_code: ${message}`);
        if (axios.isAxiosError(error)) {
          throw new BranchApiError(message, { status: error.response?.status ?? 0, response: error.response });
        }
        throw new BranchApiError(message, { status: 0 });
      }
    }
  );
}