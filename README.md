# Fab Alarm Management

Fullstack monorepo: React 19 frontend + Spring Boot backend.

## Prerequisites

- **Java 17** (e.g. Amazon Corretto 17)
- **Node.js 18+**
- **pnpm** (`npm install -g pnpm`)

## Quick Start

### 1. Start the backend

```bash
cd backend
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./mvnw spring-boot:run
```

Backend starts on **http://localhost:8080**. H2 database is seeded automatically with demo data.

### 2. Start the frontend

```bash
# From repo root
pnpm install
pnpm dev:fe
```

Frontend starts on **http://localhost:5173** and proxies `/api/*` requests to the backend.

## Useful Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check (returns `{"status":"UP"}`) |
| `/v3/api-docs` | OpenAPI 3.0 spec (JSON) |
| `/swagger-ui/index.html` | Swagger UI |
| `/h2-console` | H2 database console (JDBC URL: `jdbc:h2:mem:fabalarm;MODE=MySQL`, user: `sa`, no password) |

## Regenerate TypeScript API Client

The frontend uses auto-generated types from the backend's OpenAPI spec. To regenerate after backend API changes:

```bash
# Backend must be running on :8080
pnpm generate-api
```

This runs `openapi-typescript` and outputs `frontend/src/api/generated.d.ts`. The generated file is gitignored — regenerate it locally after cloning.

## Running Tests

```bash
# Frontend tests
pnpm test:fe

# Backend tests
pnpm test:be
```

## Project Structure

```
├── frontend/          React 19 + Vite + Zustand + Tailwind
│   ├── src/api/       API client (mock + generated backend types)
│   ├── src/components/
│   ├── src/lib/       Business logic (migrating to backend)
│   └── src/stores/    Zustand stores
├── backend/           Spring Boot + Maven + H2
│   └── src/main/java/com/fabalarm/
│       ├── controller/   REST controllers
│       ├── model/        JPA entities
│       └── repository/   Spring Data repos
├── CLAUD.md           Claude Code instructions
└── pnpm-workspace.yaml
```
