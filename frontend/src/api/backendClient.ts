/**
 * Type-safe backend API client.
 *
 * After regenerating types (`pnpm generate-api`), all paths and response
 * shapes are inferred from the OpenAPI spec so contract drift is caught
 * at compile time.
 */
import createClient from 'openapi-fetch';
import type { paths } from './generated';

export const backend = createClient<paths>({ baseUrl: '' });
