import { getApiQueryParams } from './apiQueryParameters.js';
import type { BranchMcpConfig } from '../config.js';

describe('getApiQueryParams', () => {
  const baseConfig: BranchMcpConfig = {
    app_id: 'config_app_id',
    organization_id: 'config_org_id',
  };

  it('should prioritize params.app_id', () => {
    const params = { app_id: 'params_app_id', organization_id: 'params_org_id' };
    const queryParams = getApiQueryParams(params, baseConfig);
    expect(queryParams).toEqual({ app_id: 'params_app_id' });
  });

  it('should use config.app_id if params.app_id is not provided', () => {
    const params = { organization_id: 'params_org_id' };
    const queryParams = getApiQueryParams(params, baseConfig);
    expect(queryParams).toEqual({ app_id: 'config_app_id' });
  });

  it('should use params.organization_id if no app_id is available', () => {
    const params = { organization_id: 'params_org_id' };
    const configWithoutAppId = { ...baseConfig, app_id: undefined };
    const queryParams = getApiQueryParams(params, configWithoutAppId);
    expect(queryParams).toEqual({ organization_id: 'params_org_id' });
  });

  it('should use config.organization_id if no app_id or params.organization_id is available', () => {
    const params = {};
    const configWithoutAppId = { ...baseConfig, app_id: undefined };
    const queryParams = getApiQueryParams(params, configWithoutAppId);
    expect(queryParams).toEqual({ organization_id: 'config_org_id' });
  });

  it('should return an empty object if no identifiers are provided', () => {
    const queryParams = getApiQueryParams({}, {});
    expect(queryParams).toEqual({});
  });

  it('should ignore organization_id if app_id is present in config', () => {
    const params = { organization_id: 'params_org_id' };
    const queryParams = getApiQueryParams(params, baseConfig);
    expect(queryParams).toEqual({ app_id: 'config_app_id' });
    expect(queryParams.organization_id).toBeUndefined();
  });
});
