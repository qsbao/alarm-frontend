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
  it('has four built-in views', () => {
    expect(BUILTIN_VIEWS).toHaveLength(4);
  });

  it('includes Needs attention, In progress, Missed, Resolved', () => {
    const names = BUILTIN_VIEWS.map((v) => v.name);
    expect(names).toEqual(['Needs attention', 'In progress', 'Missed', 'Resolved']);
  });

  it('Needs attention filters: Open + active', () => {
    const view = BUILTIN_VIEWS.find((v) => v.name === 'Needs attention')!;
    expect(view.filters.status).toEqual(['Open']);
    expect(view.filters.active).toBe('active');
  });

  it('In progress filters: Acked + active', () => {
    const view = BUILTIN_VIEWS.find((v) => v.name === 'In progress')!;
    expect(view.filters.status).toEqual(['Acked']);
    expect(view.filters.active).toBe('active');
  });

  it('Missed filters: Open + recovered', () => {
    const view = BUILTIN_VIEWS.find((v) => v.name === 'Missed')!;
    expect(view.filters.status).toEqual(['Open']);
    expect(view.filters.active).toBe('recovered');
  });

  it('Resolved filters: Acked + recovered', () => {
    const view = BUILTIN_VIEWS.find((v) => v.name === 'Resolved')!;
    expect(view.filters.status).toEqual(['Acked']);
    expect(view.filters.active).toBe('recovered');
  });
});

describe('getViews', () => {
  it('returns builtins when no custom views saved', () => {
    const views = getViews();
    expect(views).toHaveLength(4);
  });

  it('returns builtins plus custom views', () => {
    saveView('My view', { status: ['Open'] });
    const views = getViews();
    expect(views).toHaveLength(5);
    expect(views[4].name).toBe('My view');
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

  it('cannot overwrite a builtin view', () => {
    expect(() => saveView('Needs attention', { status: ['Acked'] })).toThrow();
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

  it('cannot delete a builtin view', () => {
    expect(() => deleteView('Needs attention')).toThrow();
  });

  it('persists deletion to localStorage', () => {
    saveView('Gone', { status: ['Open'] });
    deleteView('Gone');
    const stored = JSON.parse(localStorageMock.getItem('fab-alarm-saved-views')!);
    expect(stored).toHaveLength(0);
  });
});
