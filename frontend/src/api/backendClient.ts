/**
 * Type-safe backend API client.
 *
 * After regenerating types (`pnpm generate-api`), all paths and response
 * shapes are inferred from the OpenAPI spec so contract drift is caught
 * at compile time.
 */
import createClient from 'openapi-fetch';
import type { paths } from './generated';
import { useCurrentUserStore } from '../stores/currentUserStore';

export const backend = createClient<paths>({ baseUrl: '' });

backend.use({
  onRequest({ request }) {
    const userId = useCurrentUserStore.getState().currentUser.id;
    request.headers.set('X-User-Id', userId);
    return request;
  },
});
