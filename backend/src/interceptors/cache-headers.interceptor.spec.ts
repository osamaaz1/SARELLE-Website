import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { CacheHeadersInterceptor } from './cache-headers.interceptor';

describe('CacheHeadersInterceptor', () => {
  let interceptor: CacheHeadersInterceptor;
  let mockResponse: { setHeader: jest.Mock };
  let mockNext: CallHandler;

  beforeEach(() => {
    interceptor = new CacheHeadersInterceptor();
    mockResponse = { setHeader: jest.fn() };
    mockNext = { handle: () => of({}) } as CallHandler;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockContext(
    method: string,
    url: string,
    headers: Record<string, string> = {},
  ): ExecutionContext {
    const mockRequest = { method, url, headers };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;
  }

  it('should set public cache headers for /listings route', (done) => {
    const context = createMockContext('GET', '/api/listings');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('public'),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('max-age=60'),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('s-maxage=300'),
      );
      done();
    });
  });

  it('should set longer cache for /celebrities route', (done) => {
    const context = createMockContext('GET', '/api/celebrities');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('public'),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('max-age=300'),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('s-maxage=600'),
      );
      done();
    });
  });

  it('should set short cache for /bids/auction route', (done) => {
    const context = createMockContext('GET', '/api/bids/auction/123');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('max-age=5'),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('s-maxage=10'),
      );
      done();
    });
  });

  it('should set no-cache for /health route', (done) => {
    const context = createMockContext('GET', '/api/health');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache',
      );
      done();
    });
  });

  it('should set private cache for authenticated routes', (done) => {
    const context = createMockContext('GET', '/api/dashboard', {
      authorization: 'Bearer token-123',
    });

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('private'),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('max-age=30'),
      );
      done();
    });
  });

  it('should not set cache headers for non-GET requests', (done) => {
    const context = createMockContext('POST', '/api/listings');

    interceptor.intercept(context, mockNext).subscribe(() => {
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      done();
    });
  });
});
