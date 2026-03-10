# Maintenance Instructions

## For AI Sessions

### Starting a New Session

When starting work on this project, read these files in order:

1. **`CLAUDE.md`** — Project overview, architecture, known issues
2. **`.rules/global.md`** — Universal rules (branding, currency, conventions)
3. **Relevant rule file** — `.rules/backend.md`, `.rules/frontend.md`, or `.rules/database.md`
4. **Relevant spec** — From `specs/` based on the task area
5. **Relevant module spec** — From `specs/modules/` for the specific feature

### Understanding the Codebase

| Question | Where to Look |
|----------|--------------|
| What's the project about? | `specs/00-PROJECT-OVERVIEW.md` |
| What API endpoints exist? | `specs/01-API-REFERENCE.md` |
| What's the database schema? | `specs/02-DATABASE-SCHEMA.md` |
| What are the business rules? | `specs/03-BUSINESS-RULES.md` |
| What frontend pages exist? | `specs/04-FRONTEND-ROUTES.md` |
| How does security work? | `specs/05-SECURITY.md` |
| What's missing/broken? | `specs/06-KNOWN-GAPS.md` |
| What should be built next? | `specs/07-IMPLEMENTATION-ROADMAP.md` |
| How do I verify my work? | `specs/08-QUALITY-CHECKLISTS.md` |
| What are the performance issues? | `specs/10-PERFORMANCE.md` |
| How does module X work? | `specs/modules/{module}.md` |

### After Making Changes

1. **Update specs** if you added/changed API endpoints, database tables, or business rules
2. **Update module specs** if you modified a specific module's behavior
3. **Update known gaps** if you fixed a gap or discovered a new one
4. **Update roadmap** if you completed a roadmap item
5. **Run verification**: `cd backend && npx tsc --noEmit` and `cd frontend && npx tsc --noEmit`

---

## Spec File Maintenance

### When to Update Each File

| File | Update When... |
|------|---------------|
| `00-PROJECT-OVERVIEW.md` | Architecture changes, new tech added, business model changes |
| `01-API-REFERENCE.md` | Any endpoint added, modified, or removed |
| `02-DATABASE-SCHEMA.md` | Any table, column, or index added/changed |
| `03-BUSINESS-RULES.md` | Any business logic rule added/changed |
| `04-FRONTEND-ROUTES.md` | Any page, route, or component added/changed |
| `05-SECURITY.md` | Auth, RBAC, or security behavior changes |
| `06-KNOWN-GAPS.md` | Gap fixed (remove) or new gap found (add) |
| `07-IMPLEMENTATION-ROADMAP.md` | Task completed (mark done) or priorities change |
| `08-QUALITY-CHECKLISTS.md` | New verification steps needed |
| `10-PERFORMANCE.md` | Performance fix completed, new bottleneck found, or optimization rule added |
| `modules/*.md` | Any change to a specific module |

### How to Update

- Keep the same format and structure as existing entries
- Mark completed roadmap items with ~~strikethrough~~ or move to a "Completed" section
- When fixing a known gap, remove it from `06-KNOWN-GAPS.md` and note the fix
- When adding a new API endpoint, add it to BOTH `01-API-REFERENCE.md` AND the relevant `modules/*.md`

---

## Rules File Maintenance

### `.rules/` Directory

| File | Purpose | Update When... |
|------|---------|---------------|
| `global.md` | Universal project rules | New convention established |
| `backend.md` | NestJS patterns | New backend pattern adopted |
| `frontend.md` | Next.js patterns | New frontend pattern adopted |
| `database.md` | Database conventions | New migration pattern or naming convention |
| `security.md` | Security requirements | New security requirement or vulnerability |

**Rule**: Never remove a rule without discussion. Rules accumulate institutional knowledge.

---

## Role File Maintenance

### `.roles/` Directory

| File | Purpose | Update When... |
|------|---------|---------------|
| `backend-engineer.md` | Backend dev context | New backend patterns or reference modules |
| `frontend-engineer.md` | Frontend dev context | New frontend patterns or reference pages |
| `product-owner.md` | Product context | Business model or user understanding changes |
| `code-reviewer.md` | Review standards | New review criteria needed |

