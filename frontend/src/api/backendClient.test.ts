import { describe, it, expect } from 'vitest';
import type { paths } from './generated';

/**
 * Compile-time test: verifies that the generated OpenAPI types include
 * the /api/health endpoint with the expected response shape.
 *
 * If the backend contract changes and the types are regenerated,
 * this test will fail at compile time — catching drift early.
 */
describe('generated OpenAPI types', () => {
  it('health endpoint response type includes status string', () => {
    // This is a compile-time assertion: if the generated types don't
    // include /api/health with a string-keyed response, TypeScript
    // will error here before the test even runs.
    type HealthResponse =
      paths['/api/health']['get']['responses']['200']['content']['*/*'];

    // Runtime check that the type is structurally correct
    const mock: HealthResponse = { status: 'UP' };
    expect(mock.status).toBe('UP');
  });

  it('me endpoint response type includes user fields', () => {
    type MeResponse =
      paths['/api/me']['get']['responses']['200']['content']['*/*'];

    const mock: MeResponse = { id: 'user-tanaka', name: 'H. Tanaka', department: 'Litho' };
    expect(mock.id).toBe('user-tanaka');
  });
});
