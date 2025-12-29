# Novel OCR Admin Panel

A production-ready admin panel for managing the Novel OCR Lookup system. Built for PI & Other Tales, Inc. to manage novel fingerprints and OCR-based content unlocking.

## Features

### ✅ Implemented
- **Authentication System**
  - Secure login with NextAuth.js
  - Session management with JWT
  - Protected routes and API endpoints
  - Role-based access control (Admin, Editor, Viewer)

- **Novel Management (CRUD)**
  - List novels with search, filter, and pagination
  - Create new novel entries with OCR fingerprints
  - Edit existing novel information
  - Delete novels (admin only)
  - Export database to CSV/JSON
  - Duplicate detection

- **Public Lookup API**
  - `/api/novel/lookup` - OCR-based novel lookup
  - Exact matching algorithm
  - Automatic lowercase normalization
  - Lookup logging for analytics
  - Response time tracking

- **Testing Interface**
  - Interactive testing tool for OCR lookups
  - Debug information display
  - Sample data loading
  - Real-time API testing

- **Dashboard**
  - Key metrics (total novels, lookups, success rate)
  - Recent activity feed
  - Quick navigation

### 🚧 Coming Soon
- Analytics dashboard with charts
- Activity logs with advanced filtering
- API key management
- Bulk import from CSV/JSON
- Settings configuration

## Tech Stack

- **Framework**: Next.js 14.2+ (App Router)
- **Language**: TypeScript 5+
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: NextAuth.js v5
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **Notifications**: Sonner (toast)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+ database
- Git

## Installation

### 1. Clone the Repository

```bash
cd ocrflutter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/novel_ocr_admin"

# NextAuth (generate secret with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="your-generated-secret-here"

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

### 4. Set Up the Database

**Push the Prisma schema:**
```bash
npm run db:push
```

**Seed the database with sample data:**
```bash
npm run db:seed
```

This creates:
- Default admin user: `admin@example.com` / `admin123`
- 3 sample novels (including "Fortunes Told")
- Sample API keys
- Sample lookup logs

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

**Admin User:**
- Email: `admin@example.com`
- Password: `admin123`

**Important:** Change this password in production!

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Admin Endpoints (Protected)
- `GET /api/admin/novels` - List novels
- `POST /api/admin/novels` - Create novel
- `GET /api/admin/novels/[id]` - Get novel
- `PUT /api/admin/novels/[id]` - Update novel
- `DELETE /api/admin/novels/[id]` - Delete novel (admin only)
- `GET /api/admin/novels/export?format=csv|json` - Export novels
- `POST /api/admin/novels/bulk-import` - Bulk import
- `POST /api/admin/test-lookup` - Test lookup (debug)

### Public Endpoints
- `POST /api/novel/lookup` - OCR lookup (production endpoint)

## Public Lookup API Usage

### Request Format

```bash
curl -X POST http://localhost:3000/api/novel/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "lines": [
      ["the", "storm", "was"],
      ["unlike", "any", "other"],
      ["felix", "had", "seen"]
    ]
  }'
