## Environment Constraints

- This app runs on a **private internal network** with no access to external CDNs or remote resources
- Do NOT use Google Fonts, CDN-hosted CSS/JS, or any external URL dependencies
- All fonts, libraries, and assets must be bundled locally (e.g., install via npm/pnpm, not `<link>` tags)

## Project Setup

- This is a **pnpm workspace** monorepo (`frontend`, `backend`, `shared`)
- Use `pnpm add <pkg> --filter @skill-ide/frontend` to add frontend dependencies (not `npm install`)
- Do not `cd` into subdirectories for git or pnpm commands; use `--dir` or `--filter` flags from the root
- Prefer relative paths in CLI commands where possible
