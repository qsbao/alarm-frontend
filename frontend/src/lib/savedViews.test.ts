import { describe, it, expect, beforeEach } from 'vitest';
import { getViews, saveView, deleteView, BUILTIN_VIEWS, resetCustomViews } from './savedViews';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
  resetCustomViews();
});

describe('BUILTIN_VIEWS', () => {
  it('has no built-in views', () => {
    expect(BUILTIN_VIEWS).toHaveLength(0);
  });
});

describe('getViews', () => {
  it('returns empty when no custom views saved', () => {
    const views = getViews();
    expect(views).toHaveLength(0);
  });

  it('returns custom views', () => {
    saveView('My view', { status: ['Open'] });
    const views = getViews();
    expect(views).toHaveLength(1);
    expect(views[0].name).toBe('My view');
  });
});

describe('saveView', () => {
  it('saves a custom view', () => {
    saveView('Custom', { department: ['Litho'] });
    const views = getViews();
    const custom = views.find((v) => v.name === 'Custom');
    expect(custom).toBeDefined();
    expect(custom!.filters.department).toEqual(['Litho']);
    expect(custom!.builtin).toBe(false);
  });

  it('persists to localStorage', () => {
    saveView('Persisted', { status: ['Acked'] });
    const stored = JSON.parse(localStorageMock.getItem('fab-alarm-saved-views')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Persisted');
  });

  it('overwrites existing custom view with same name', () => {
    saveView('Dup', { status: ['Open'] });
    saveView('Dup', { status: ['Acked'] });
    const views = getViews().filter((v) => v.name === 'Dup');
    expect(views).toHaveLength(1);
    expect(views[0].filters.status).toEqual(['Acked']);
  });

  it('saves sort key with the view', () => {
    saveView('Sorted', { status: ['Open'] }, 'severity');
    const view = getViews().find((v) => v.name === 'Sorted')!;
    expect(view.sortKey).toBe('severity');
  });
});

describe('deleteView', () => {
  it('removes a custom view', () => {
    saveView('ToDelete', { status: ['Open'] });
    deleteView('ToDelete');
    const views = getViews();
    expect(views.find((v) => v.name === 'ToDelete')).toBeUndefined();
  });

  it('persists deletion to localStorage', () => {
    saveView('Gone', { status: ['Open'] });
    deleteView('Gone');
    const stored = JSON.parse(localStorageMock.getItem('fab-alarm-saved-views')!);
    expect(stored).toHaveLength(0);
  });
});
