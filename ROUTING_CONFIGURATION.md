# Routing Configuration

This document describes the routing structure for the Novel OCR Admin Panel deployed on Google Cloud Run.

## Route Structure

### Public Routes

| Route | Method | Behavior | Description |
|-------|--------|----------|-------------|
| `/` | GET | Redirect to `https://othertales.co` | Root redirects to main company website |
| `/admin` | GET | Login page | Admin login interface |
| `/api/*` | ALL | Direct API access | All API endpoints are publicly accessible |

### Protected Routes (Require Authentication)

| Route | Method | Behavior | Description |
|-------|--------|----------|-------------|
| `/dashboard` | GET | Dashboard home | Admin panel dashboard |
| `/dashboard/novels` | GET | Novel management | CRUD for novel entries |
| `/dashboard/novels/new` | GET | Create novel | New novel form |
| `/dashboard/novels/[id]` | GET | Edit novel | Edit specific novel |
| `/dashboard/novels/import` | GET | Bulk import | CSV/JSON bulk import |
| `/dashboard/analytics` | GET | Analytics dashboard | Charts and metrics |
| `/dashboard/logs` | GET | Activity logs | Lookup logs with filters |
| `/dashboard/logs/[id]` | GET | Log details | Single log entry |
| `/dashboard/test` | GET | Testing interface | API lookup tester |
| `/dashboard/api-keys` | GET | API key management | Generate and manage keys |
| `/dashboard/settings` | GET | Settings | User and system settings |

### API Routes (Public)

| Route | Method | Description | Authentication |
|-------|--------|-------------|----------------|
| `/api/health` | GET | Health check endpoint | None |
| `/api/novel/lookup` | POST | OCR lookup endpoint | API key or IP rate limit |

### API Routes (Protected)

| Route | Method | Description | Authentication |
|-------|--------|-------------|----------------|
| `/api/auth/[...nextauth]` | ALL | NextAuth.js handler | Session-based |
| `/api/admin/*` | ALL | Admin API routes | Session required |

## Authentication Flow

1. **Unauthenticated User**:
   - Visits `/` → Redirects to `https://othertales.co`
   - Visits `/admin` → Shows login page
   - Visits `/dashboard/*` → Redirects to `/admin`
   - Visits `/api/admin/*` → Returns 401 Unauthorized

2. **Authenticated User**:
   - Visits `/` → Redirects to `https://othertales.co`
   - Visits `/admin` → Shows login page (already logged in)
   - Visits `/dashboard/*` → Accesses dashboard
   - Visits `/api/admin/*` → API access granted

3. **Logout**:
   - Click logout → Redirects to `/admin`

## Configuration Files

### 1. Root Redirect (`app/page.tsx`)
```typescript
import { redirect } from "next/navigation"

export default function Home() {
  // Redirect root to main website
  redirect("https://othertales.co")
}
```

### 2. Admin Login (`app/admin/page.tsx`)
- Displays login form
- Uses NextAuth.js credentials provider
- Redirects to `/dashboard` on successful login

### 3. Middleware (`middleware.ts`)
```typescript
export const config = {
  matcher: ["/dashboard/:path*", "/api/admin/:path*"],
}
```
Protects dashboard and admin API routes.

### 4. Auth Configuration (`lib/auth.ts`)
```typescript
pages: {
  signIn: "/admin",
  error: "/admin",
}
```
Configures NextAuth.js to use `/admin` as the login page.

## Changes from Previous Configuration

### Before
- `/` → Redirected to `/dashboard`
- `/login` → Admin login page
- Logout → Redirected to `/login`

### After
- `/` → Redirects to `https://othertales.co`
- `/admin` → Admin login page
- Logout → Redirects to `/admin`

## URL Examples

### Production (Cloud Run)
```
https://your-service-url                    → https://othertales.co
https://your-service-url/admin              → Admin login
https://your-service-url/dashboard          → Dashboard (auth required)
https://your-service-url/api/health         → Health check
https://your-service-url/api/novel/lookup   → OCR lookup API
```

### Local Development
```
http://localhost:3000                       → https://othertales.co
http://localhost:3000/admin                 → Admin login
http://localhost:3000/dashboard             → Dashboard (auth required)
http://localhost:3000/api/health            → Health check
http://localhost:3000/api/novel/lookup      → OCR lookup API
```

## Testing Routes

### Test Root Redirect
```bash
curl -I https://your-service-url/
# Should return 307 with Location: https://othertales.co
```

### Test Admin Login
```bash
# Visit in browser
open https://your-service-url/admin
```

### Test Protected Route
```bash
# Without auth - should redirect to /admin
curl -I https://your-service-url/dashboard

# With auth - should return 200
curl -I -H "Cookie: next-auth.session-token=..." https://your-service-url/dashboard
```

### Test Public API
```bash
# Should work without auth (with rate limiting)
curl -X POST https://your-service-url/api/novel/lookup \
  -H "Content-Type: application/json" \
  -d '{"line1":["the","storm","was"],"line2":["unlike","any","other"],"line3":["felix","had","seen"]}'
```

## Security Considerations

1. **Root Redirect**: Prevents exposing admin panel at root URL
2. **Admin Path**: Less obvious than `/login`, provides minor security through obscurity
3. **API Routes**: Publicly accessible but rate-limited
4. **Protected Routes**: Middleware ensures authentication before access
5. **External Redirect**: Users land on company website, admin panel is separate

## Mobile App Integration

For the Flutter OCR app:
- Use `/api/novel/lookup` endpoint directly
- Include `X-API-Key` header for higher rate limits
- Root redirect doesn't affect API functionality

## Deployment Checklist

When deploying, verify:
- [ ] `/` redirects to `https://othertales.co`
- [ ] `/admin` shows login page
- [ ] `/dashboard` requires authentication
- [ ] `/api/health` returns healthy status
- [ ] `/api/novel/lookup` accepts POST requests
- [ ] Logout redirects to `/admin`
- [ ] Invalid routes show 404 page

## Troubleshooting

### Root redirect loops
- Check NEXTAUTH_URL environment variable
- Verify no circular redirects in middleware

### Cannot access admin
- Ensure `/admin` route exists
- Check NextAuth configuration points to `/admin`
- Verify environment variables are set

### API endpoints not working
- Check `/api` routes are not blocked by middleware
- Verify rate limiting is configured correctly
- Test health endpoint first: `/api/health`
