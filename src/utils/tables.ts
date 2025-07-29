export const createTable = (data: Record<string, string>, headers = ['Name', 'Description']) => `| ${headers[0]} | ${headers[1]} |\n|---|---|
${Object.entries(data).map(([key, value]) => `| \`${key}\` | ${value} |`).join('\n')}`;
