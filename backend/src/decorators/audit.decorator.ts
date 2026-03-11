import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit_metadata';

export interface AuditMetadata {
  entityType: string;
  action: string;
}

export const Audit = (entityType: string, action: string) =>
  SetMetadata(AUDIT_KEY, { entityType, action } as AuditMetadata);
