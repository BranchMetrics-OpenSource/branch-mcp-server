/**
 * @file This utility is responsible for seeding the language model with context about
 * Branch's documentation. It defines a list of important documentation URLs and registers
 * a system prompt with the MCP server to make the model aware of these resources.
 * This helps the model provide more accurate and helpful responses related to the Branch API.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * A curated list of important Branch documentation URLs.
 * This object serves as a centralized repository of links to key developer resources,
 * which are used to construct the context prompt for the language model.
 */
const BRANCH_DOC_URLS = {
  // API Overview and General Documentation
  overview: 'https://help.branch.io/developers-hub/docs/apis-overview',
  bestPractices: 'https://help.branch.io/docs/best-practices-to-avoid-sending-pii-to-branch',

  // API-specific Documentation
  deepLinking: 'https://help.branch.io/apidocs/deep-linking-api',
  events: 'https://help.branch.io/apidocs/events-api',
  qrCode: 'https://help.branch.io/apidocs/qr-code-api',
  attribution: 'https://help.branch.io/apidocs/attribution-api',
  app: 'https://help.branch.io/apidocs/app-api',
  dataSubject: 'https://help.branch.io/apidocs/data-subject-request-branch-api',
  quickLinks: 'https://help.branch.io/apidocs/quick-links-api'
};

/**
 * Seeds the language model with context about Branch's documentation.
 *
 * This function constructs a detailed system prompt containing a list of official
 * Branch documentation URLs and instructions on how to use them. It then registers
 * this content as a prompt named `branch_context` with the MCP server. By doing so,
 * the language model can be made aware of these resources, enabling it to provide
 * more accurate and contextually relevant answers to user questions about Branch APIs.
 *
 * @param server The MCP server instance to register the prompt with.
 */
export async function seedLLMWithBranchDocs(server: McpServer): Promise<void> {
  try {
    // Create a formatted list of documentation URLs
    const urlList = Object.entries(BRANCH_DOC_URLS)
      .map(([key, url]) => `- ${key}: ${url}`)
      .join('\n');

    // Create a system prompt with the documentation URLs
    const branchContext = `
# Branch API Documentation Resources

When helping users with Branch API questions, refer to these official documentation resources:

${urlList}

Instructions for using these resources:
1. When a user asks about a specific Branch API feature, refer them to the relevant documentation URL from the list above.
2. Focus on the most relevant documentation based on the user's question.
3. Always follow Branch's best practices, especially regarding data handling and privacy.
4. Inform users that you're providing information from the official Branch documentation.
5. If you have web browsing capabilities, you can look up these URLs to provide more detailed information.
6. If the documentation doesn't cover the user's specific question, be transparent about the limitations.

These URLs contain the most up-to-date information about Branch APIs and best practices.
    `;

    // Register a prompt that provides the Branch documentation URLs as context
        server.prompt('branch_context', 'Get Branch API documentation resources', async (_: any) => ({
      messages: [
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: branchContext
          }
        }
      ]
    }));

    console.error('Successfully registered Branch documentation resources prompt');
  } catch (error) {
    console.error('Error setting up Branch documentation context:', error);
  }
}