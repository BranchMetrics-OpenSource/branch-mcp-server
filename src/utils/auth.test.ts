import { getResolvedAuth } from './auth.js';
import type { BranchMcpConfig } from '../config.js';

describe('getResolvedAuth', () => {
  const baseConfig: BranchMcpConfig = {
    api_key: 'config_api_key',
    branch_key: 'config_branch_key',
    branch_secret: 'config_branch_secret',
    app_id: 'config_app_id',
    organization_id: 'config_org_id',
    auth_token: 'config_auth_token',
  };

  it('should prioritize params over config', () => {
    const params = {
      api_key: 'params_api_key',
      branch_key: 'params_branch_key',
      branch_secret: 'params_branch_secret',
      app_id: 'params_app_id',
      organization_id: 'params_org_id',
    };
    const resolved = getResolvedAuth(params, baseConfig);
    expect(resolved).toEqual({
      api_key: 'params_api_key',
      auth_token: 'params_api_key',
      branch_key: 'params_branch_key',
      branch_secret: 'params_branch_secret',
      app_id: 'params_app_id',
      organization_id: 'params_org_id',
    });
  });

  it('should use config values when params are not provided', () => {
    const resolved = getResolvedAuth({}, baseConfig);
    expect(resolved).toEqual({
      api_key: 'config_api_key',
      auth_token: 'config_api_key',
      branch_key: 'config_branch_key',
      branch_secret: 'config_branch_secret',
      app_id: 'config_app_id',
      organization_id: 'config_org_id',
    });
  });

  it('should handle a mix of params and config values', () => {
    const params = { api_key: 'params_api_key', app_id: 'params_app_id' };
    const resolved = getResolvedAuth(params, baseConfig);
    expect(resolved).toEqual({
      api_key: 'params_api_key',
      auth_token: 'params_api_key',
      branch_key: 'config_branch_key',
      branch_secret: 'config_branch_secret',
      app_id: 'params_app_id',
      organization_id: 'config_org_id',
    });
  });

  it('should handle api_key and auth_token synonyms correctly', () => {
    const paramsWithAuthToken = { auth_token: 'params_auth_token' };
    const resolvedWithAuthToken = getResolvedAuth(paramsWithAuthToken, baseConfig);
    expect(resolvedWithAuthToken.api_key).toBe('params_auth_token');
    expect(resolvedWithAuthToken.auth_token).toBe('params_auth_token');

    const paramsWithBoth = { api_key: 'params_api_key', auth_token: 'params_auth_token' };
    const resolvedWithBoth = getResolvedAuth(paramsWithBoth, baseConfig);
    expect(resolvedWithBoth.api_key).toBe('params_api_key');
    expect(resolvedWithBoth.auth_token).toBe('params_api_key');
  });

  it('should use config.auth_token if config.api_key is not present', () => {
    const configWithoutApiKey = { ...baseConfig, api_key: undefined };
    const resolved = getResolvedAuth({}, configWithoutApiKey);
    expect(resolved.api_key).toBe('config_auth_token');
    expect(resolved.auth_token).toBe('config_auth_token');
  });

  it('should return undefined for missing values', () => {
    const resolved = getResolvedAuth({}, {});
    expect(resolved).toEqual({
      api_key: undefined,
      auth_token: undefined,
      branch_key: undefined,
      branch_secret: undefined,
      app_id: undefined,
      organization_id: undefined,
    });
  });
});
