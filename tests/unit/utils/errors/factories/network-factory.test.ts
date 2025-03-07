import { AxiosError, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { NetworkErrorFactory } from '../../../../../src/utils/errors/factories/network-factory';
import { ErrorCode } from '../../../../../src/utils/errors/types/error-codes';
import { AppError } from '../../../../../src/utils/errors/core/app-error';

describe('NetworkErrorFactory', () => {
  const mockAxiosConfig: InternalAxiosRequestConfig = {
    url: 'http://test.com',
    headers: new AxiosHeaders(),
    method: 'get',
    baseURL: '',
    transformRequest: [],
    transformResponse: [],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: {
      FormData: null as any,
    },
  };

  describe('fromAxiosError', () => {
    it('should handle timeout errors', () => {
      const axiosError = new Error('timeout') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.code = 'ECONNABORTED';
      axiosError.config = mockAxiosConfig;

      const error = NetworkErrorFactory.fromAxiosError(axiosError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.TIMEOUT);
      expect(error.statusCode).toBe(408);
      expect(error.context?.url).toBe('http://test.com');
    });

    it('should handle 404 responses', () => {
      const axiosError = new Error('Not Found') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = { status: 404 } as any;
      axiosError.config = mockAxiosConfig;

      const error = NetworkErrorFactory.fromAxiosError(axiosError);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('http://test.com');
    });

    it('should handle server errors (5xx)', () => {
      const axiosError = new Error('Server Error') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = { status: 503 } as any;
      axiosError.config = mockAxiosConfig;

      const error = NetworkErrorFactory.fromAxiosError(axiosError);
      expect(error.code).toBe(ErrorCode.SERVER_ERROR);
      expect(error.statusCode).toBe(503);
    });

    it('should handle request errors without response', () => {
      const axiosError = new Error('Network Error') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.request = {};
      axiosError.config = mockAxiosConfig;

      const error = NetworkErrorFactory.fromAxiosError(axiosError);
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.statusCode).toBe(0);
      expect(error.context?.url).toBe('http://test.com');
    });

    it('should handle setup errors', () => {
      const axiosError = new Error('Invalid URL') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.config = { ...mockAxiosConfig, url: 'invalid://url' };

      const error = NetworkErrorFactory.fromAxiosError(axiosError);
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.statusCode).toBe(0);
      expect(error.context?.url).toBe('invalid://url');
    });
  });

  describe('fromResponse', () => {
    it('should handle 404 responses', () => {
      const response = {
        status: 404,
        config: mockAxiosConfig,
      };

      const error = NetworkErrorFactory.fromResponse(response);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('http://test.com');
    });

    it('should handle server errors', () => {
      const response = {
        status: 500,
      };

      const error = NetworkErrorFactory.fromResponse(response);
      expect(error.code).toBe(ErrorCode.SERVER_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should handle other error responses', () => {
      const response = {
        status: 403,
      };

      const error = NetworkErrorFactory.fromResponse(response);
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('isErrorResponse', () => {
    it('should identify error responses', () => {
      expect(NetworkErrorFactory.isErrorResponse({ status: 404 })).toBe(true);
      expect(NetworkErrorFactory.isErrorResponse({ status: 500 })).toBe(true);
      expect(NetworkErrorFactory.isErrorResponse({ status: 200 })).toBe(false);
      expect(NetworkErrorFactory.isErrorResponse({ status: 299 })).toBe(false);
      expect(NetworkErrorFactory.isErrorResponse({})).toBe(false);
      expect(NetworkErrorFactory.isErrorResponse(null)).toBe(false);
    });
  });
});
