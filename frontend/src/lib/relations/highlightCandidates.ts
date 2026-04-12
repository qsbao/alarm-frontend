/**
 * Highlight candidate types.
 *
 * The actual discovery logic now lives on the backend.
 * This file only exports the types used by the frontend UI.
 */

export interface HighlightCandidate {
  operation: { id: string; name: string };
  existingOpenIssues: Array<{ id: string; title: string; status: string }>;
}
