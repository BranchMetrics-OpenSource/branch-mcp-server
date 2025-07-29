import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { seedLLMWithBranchDocs } from './docs-fetcher.js';

describe('seedLLMWithBranchDocs', () => {
  let mockServer: McpServer;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    // Mock the McpServer and its prompt method
    mockServer = {
      prompt: jest.fn(),
    } as unknown as McpServer;

    // Spy on console.error to check for error logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.error function
    consoleErrorSpy.mockRestore();
  });

  it('should register a prompt with the correct name and description', async () => {
    await seedLLMWithBranchDocs(mockServer);

    expect(mockServer.prompt).toHaveBeenCalledWith(
      'branch_context',
      'Get Branch API documentation resources',
      expect.any(Function)
    );
  });

  it('should register a prompt that returns the correct assistant message', async () => {
    await seedLLMWithBranchDocs(mockServer);

    // Get the callback function passed to the prompt method
    const promptCallback = (mockServer.prompt as jest.Mock).mock.calls[0][2] as () => Promise<{ messages: any[] }>;
    const result = await promptCallback();

    expect(result.messages).toHaveLength(1);
    const message = result.messages[0];
    expect(message.role).toBe('assistant');
    expect(message.content.type).toBe('text');
    expect(message.content.text).toContain('# Branch API Documentation Resources');
    expect(message.content.text).toContain('https://help.branch.io/apidocs/deep-linking-api');
  });

  it('should log an error if prompt registration fails', async () => {
    const testError = new Error('Registration failed');
    (mockServer.prompt as jest.Mock).mockImplementation(() => {
      throw testError;
    });

    await seedLLMWithBranchDocs(mockServer);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error setting up Branch documentation context:', testError);
  });
});
