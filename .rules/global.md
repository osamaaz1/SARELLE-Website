# Global Rules — WIMC Project

These rules apply to ALL work on this project. Every AI session, human developer, or automated tool MUST follow them.

---

## 1. Branding

- The product name is **WIMC** or **WHATINMYCLOSET**. Never "Sarelle".
- The tagline is **"by Dina Bahgat"**.
- If you see "Sarelle" anywhere in the codebase, replace it with "WIMC" or "WHATINMYCLOSET" as contextually appropriate.
- Domain: `WHATINMYCLOSET.com`

## 2. Currency & Locale

- Currency: **Egyptian Pound (EGP)**. Format: `EGP 45,000` (no `$` symbol).
- Phone numbers: Egyptian format.
- Addresses: Egyptian (Cairo-centric, with Governorate field).
- If you see `$` used as currency in the codebase, replace with `EGP`.

## 3. Database Conventions

- All table names prefixed with `wimc_` (e.g., `wimc_listings`, `wimc_profiles`).
- Use Supabase service role key for backend operations (bypasses RLS).
- RLS enabled on all tables. Never disable RLS.
- Enums: use `wimc_` prefix (e.g., `wimc_role`, `wimc_listing_status`).
- Always use parameterized queries via Supabase SDK. Never concatenate SQL strings.

## 4. Backend Conventions (NestJS)

- All routes prefixed with `/api` (global prefix set in `main.ts`).
- Use `ValidationPipe` with `whitelist: true, transform: true` globally.
- Module pattern: `*.module.ts` + `*.service.ts` + `*.controller.ts`.
- Guards: `JwtAuthGuard` for authentication, `RolesGuard` + `@Roles()` decorator for authorization.
- Never expose sensitive data: `max_amount` (bids), `reserve_price` (auctions), seller addresses, user emails.
- Idempotency: require `idempotency_key` for state-changing operations (orders, offers).
- Stage transitions: always validate allowed transitions, always create audit trail events.

## 5. Frontend Conventions (Next.js)

- Route groups: `(public)`, `(dashboard)`, `(seller)`, `(admin)`, `auth/`.
- Auth: use `useAuth()` from `AuthProvider`. Token in `localStorage('wimc_token')`.
- API calls: use the singleton `api` object from `lib/api.ts`. Never call `fetch()` directly.
- Mock mode: support `NEXT_PUBLIC_USE_MOCK=true` for all new API methods.
- Styling: Tailwind CSS with `wimc-*` color tokens. Dark theme (#0A0A0A background).
- Fonts: Playfair Display (headings), DM Sans (body), Dancing Script (accent).
- Icons: `lucide-react` only. No other icon libraries.
- Toast notifications: use `useToast()` from toast provider. Types: `success`, `error`, `info`.

## 6. Security Rules

- Never expose `max_amount`, `reserve_price`, seller addresses, or user emails in public API responses.
- Anonymize bidder names in public bid history (first + last letter).
- Validate all inputs server-side with class-validator DTOs.
- Use Helmet for security headers. Enable CORS with configurable origins.
- Rate limit: 60 req/min global, stricter on auth endpoints.

## 7. Code Quality

- TypeScript strict mode. No `any` types unless absolutely necessary (with comment explaining why).
- Prefer `interface` over `type` for object shapes.
- Error handling: throw NestJS HTTP exceptions (BadRequestException, NotFoundException, ForbiddenException).
- No commented-out code in commits. Remove dead code.
- No `console.log` in production code. Use NestJS Logger.

## 8. File Organization

- Specs: `specs/` directory with numbered files + `specs/modules/` for per-module details.
- Rules: `.rules/` directory for governance files.
- Roles: `.roles/` directory for agent/persona definitions.
- Migrations: `backend/migrations/` with numbered SQL files.
- Shared types: `shared/types.ts` and `shared/constants.ts`.

## 9. Deployment

- Platform: Render.com via `render.yaml` blueprint.
- Backend: `backend/` root, Node environment, `npm run build && npm run start:prod`.
- Frontend: `frontend/` root, static site, `npm run build`.
- Environment variables: see `CLAUDE.md` for full list.

## 10. Communication

- Commit messages: imperative mood, concise. Example: "Add proxy bidding engine with anti-sniping".
- PR descriptions: include Summary (bullet points) + Test Plan.
- Document assumptions with `[ASSUMPTION]` label when specs are ambiguous.
