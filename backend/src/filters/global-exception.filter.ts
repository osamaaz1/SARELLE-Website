import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly supabase: SupabaseService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : (exception instanceof Error ? exception.message : 'Internal server error');

    // Log 5xx errors to wimc_error_log
    if (status >= 500) {
      try {
        const client = this.supabase.getAdminClient();
        await client.from('wimc_error_log').insert({
          error_type: exception?.constructor?.name || 'UnknownError',
          message,
          stack_trace: exception instanceof Error ? exception.stack : undefined,
          endpoint: `${request.method} ${request.url}`,
          http_status: status,
          user_id: request.user?.id || null,
          request_body: request.body && Object.keys(request.body).length > 0 ? request.body : null,
          metadata: {
            ip: request.ip,
            user_agent: request.headers?.['user-agent'],
          },
        });
      } catch {
        // Silently fail — never break the request because of logging
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
