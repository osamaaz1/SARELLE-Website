# Quality & Review Checklists

## Pre-Commit Checklist

### Backend Changes
- [ ] TypeScript compiles: `cd backend && npx tsc --noEmit`
- [ ] Lint passes: `npm run lint`
- [ ] New module registered in `app.module.ts`
- [ ] Auth guards applied to protected endpoints
- [ ] Role decorators match spec (see `specs/05-SECURITY.md` RBAC matrix)
- [ ] Sensitive data excluded from API responses (max_amount, reserve_price, emails)
- [ ] DTOs have class-validator decorators
- [ ] Supabase queries check for errors
- [ ] WebSocket events emitted for real-time features
- [ ] Audit trail entries created for state transitions
- [ ] Database migration included for schema changes
- [ ] No `console.log` (use NestJS Logger)
- [ ] No `any` types without justification comment

### Frontend Changes
- [ ] TypeScript compiles: `cd frontend && npx tsc --noEmit`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build` (catches SSR/prerender issues)
- [ ] Mock mode works: test with `NEXT_PUBLIC_USE_MOCK=true`
- [ ] Uses `api` singleton (not raw fetch)
- [ ] Uses existing UI components (check `components/ui/` first)
- [ ] Currency shown as EGP (not $)
- [ ] Brand name is WIMC/WHATINMYCLOSET (not Sarelle)
- [ ] Responsive at 375px width
- [ ] Touch targets >= 44px on mobile
- [ ] Toast types valid: success, error, info
- [ ] Loading states handled (spinner or skeleton)
- [ ] Error states handled (user-friendly message)
- [ ] `useSearchParams` wrapped in `<Suspense>` (Next.js requirement)

### Database Changes
- [ ] Migration file numbered sequentially
- [ ] Uses `IF NOT EXISTS` for idempotent creates
- [ ] RLS policies added for new tables
- [ ] Indexes on foreign keys and frequently queried columns
- [ ] TIMESTAMPTZ (not TIMESTAMP) for all date columns
- [ ] `updated_at` trigger registered

---

## PR Review Checklist

### Structure
- [ ] Changes match the described intent
- [ ] No unrelated changes included
- [ ] Files in correct directories per project structure
- [ ] No new files that duplicate existing functionality

### Security (see `.rules/security.md`)
- [ ] No sensitive data exposure
- [ ] Auth/role guards present
- [ ] Input validation complete
- [ ] No SQL injection vectors
- [ ] No XSS vectors
- [ ] Idempotency for state-changing operations

### Business Logic (see `specs/03-BUSINESS-RULES.md`)
- [ ] State transitions follow valid paths
- [ ] Pricing calculations correct
- [ ] Notifications triggered for relevant events
- [ ] Audit trail maintained

### Performance
- [ ] No N+1 query patterns
- [ ] Pagination on list endpoints (max 100 per page)
- [ ] No unbounded array operations
- [ ] Database indexes for new query patterns

---

## Feature Completion Checklist

Before marking a feature as "done":

### Functionality
- [ ] Happy path works end-to-end (frontend → API → database → response)
- [ ] Error cases handled gracefully
- [ ] Edge cases considered (empty states, max limits, concurrent access)
- [ ] Mock mode returns realistic data

### Documentation
- [ ] API endpoints documented in `specs/01-API-REFERENCE.md`
- [ ] Database changes documented in `specs/02-DATABASE-SCHEMA.md`
- [ ] Business rules documented in `specs/03-BUSINESS-RULES.md`
- [ ] Module spec created/updated in `specs/modules/`

### Integration
- [ ] WebSocket events work in real-time
- [ ] Notifications created for relevant actions
- [ ] Related features still work (e.g., changing listings doesn't break orders)

---

## Deployment Checklist

### Pre-Deploy
- [ ] All environment variables set on target environment
- [ ] Database migrations applied to production Supabase
- [ ] `npm run build` succeeds for both frontend and backend
- [ ] No hardcoded localhost URLs
- [ ] CORS_ORIGIN includes production frontend URL

### Post-Deploy
- [ ] Health check endpoint responds
- [ ] Login/register flow works
- [ ] Browse page loads listings
- [ ] WebSocket connection established
- [ ] Images load (if photo storage configured)
- [ ] Check Supabase advisors for security/performance issues

---

## Incident Response Checklist

### When Something Breaks
1. Check backend logs: Render dashboard → backend service → Logs
2. Check Supabase logs: Dashboard → Logs → API / Auth / Postgres
3. Check frontend build: Render dashboard → frontend service → Events
4. Check database: Supabase → Table Editor → verify data integrity
5. Check WebSocket: Browser DevTools → Network → WS tab

### Common Issues
| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 401 on all requests | Token expired or invalid | Re-login, check JWT_SECRET |
| 500 on database operations | Supabase down or RLS issue | Check Supabase status, verify RLS policies |
| WebSocket disconnects | Server restart or connection limit | Reconnect, check gateway logs |
| Images not loading | Storage bucket permissions | Check Supabase Storage RLS |
| Build fails | TypeScript error or missing dep | Run `npx tsc --noEmit` locally |
