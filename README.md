# ATLAS – Multi-Tenant Product Analytics

ATLAS is a secure, scalable, multi-tenant product analytics platform built for organizations to collect, process, visualize, and analyze product usage events. It provides tenant isolation, real-time analytics, team management, and performance monitoring.

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Backend:** Next.js App Router API Routes
- **Database:** PostgreSQL
- **ORM:** Prisma ORM
- **Authentication:** Auth.js
- **Validation:** Zod
- **Testing:** Vitest
- **Error Monitoring:** Sentry
- **Styling:** Tailwind CSS

## Key Features

### 1. Authentication and Organization Management
- User signup and login
- Organization creation and switching
- Team invitations and invitation acceptance
- Role-based organization membership
- Owner, Admin, and Viewer roles

### 2. API Key Management
- API key creation and revocation
- Secure API key hashing
- API key authentication
- Last-used tracking

### 3. Event Ingestion
- Single and batch event ingestion
- Batch processing up to 500 events
- Idempotency protection
- Token-bucket rate limiting
- Monthly event quota enforcement
- Machine-readable HTTP 429 quota responses

### 4. Multi-Tenant Security
- PostgreSQL Row-Level Security (RLS)
- Tenant-scoped database operations
- Transaction-local tenant context
- Tenant isolation tests
- Secure organization-level data access

### 5. Analytics Dashboard
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- Event volume analytics
- Top events
- Custom date range filtering
- Funnel analysis with 2–6 steps
- Conversion rates and drop-off analysis
- Weekly user retention analysis
- Real-time event activity using Server-Sent Events (SSE)

### 6. Data Processing and Performance
- Automated hourly and daily rollups
- Tenant-level analytics aggregation
- User activity aggregation
- Repeatable rollup processing
- Optimized 90-day DAU queries

### 7. Internal Operations
- Internal operations console
- Tenant monitoring
- Event and quota usage monitoring
- Tenant suspension management
- Request ID tracking
- Structured JSON logging

### 8. Monitoring and Observability
- Sentry error monitoring
- Frontend and backend error tracking
- Performance tracing
- Privacy-conscious data collection settings

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Harpal-Chauhan/atlas-analytics.git
cd atlas-analytics
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a local `.env` file and configure the required environment variables.

Required configuration may include:

- PostgreSQL database connection
- Auth.js authentication secret
- Application URL
- Email service API key
- Sentry configuration

Use the project's environment variable configuration as the source of truth.

**Security:** Never commit `.env`, database credentials, API keys, or Sentry authentication tokens to GitHub.

### 4. Run Database Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Start the Development Server

```bash
npm run dev
```

Open:

http://localhost:3000

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run automated tests |
| `npm run rollups` | Process analytics rollups |
| `npm run seed:events` | Generate seed events |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/events` | Ingest single or batch events |
| GET | `/api/api-keys` | List API keys |
| POST | `/api/api-keys` | Create API key |
| PATCH | `/api/api-keys/[id]` | Revoke API key |
| POST | `/api/invitations` | Invite team members |
| POST | `/api/invitations/accept` | Accept invitations |
| GET | `/api/analytics/funnel` | Retrieve funnel analytics |
| GET | `/api/analytics/retention` | Retrieve retention analytics |
| GET | `/api/analytics/export` | Export analytics data |
| GET | `/api/analytics/live` | Stream live analytics events |

## Testing

Run the automated test suite:

```bash
npx vitest run tests
```

Check TypeScript:

```bash
npx tsc --noEmit
```

Build the application:

```bash
npm run build
```

## Performance Verification

The project includes performance testing for analytics queries and event ingestion.

Verified test results:

- 5 million events generated across 5 tenants
- Event ingestion load test: 20,000 events
- Measured throughput: approximately 204 events/second
- 90-day DAU query execution: 0.909 ms in the recorded benchmark
- PostgreSQL Row-Level Security isolation tests
- Automated rollup and rate-limiting tests

Performance results depend on the database, hardware, and deployment environment.

## Security

ATLAS implements multiple security mechanisms:

- PostgreSQL Row-Level Security
- Tenant-scoped database access
- Hashed API key storage
- API key revocation
- Rate limiting
- Monthly usage quotas
- Role-based access control
- Request ID tracking
- Privacy-conscious error monitoring

## Project Status

- **Phase 1:** Authentication, organization management, and tenant isolation – Completed
- **Phase 2:** Event ingestion, rate limiting, quotas, and analytics rollups – Completed
- **Phase 3:** Analytics dashboard, funnels, retention, real-time updates, and testing – Completed
- **Phase 4:** Operations console, observability, documentation, CI/CD, and deployment – In Progress

## Repository

[GitHub – ATLAS Analytics](https://github.com/Harpal-Chauhan/atlas-analytics)

## License

This project is developed for academic and demonstration purposes.