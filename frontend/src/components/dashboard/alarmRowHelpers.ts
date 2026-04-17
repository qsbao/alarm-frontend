import type { ActivityEntry } from '../../types';

const BAND_PALETTE = [
  'border-l-4 border-sky-500/60',
  'border-l-4 border-violet-500/60',
  'border-l-4 border-emerald-500/60',
  'border-l-4 border-amber-500/60',
  'border-l-4 border-pink-500/60',
  'border-l-4 border-indigo-500/60',
  'border-l-4 border-teal-500/60',
  'border-l-4 border-rose-500/60',
];

export function latestCommentText(activity: ActivityEntry[]): string | undefined {
  let latest: ActivityEntry | undefined;
  for (const entry of activity) {
    if (entry.type !== 'comment') continue;
    if (!latest || entry.timestamp > latest.timestamp) {
      latest = entry;
    }
  }
  return latest?.text;
}

export function sameCauseBandClass(issueId: string | undefined): string {
  if (!issueId) return 'border-l-4 border-transparent';
  let hash = 0;
  for (let i = 0; i < issueId.length; i++) {
    hash = (hash * 31 + issueId.charCodeAt(i)) >>> 0;
  }
  return BAND_PALETTE[hash % BAND_PALETTE.length];
}

export function formatEventTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} ${time}`;
}
