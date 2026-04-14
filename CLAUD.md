## Environment Constraints

- This app runs on a **private internal network** with no access to external CDNs or remote resources
- Do NOT use Google Fonts, CDN-hosted CSS/JS, or any external URL dependencies
- All fonts, libraries, and assets must be bundled locally (e.g., install via npm/pnpm, not `<link>` tags)

## Project Setup

- This is a **pnpm workspace** monorepo (`frontend/`, `backend/`)
- Frontend: `pnpm add <pkg> --filter @fab-alarm/frontend` (not `npm install`)
- Backend: Java 17 + Spring Boot + Maven in `backend/` (use `./mvnw` wrapper, set `JAVA_HOME` to JDK 17)
- Do not `cd` into subdirectories for git or pnpm commands; use `--dir` or `--filter` flags from the root
- Prefer relative paths in CLI commands where possible
- OpenAPI types auto-generated: run `pnpm generate-api` from root (requires backend running on :8080)

## Lesson learned
- Reset the proxy env before gh command

