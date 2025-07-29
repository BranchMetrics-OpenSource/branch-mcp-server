import { sanitizeLogObject } from './logger.js';

describe('sanitizeLogObject', () => {
  it('should redact sensitive keys from a nested object', () => {
    const logData = {
      level: 'info',
      message: 'User request',
      user: {
        id: '123',
        branch_key: 'key_live_123',
      },
      request: {
        headers: {
          'Authorization': 'Bearer ...'
        },
        body: {
          branch_secret: 'secret_456',
          other_data: 'is_fine',
        },
      },
      branch_key: 'key_live_789',
      auth_token: 'token_abc',
    };

    const sanitized = sanitizeLogObject(logData) as Record<string, unknown>;

    expect(sanitized.branch_key).toBe('[REDACTED]');
    expect(sanitized.auth_token).toBe('[REDACTED]');
    
    const user = sanitized.user as Record<string, unknown>;
    expect(user.id).toBe('123');
    expect(user.branch_key).toBe('[REDACTED]');

    const request = sanitized.request as Record<string, unknown>;
    const headers = request.headers as Record<string, unknown>;
    expect(headers['Authorization']).toBe('Bearer ...');

    const body = request.body as Record<string, unknown>;
    expect(body.branch_secret).toBe('[REDACTED]');
    expect(body.other_data).toBe('is_fine');
  });
});
