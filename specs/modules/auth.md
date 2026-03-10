# Module: Auth

## Ownership
- Backend: `backend/src/auth/`
- Frontend: `frontend/src/providers/auth-provider.tsx`, `frontend/src/app/auth/`

## Purpose
Handles user registration, login, session management, and JWT validation.

## Backend Components

### AuthModule (`auth.module.ts`)
- Imports: `SupabaseModule`
- Providers: `AuthService`, `JwtAuthGuard`, `RolesGuard`
- Exports: `AuthService`, `JwtAuthGuard`, `RolesGuard`

### AuthService (`auth.service.ts`)
- `register(email, password, role, displayName)` — Creates Supabase auth user + `wimc_profiles` row
- `login(email, password)` — Supabase `signInWithPassword`, returns session
- `getProfile(userId)` — Fetches `wimc_profiles` row

### AuthController (`auth.controller.ts`)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | None | Create account |
| POST | `/auth/login` | None | Sign in |
| GET | `/auth/me` | JWT | Get current profile |

### Guards
- **JwtAuthGuard**: Extracts Bearer token, calls `supabase.auth.getUser(token)`, attaches user to request
- **RolesGuard**: Reads `@Roles()` decorator, checks `user.role` against allowed roles

## Frontend Components

### AuthProvider (`providers/auth-provider.tsx`)
- Context: `{ user, loading, login, register, logout }`
- Token storage: `localStorage('wimc_token')` + document cookie
- Auto-fetches `/auth/me` on mount if token exists

### Pages
- `/auth/login` — Email + password form, redirect param support via `useSearchParams` (wrapped in Suspense)
- `/auth/register` — Email + password + display name + role selection (buyer/seller dropdown)

### Middleware (`middleware.ts`)
- Protects: `/dashboard/*`, `/orders/*`, `/offers/*`, `/checkout/*`, `/seller/*`, `/admin/*`
- Checks `wimc_token` cookie presence only (no role check)

## Validation Rules
- Email: valid format (Supabase validates)
- Password: 8+ chars, 1 uppercase, 1 lowercase, 1 digit
- Display name: 2+ chars
- Role: `buyer` or `seller` (registration only)

## Known Gaps
- No server-side role check in Next.js middleware
- No password reset flow
- No email verification (auto-confirmed)
- No 2FA/MFA
- No refresh token rotation