```

Or use the alternative format:

```json
{
  "line1": ["the", "storm", "was"],
  "line2": ["unlike", "any", "other"],
  "line3": ["felix", "had", "seen"]
}
```

### Success Response (200)

```json
{
  "success": true,
  "match": true,
  "data": {
    "url": "https://app.example.com/fortunes-told/chapter-1",
    "title": "Fortunes Told",
    "unlockContent": "tarot_reading_1"
  },
  "responseTimeMs": 45
}
```

### No Match Response (404)

```json
{
  "success": false,
  "match": false,
  "message": "No matching novel found",
  "responseTimeMs": 32
}
```

## Database Schema

### Key Models

**Novel** - Novel entries with OCR fingerprints
- `line1`, `line2`, `line3` - First 3 words from first 3 lines (lowercase)
- `url` - Target URL to redirect to
- `language` - Language code (en, sv, it, etc.)
- `unlockContent` - Optional content ID to unlock

**LookupLog** - API request logs
- Records all lookup attempts
- Tracks success/failure, response time
- Links to matched novel (if any)

**Admin** - Admin users
- Email-based authentication
- Role-based permissions (ADMIN, EDITOR, VIEWER)

**ApiKey** - API key management
- For future rate limiting and access control

## Project Structure

```
novel-ocr-admin/
├── app/
│   ├── (auth)/
│   │   └── login/          # Login page
│   ├── dashboard/          # Protected dashboard
│   │   ├── novels/         # Novel CRUD pages
│   │   ├── test/           # Testing interface
│   │   ├── analytics/      # Analytics (placeholder)
│   │   ├── logs/           # Activity logs (placeholder)
│   │   ├── api-keys/       # API key management (placeholder)
│   │   └── settings/       # Settings (placeholder)
│   └── api/
│       ├── auth/           # NextAuth routes
│       ├── admin/          # Protected admin API
│       └── novel/          # Public API
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── layouts/            # Layout components
├── lib/
│   ├── services/           # Business logic
│   ├── validations/        # Zod schemas
│   ├── prisma.ts           # Prisma client
│   └── auth.ts             # Auth configuration
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script
└── types/                  # TypeScript types
```

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Database Commands
```bash
npm run db:push      # Push schema to database
npm run db:seed      # Seed sample data
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Generate Prisma client
```

### Linting
```bash
npm run lint
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Configure PostgreSQL database (Neon, Supabase, etc.)
5. Deploy

### Environment Variables for Production

```env
DATABASE_URL="your-production-database-url"
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://your-domain.com"
AUTH_SECRET="your-production-secret"
NEXT_PUBLIC_API_URL="https://your-domain.com"
```

## Security Considerations

1. **Change default admin password immediately**
2. **Use strong NEXTAUTH_SECRET in production**
3. **Enable HTTPS in production**
4. **Implement rate limiting for public API**
5. **Review user roles and permissions**
6. **Regular database backups**
7. **Monitor API usage and logs**

## Adding New Novels

### Via Admin Panel
1. Login to admin panel
2. Navigate to Novels > Add Novel
3. Fill in required fields:
   - Title
   - First 3 words from lines 1, 2, and 3 (will be auto-lowercased)
   - Target URL
   - Language
4. Click "Create Novel"

### Via API
```bash
curl -X POST http://localhost:3000/api/admin/novels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "title": "Your Novel Title",
    "line1": "first three words",
    "line2": "of second line",
    "line3": "of third line",
    "url": "https://your-app.com/novel",
    "language": "en"
  }'
```

## Testing the Lookup API

### Using the Admin Test Interface
1. Navigate to Dashboard > Testing
2. Enter the first 3 words from each of the first 3 lines
3. Click "Test Lookup"
4. View results and debug information

### Using cURL
```bash
curl -X POST http://localhost:3000/api/novel/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "lines": [
      ["the", "storm", "was"],
      ["unlike", "any", "other"],
      ["felix", "had", "seen"]
    ]
  }'
```

## Support

For issues and questions:
- Check the [GitHub Issues](https://github.com/your-repo/novel-ocr-admin/issues)
- Review the API specification in the project documentation
- Contact: PI & Other Tales, Inc.

## License

Proprietary - © 2024 PI & Other Tales, Inc.

## Roadmap

- [ ] Complete analytics dashboard with Recharts
- [ ] Advanced activity logs with filtering
- [ ] API key management with rate limiting
- [ ] Bulk import/export UI
- [ ] Settings page with theme toggle
- [ ] Multi-language support
- [ ] Advanced search and filtering
- [ ] Fuzzy matching for OCR errors
- [ ] Real-time updates with WebSockets
- [ ] Mobile app integration documentation

---

**Built with** ❤️ **by Claude Code for PI & Other Tales, Inc.**
