# Mar 2025 Financial Dashboard

A MEAN stack (MongoDB, Express, Angular, Node.js) dashboard for Mar 2025 crypto payment data analysis.

## Features

- **Dashboard** — Summary cards, bar charts (Result by Member, Amount by Date), donut chart (Transaction share), member table
- **Transactions** — Searchable and sortable transaction table with pagination
- Dark-themed UI with blue/navy color scheme
- Chart.js for interactive visualizations

## Prerequisites

- Node.js 18+
- MongoDB running locally on port 27017 (or set `MONGO_URI` env var)
- Angular CLI 16: `npm install -g @angular/cli@16`

## Setup

### 1. Backend

```bash
cd mar2025-dashboard/backend
npm install
```

Seed the database with Mar 2025 data:

```bash
node seed.js
```

Start the backend server (port 3000):

```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 2. Frontend

```bash
cd mar2025-dashboard/frontend
npm install
npm start
```

The Angular dev server starts on **http://localhost:4200**

## API Endpoints

| Method | Endpoint           | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | /api/transactions  | All 24 transactions                  |
| GET    | /api/members       | All 16 member summaries              |
| GET    | /api/summary       | Aggregated totals                    |
| GET    | /api/health        | Health check                         |

## Project Structure

```
mar2025-dashboard/
├── backend/
│   ├── server.js           # Express app, MongoDB connection
│   ├── seed.js             # Data seeder
│   ├── models/
│   │   ├── Transaction.js  # Mongoose transaction schema
│   │   └── Member.js       # Mongoose member schema
│   └── routes/
│       ├── transactions.js # Transaction API routes
│       └── members.js      # Member API routes
└── frontend/
    ├── angular.json
    ├── tsconfig.json
    └── src/
        └── app/
            ├── app.module.ts
            ├── app-routing.module.ts
            ├── app.component.*         # Shell + navigation
            ├── services/
            │   └── data.service.ts     # HTTP client service
            └── components/
                ├── dashboard/          # Overview, charts, tables
                └── transactions/       # Searchable transaction list
```

## Environment Variables

| Variable   | Default                                   | Description          |
|------------|-------------------------------------------|----------------------|
| MONGO_URI  | mongodb://localhost:27017/mar2025dashboard | MongoDB connection   |

## Quick Start (all-in-one)

```bash
# Terminal 1 — Backend
cd mar2025-dashboard/backend && npm install && node seed.js && npm start

# Terminal 2 — Frontend
cd mar2025-dashboard/frontend && npm install && npm start
```

Then open **http://localhost:4200**
