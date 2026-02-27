# Social Analytics API

App for analyzing social media engagement and finding the best posting times.

## Quick Start (Docker)

Everything runs automatically, including environment setup, DB configuration, data seeding, and tests.

### Run it:

```bash
docker compose up --build
```

Wait: The process automatically creates a `.env` file from the example, runs migrations, and executes integration tests. Once they pass, the server will start at http://localhost:3000.

Docs: API documentation is available at http://localhost:3000/docs.

---

## Manual Setup (No Docker)

You will need Node 24, pnpm, and a running Postgres instance.

### Setup:

```bash
cp .env.example .env
pnpm install
```

### Database & Data

Update `DATABASE_URL` in `.env` to your local Postgres host.

Run the setup scripts:

```bash
pnpm run pretest # Creates test DB & pushes schema
pnpm run db:seed # Imports CSV data
```

### Run

```bash
pnpm run test # Run integration tests
pnpm run dev  # Start dev server
```
