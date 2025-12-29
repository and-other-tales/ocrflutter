# Novel OCR Lookup Admin Panel

A modern, production-ready admin panel for managing the Novel OCR Lookup system. Built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🔐 **Authentication System** - Secure login with NextAuth.js
- 📚 **Novel Management** - Full CRUD operations for novel entries
- 📊 **Analytics Dashboard** - Real-time metrics and visualizations
- 📝 **Activity Logs** - Track all lookup attempts and system activity
- 🧪 **Testing Interface** - Test OCR lookup functionality
- 🔑 **API Key Management** - Generate and manage API keys
- ⚙️ **Settings** - Configure application preferences
- 🎨 **Modern UI** - Beautiful interface with dark mode support
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Authentication:** NextAuth.js
- **State Management:** React hooks
- **Notifications:** Sonner

## Project Structure

```
ocrflutter/
├── app/
│   ├── (auth)/
│   │   └── login/              # Login page
│   ├── dashboard/
│   │   ├── novels/             # Novel management
│   │   ├── analytics/          # Analytics page
│   │   ├── logs/               # Activity logs
│   │   ├── test/               # Testing interface
│   │   ├── api-keys/           # API key management
│   │   ├── settings/           # Settings page
│   │   └── layout.tsx          # Dashboard layout
│   └── api/
│       └── admin/              # API routes
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layouts/                # Layout components
│   ├── novels/                 # Novel-specific components
│   └── common/                 # Shared components
├── lib/
│   ├── validations/            # Zod schemas
│   ├── api-client.ts           # API client
│   ├── auth.ts                 # NextAuth config
│   └── mock-data.ts            # Mock data for development
├── types/                      # TypeScript type definitions
└── public/                     # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd ocrflutter
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Authentication
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000

# Database (optional - if using separate admin DB)
DATABASE_URL=postgresql://user:password@localhost:5432/novel_admin
```

4. **Run the development server**

```bash
npm run dev
```

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

For development/demo purposes:
- **Email:** admin@example.com
- **Password:** password123

**⚠️ IMPORTANT:** Change these credentials in production!

## Development

### Running in Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

### Running Production Build

```bash
npm start
```

### Linting

```bash
npm run lint
```

## Configuration

### Authentication

The admin panel uses NextAuth.js for authentication. By default, it uses a credentials provider with hardcoded credentials for demo purposes.

**For production:**

1. Update `lib/auth.ts` to connect to your actual user database
2. Change the `NEXTAUTH_SECRET` environment variable
3. Configure additional providers if needed (OAuth, etc.)

### API Endpoints

The application includes mock API endpoints for development. To connect to a real backend:

1. Update `NEXT_PUBLIC_API_URL` in `.env.local`
2. Replace mock data handlers in `app/api/admin/` with real database queries
3. Implement proper authentication middleware

### Database Integration

Currently, the app uses in-memory mock data. To integrate with a real database:

1. Install your database client (e.g., Prisma, Drizzle)
2. Set up your database schema
3. Replace mock data imports with database queries
4. Update API routes to use your database

## API Specification

### Authentication

```typescript
POST /api/auth/callback/credentials
Body: { email, password }
```

### Novels

```typescript
GET    /api/admin/novels
POST   /api/admin/novels
GET    /api/admin/novels/:id
PUT    /api/admin/novels/:id
DELETE /api/admin/novels/:id
```

### Analytics

```typescript
GET /api/admin/analytics/overview
GET /api/admin/analytics/timeline
GET /api/admin/analytics/top-novels
```

### Logs

```typescript
GET /api/admin/logs
GET /api/admin/logs/:id
```

### Testing

```typescript
POST /api/admin/test-lookup
Body: { line1: string[], line2: string[], line3: string[] }
```

### API Keys

```typescript
GET    /api/admin/api-keys
POST   /api/admin/api-keys
PUT    /api/admin/api-keys/:id
DELETE /api/admin/api-keys/:id
```

## Deployment

### Vercel (Recommended)

1. **Push your code to GitHub**

```bash
git push origin main
```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your repository
   - Configure environment variables
   - Deploy

3. **Configure Environment Variables in Vercel**
   - Add all variables from `.env.local`
   - Update `NEXTAUTH_URL` to your production domain
   - Generate a strong `NEXTAUTH_SECRET`

### Other Platforms

#### Netlify

```bash
npm run build
# Upload .next directory to Netlify
```

#### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t novel-ocr-admin .
docker run -p 3000:3000 novel-ocr-admin
```

## Security Considerations

### Production Checklist

- [ ] Change default authentication credentials
- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Enable HTTPS
- [ ] Implement rate limiting
- [ ] Add CORS protection
- [ ] Sanitize user inputs
- [ ] Implement proper error handling
- [ ] Add logging and monitoring
- [ ] Set up database backups
- [ ] Review and update dependencies regularly

### Environment Variables

Never commit `.env.local` to version control. Use `.env.example` as a template.

## Usage Guide

### Adding a Novel

1. Navigate to **Dashboard** → **Novels**
2. Click **Add Novel**
3. Fill in the form:
   - Basic info (title, ISBN, language, URL)
   - Text fingerprint (first 3 words of first 3 lines)
4. Click **Create Novel**

### Testing Lookup

1. Navigate to **Dashboard** → **Testing**
2. Enter the first 3 words from each of the first 3 lines
3. Click **Test Lookup**
4. View the results and debug information

### Viewing Analytics

1. Navigate to **Dashboard** → **Analytics**
2. View metrics, charts, and top scanned novels
3. Analyze trends and performance data

### Managing API Keys

1. Navigate to **Dashboard** → **API Keys**
2. Click **Generate New Key**
3. Configure rate limits and permissions
4. Copy the generated key (shown only once!)

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
rm -rf .next node_modules
npm install
npm run build
```

### Type Errors

Ensure all TypeScript definitions are up to date:

```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

### API Connection Issues

- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS configuration
- Ensure the API server is running

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software for PI & Other Tales, Inc.

## Support

For questions or issues:
- Create an issue in the repository
- Contact: admin@example.com

## Acknowledgments

- Built for PI & Other Tales, Inc.
- Primary use case: "Fortunes Told" novel management
- Designed for ease of use by non-technical team members

---

**Made with ❤️ using Next.js and TypeScript**
