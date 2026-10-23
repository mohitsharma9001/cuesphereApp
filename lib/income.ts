/** Income report ranges in India time — same as the website's income page. */
const IST_MS = (5 * 60 + 30) * 60_000;
const DAY_MS = 86_400_000;

export const RANGES = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['week', 'This week'],
  ['month', 'This month'],
  ['lastmonth', 'Last month'],
] as const;
export type RangeKey = (typeof RANGES)[number][0] | 'custom';

function istMidnight(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d) - IST_MS);
}

/** [from, to) for a range; custom takes YYYY-MM-DD (to is inclusive, max ~1 year). */
export function rangeBounds(range: RangeKey, now: number, fromYmd?: string, toYmd?: string): { from: Date; to: Date; label: string } | { error: string } {
  const ist = new Date(now + IST_MS);
  const [y, m, d, dow] = [ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), ist.getUTCDay()];
  const today = istMidnight(y, m, d);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  switch (range) {
    case 'yesterday':
      return { from: new Date(today.getTime() - DAY_MS), to: today, label: 'Yesterday' };
    case 'week':
      return { from: new Date(today.getTime() - ((dow + 6) % 7) * DAY_MS), to: tomorrow, label: 'This week' };
    case 'month':
      return { from: istMidnight(y, m, 1), to: tomorrow, label: 'This month' };
    case 'lastmonth':
      return { from: istMidnight(y, m - 1, 1), to: istMidnight(y, m, 1), label: 'Last month' };
    case 'custom': {
      const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
      if (!ok(fromYmd) || !ok(toYmd)) return { error: 'Choose both dates.' };
      const [fy, fm, fd] = fromYmd!.split('-').map(Number);
      const [ty, tm, td] = toYmd!.split('-').map(Number);
      const from = istMidnight(fy, fm - 1, fd);
      const to = new Date(istMidnight(ty, tm - 1, td).getTime() + DAY_MS);
      if (to <= from) return { error: 'The end date must be on or after the start date.' };
      if (to.getTime() - from.getTime() > 366 * DAY_MS) return { error: 'Choose a range of up to a year.' };
      return { from, to, label: `${fromYmd} to ${toYmd}` };
    }
    default:
      return { from: today, to: tomorrow, label: 'Today' };
  }
}
