import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Sets Cache-Control headers on GET responses.
 * - Public routes: cacheable by CDN/browser
 * - Auth-required routes: private, short TTL
 */
@Injectable()
export class CacheHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();

        if (request.method !== 'GET') return;

        const path: string = request.url || '';

        // Public, high-cache routes
        if (path.includes('/listings') && !path.includes('/admin')) {
          response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        } else if (path.includes('/celebrities')) {
          response.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
        } else if (path.includes('/bids/auction')) {
          // Auction data: short cache (live data)
          response.setHeader('Cache-Control', 'public, max-age=5, s-maxage=10');
        } else if (path.includes('/health')) {
          response.setHeader('Cache-Control', 'no-cache');
        } else if (request.headers.authorization) {
          // Auth-required: private
          response.setHeader('Cache-Control', 'private, max-age=30');
        } else {
          response.setHeader('Cache-Control', 'public, max-age=60');
        }
      }),
    );
  }
}
