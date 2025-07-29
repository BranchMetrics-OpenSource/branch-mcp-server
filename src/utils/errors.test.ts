import { BranchApiError, isBranchApiError, isErrorWithMessage, getErrorMessage } from './errors.js';

describe('BranchApiError', () => {
  it('should create an instance of BranchApiError', () => {
    const error = new BranchApiError('Test error');
    expect(error).toBeInstanceOf(BranchApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('BranchApiError');
    expect(error.message).toBe('Test error');
  });

  it('should capture status and response properties', () => {
    const response = { data: { error: 'details' }, status: 404, statusText: 'Not Found' };
    const error = new BranchApiError('API Error', { status: 404, response });
    expect(error.status).toBe(404);
    expect(error.response).toEqual(response);
  });
});

describe('isBranchApiError', () => {
  it('should return true for BranchApiError instances', () => {
    const error = new BranchApiError('Test');
    expect(isBranchApiError(error)).toBe(true);
  });

  it('should return false for other error types', () => {
    const error = new Error('Test');
    expect(isBranchApiError(error)).toBe(false);
  });

  it('should return false for non-error objects', () => {
    expect(isBranchApiError({ message: 'Test' })).toBe(false);
    expect(isBranchApiError(null)).toBe(false);
    expect(isBranchApiError(undefined)).toBe(false);
  });
});

describe('isErrorWithMessage', () => {
  it('should return true for objects with a string message property', () => {
    expect(isErrorWithMessage({ message: 'An error' })).toBe(true);
    expect(isErrorWithMessage(new Error('An error'))).toBe(true);
  });

  it('should return false for objects without a string message property', () => {
    expect(isErrorWithMessage({ msg: 'An error' })).toBe(false);
    expect(isErrorWithMessage({ message: 123 })).toBe(false);
    expect(isErrorWithMessage(null)).toBe(false);
    expect(isErrorWithMessage('a string')).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('should extract message from an Error instance', () => {
    expect(getErrorMessage(new Error('Standard error'))).toBe('Standard error');
  });

  it('should extract message from a BranchApiError instance', () => {
    expect(getErrorMessage(new BranchApiError('Branch error'))).toBe('Branch error');
  });

  it('should extract message from an object with a message property', () => {
    expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
  });

  it('should return the string if the error is a string', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('should return a generic message for unknown error types', () => {
    expect(getErrorMessage(123)).toBe('Unknown error occurred');
    expect(getErrorMessage(null)).toBe('Unknown error occurred');
    expect(getErrorMessage(undefined)).toBe('Unknown error occurred');
    expect(getErrorMessage({})).toBe('Unknown error occurred');
  });
});
