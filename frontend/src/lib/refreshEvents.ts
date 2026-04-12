type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Minimal pub/sub for signalling that issue data has been mutated externally
 * (e.g. by the dev panel) and consumers should re-fetch.
 */
export const refreshEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit(): void {
    listeners.forEach((l) => l());
  },
};
