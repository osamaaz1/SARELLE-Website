# Frontend Rules — Next.js 14 + Tailwind

## Route Groups

| Group | Layout | Auth Required | Use Case |
|-------|--------|--------------|----------|
| `(public)` | Navbar + Footer | No | Browse, listing detail, celebrities |
| `(dashboard)` | Navbar only | Yes (any) | Buyer dashboard, orders, checkout |
| `(seller)` | Navbar + Sidebar | Yes (seller/vip_seller) | Seller submissions, payouts |
| `(admin)` | Navbar + Sidebar | Yes (admin) | Admin panel |
| `auth/` | Minimal | No | Login, register |

## Page Pattern

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api';

export default function PageName() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await api.methodName();
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;
  // ... render
}
```

## API Client (`lib/api.ts`)

- Singleton `api` object. All API calls go through this.
- Supports mock mode: `if (USE_MOCK) return MOCK_DATA;`
- Every new API method MUST include mock mode fallback.
- Base URL from `NEXT_PUBLIC_API_URL` env var.
- Auth token attached automatically from localStorage.

### Adding a New API Method
```typescript
async newMethod(params: Params): Promise<Response> {
  if (USE_MOCK) {
    return MOCK_RESPONSE;
  }
  const res = await this.fetch('/endpoint', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.json();
}
```

## Styling

### Color Tokens (Tailwind)
Use `wimc-*` tokens defined in `tailwind.config.ts`:
- `wimc-bg` — Background (#0A0A0A)
- `wimc-surface` — Card/panel background (#141414)
- `wimc-surface-alt` — Alternative surface (#1C1C1C)
- `wimc-border` — Default border (#222222)
- `wimc-border-alt` — Alternative border (#333333)
- `wimc-white` — Text white (#FFFFFF)
- `wimc-muted` — Muted text (#AAAAAA)
- `wimc-subtle` — Subtle text (#666666)
- `wimc-dim` — Dim text (#555555)
- `wimc-red` — Primary accent (#FF4444)
- `wimc-green` — Success (#44DD66)
- `wimc-blue` — Info (#88BBFF)
- `wimc-yellow` — Warning (#FFBB44)
- `wimc-purple` — (#AA88FF)
- `wimc-orange` — (#FF8844)
- `wimc-sidebar` — Sidebar background (#0F0F0F)
- Dark theme throughout. White/gray text on dark backgrounds.

### Typography
- Headings: `font-playfair` (Playfair Display)
- Body: `font-dm-sans` (DM Sans)
- Accent/script: `font-dancing` (Dancing Script)

### Component Sizing
- Mobile-first responsive design
- Touch targets: minimum 44x44px on mobile
- Spacing: use Tailwind scale (p-4, gap-6, etc.)

## Component Library (`components/ui/`)

Existing components — use these, don't create duplicates:
- Button, Input, Select, Badge, Card, Modal
- Avatar, LoadingSpinner, EmptyState
- SearchBar, StatCard, PhotoUploader, PullToRefresh

### Marketplace Components (`components/marketplace/`)
- ProductCard, ImageGallery, FilterPanel
- OfferModal, CheckoutBreakdown, OrderStatusTimeline

## State Management

- Primary: `useState` + `useEffect` fetch pattern (current convention)
- React Query (`@tanstack/react-query`) available but not widely adopted
- Auth state: `useAuth()` context provider
- Socket state: `useSocket()` context provider
- Toast: `useToast()` — types: `success`, `error`, `info` (NOT `warning`)

## WebSocket Integration

```tsx
const { socket } = useSocket();

useEffect(() => {
  if (!socket) return;
  socket.emit('auction:join', auctionId);
  socket.on('auction:bidPlaced', handleBidUpdate);
  return () => {
    socket.emit('auction:leave', auctionId);
    socket.off('auction:bidPlaced', handleBidUpdate);
  };
}, [socket, auctionId]);
```

## Currency Formatting

Always use EGP:
```tsx
const formatPrice = (price: number) => `EGP ${price.toLocaleString()}`;
```

Never use `$` for prices.

## Image Handling

- Product images: fallback to "WIMC" text placeholder if no URL
- Use Next.js `<Image>` component when possible for optimization
- Accept: JPEG, PNG, WebP, HEIC

## Middleware

`middleware.ts` protects routes by checking `wimc_token` cookie.
Protected paths: `/dashboard/*`, `/orders/*`, `/offers/*`, `/checkout/*`, `/seller/*`, `/admin/*`.
No server-side role check — admin/seller protection is client-side only.
