# Backend Rules — NestJS + Supabase

## Module Structure

Every feature module follows this pattern:
```
src/{module}/
  {module}.module.ts      — NestJS module with imports/providers/exports
  {module}.service.ts     — Business logic, database operations
  {module}.controller.ts  — HTTP endpoints with guards and validation
```

### Module Template
```typescript
@Module({
  imports: [AuthModule, GatewayModule, NotificationsModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],  // Only if other modules need it
})
export class FeatureModule {}
```

### Registration
- Add new modules to `app.module.ts` imports array.
- If admin needs access, also add to `admin.module.ts` imports.

## Supabase Client Usage

```typescript
// Inject SupabaseService, then:
const supabase = this.supabase.getClient();  // service role client (bypasses RLS)

// Queries
const { data, error } = await supabase
  .from('wimc_table')
  .select('*')
  .eq('column', value);

if (error) throw new BadRequestException(error.message);
```

- Always check for `error` in Supabase responses.
- Never use raw SQL — use the Supabase query builder.
- Use `.single()` when expecting exactly one row.

## Guards & Decorators

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Post('endpoint')
async handler(@CurrentUser() user) { ... }
```

- `@CurrentUser()` extracts the authenticated user from the request.
- `@Roles()` accepts one or more role strings.
- Public endpoints: no guards (or explicitly skip with metadata).

## Error Handling

| Situation | Exception |
|-----------|-----------|
| Invalid input / business rule violation | `BadRequestException` |
| Resource not found | `NotFoundException` |
| Insufficient permissions | `ForbiddenException` |
| Auth token invalid/missing | `UnauthorizedException` |

Never return raw Supabase errors to the client. Wrap them in appropriate HTTP exceptions.

## Idempotency Pattern

For state-changing operations (create order, create offer):
1. Check `wimc_idempotency_keys` for existing key
2. If found and not expired: return cached response
3. If not found: insert key → execute operation → update key with response
4. Keys expire after 24 hours

## Audit Trails

All stage/status transitions must:
1. Validate the transition is allowed
2. Create an event record (`wimc_submission_events` or `wimc_order_events`)
3. Emit WebSocket notification

## WebSocket Events

Use `WimcGateway` (injected) to emit events:
```typescript
this.gateway.emitToUser(userId, 'event:name', payload);
this.gateway.emitToAuction(auctionId, 'auction:bidPlaced', payload);
this.gateway.emitToRoom('admin', 'event:name', payload);
```

Never include sensitive data in WebSocket payloads (max_amount, reserve_price, etc.).

## Validation DTOs

Use `class-validator` decorators:
```typescript
export class CreateOfferDto {
  @IsUUID() listing_id: string;
  @IsNumber() @Min(1) amount: number;
  @IsString() idempotency_key: string;
}
```

The global `ValidationPipe` with `whitelist: true` strips unknown properties automatically.

## Testing Patterns

- Unit tests: mock SupabaseService, test business logic
- E2E tests: use Supabase test project, seed data, test full request flow
- Always test: happy path, validation errors, auth failures, edge cases
