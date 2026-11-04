# ATLAS – Multi-Tenant Product Analytics

ATLAS is a multi-tenant product analytics platform where companies can manage organizations, track events, and securely access their analytics data.

## Tech Stack

- Next.js 15
- TypeScript
- PostgreSQL
- Prisma ORM
- Auth.js
- Zod
- Vitest

## Features

- User signup and login
- Organization creation and switching
- Team invitations and acceptance
- Role-based organization membership
- API key creation and revocation
- Secure event ingestion API
- Event idempotency
- API key rate limiting
- PostgreSQL Row-Level Security (RLS)
- Tenant-isolated analytics rollups
- Automated RLS isolation tests

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Harpal-Chauhan/atlas-analytics.git
cd atlas-analytics
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file and configure the required database and application environment variables.

Do not upload `.env` or database credentials to GitHub.

### 4. Run database migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Start the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/events` | Ingest events |
| GET | `/api/api-keys` | List API keys |
| POST | `/api/api-keys` | Create API key |
| PATCH | `/api/api-keys/[id]` | Revoke API key |
| POST | `/api/invitations` | Invite team members |
| POST | `/api/invitations/accept` | Accept invitation |

## Testing

Run all tests:

```bash
npm test
```

Check TypeScript:

```bash
npx tsc --noEmit
```

Build the application:

```bash
npm run build
```

## Security

ATLAS uses PostgreSQL Row-Level Security (RLS) to isolate tenant data. API keys are stored as hashes, and tenant access is validated on the server.

## Project Status

Phase 1 implementation and automated tenant-isolation checks completed. Mentor review is pending.

## Repository

[GitHub – ATLAS Analytics](https://github.com/Harpal-Chauhan/atlas-analytics)
