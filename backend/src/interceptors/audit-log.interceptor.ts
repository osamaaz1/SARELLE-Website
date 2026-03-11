import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const audit = this.reflector.get<AuditMetadata>(AUDIT_KEY, context.getHandler());
    if (!audit) return next.handle();

    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const client = this.supabase.getAdminClient();
          await client.from('wimc_audit_log').insert({
            entity_type: audit.entityType,
            action: audit.action,
            actor_id: request.user?.id || null,
            entity_id: request.params?.id || null,
            old_values: null,
            new_values: request.body && Object.keys(request.body).length > 0 ? request.body : null,
            metadata: {
              endpoint: `${request.method} ${request.url}`,
              ip: request.ip,
            },
          });
        } catch {
          // Silently fail
        }
      }),
    );
  }
}