---

## Database Migration Maintenance

### Adding a New Migration

1. Number sequentially: next is `006_*.sql`
2. Place in `backend/migrations/`
3. Use `IF NOT EXISTS` for idempotent execution
4. Include comments explaining the change
5. Update `specs/02-DATABASE-SCHEMA.md` with new tables/columns
6. Apply to Supabase via SQL Editor or CLI

### Current Migration State
```
001_wimc_schema.sql        — Full schema (17 tables, enums, RLS)
002_seed_test_data.sql     — Test data
004_bidding_system.sql     — Auctions + bids tables
005_storage_buckets.sql    — Supabase storage
```

Note: `003_test_users.sql` was deleted (content merged into 002).

---

## Common Tasks Reference

### Add a New Backend Module
1. Create `src/{module}/` with module.ts, service.ts, controller.ts
2. Register in `app.module.ts` imports
3. If admin-accessible, add to `admin.module.ts`
4. Create migration if new tables needed
5. Add module spec in `specs/modules/{module}.md`
6. Update `specs/01-API-REFERENCE.md`

### Add a New Frontend Page
1. Create page in correct route group directory
2. Use `api` singleton for data fetching
3. Add mock mode support
4. Update `specs/04-FRONTEND-ROUTES.md`

### Add a New Database Table
1. Create migration file in `backend/migrations/`
2. Add RLS policies
3. Add indexes on FKs and query columns
4. Update `specs/02-DATABASE-SCHEMA.md`
5. Update `shared/types.ts` if new TypeScript interface needed

### Fix a Known Gap
1. Implement the fix
2. Remove entry from `specs/06-KNOWN-GAPS.md`
3. Update relevant roadmap item in `specs/07-IMPLEMENTATION-ROADMAP.md`
4. Update affected spec files

---

## File Tree Summary

```
project/
├── CLAUDE.md                          # AI assistant instructions
├── specs/
│   ├── 00-PROJECT-OVERVIEW.md         # Product identity & architecture
│   ├── 01-API-REFERENCE.md            # All API endpoints
│   ├── 02-DATABASE-SCHEMA.md          # Database tables & schema
│   ├── 03-BUSINESS-RULES.md           # Business logic rules
│   ├── 04-FRONTEND-ROUTES.md          # Frontend pages & components
│   ├── 05-SECURITY.md                 # Auth, RBAC, data privacy
│   ├── 06-KNOWN-GAPS.md              # Gaps, risks, assumptions
│   ├── 07-IMPLEMENTATION-ROADMAP.md   # Prioritized feature roadmap
│   ├── 08-QUALITY-CHECKLISTS.md       # Review & deployment checklists
│   ├── 09-MAINTENANCE.md             # This file
│   ├── 10-PERFORMANCE.md             # Performance scan & optimization plan
│   └── modules/
│       ├── auth.md                    # Auth module spec
│       ├── bids.md                    # Proxy bidding module spec
│       ├── listings.md                # Listings module spec
│       ├── notifications.md           # Notifications module spec
│       ├── offers.md                  # Offers module spec
│       ├── orders.md                  # Orders module spec
│       ├── payouts.md                 # Payouts module spec
│       ├── storage.md                 # File upload module spec
│       └── submissions.md            # Submissions module spec
├── .rules/
│   ├── global.md                      # Universal project rules
│   ├── backend.md                     # NestJS conventions
│   ├── frontend.md                    # Next.js conventions
│   ├── database.md                    # PostgreSQL/Supabase conventions
│   └── security.md                    # Security requirements
├── .roles/
│   ├── backend-engineer.md            # Backend developer persona
│   ├── frontend-engineer.md           # Frontend developer persona
│   ├── product-owner.md               # Product owner persona
│   └── code-reviewer.md              # Code reviewer persona
├── frontend/                          # Next.js 14 application
├── backend/                           # NestJS 10 application
├── shared/                            # Shared types & constants
└── render.yaml                        # Deployment config
```
