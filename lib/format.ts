/** Formatting for money, dates and durations. Dates are always shown in India
 * time (IST, UTC+5:30), whatever the phone's own time zone — clubs, bookings and
 * bills are all in India. Done by hand rather than with Intl time zones, whose
 * support differs between Hermes builds. */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DateInput = string | number | Date | null | undefined;

interface IstParts {
  year: number;
  month: number; // 0–11
  day: number;
  weekday: number; // 0 = Sunday
  hour: number;
  minute: number;
}

/** Calendar fields of a moment as seen in India, or null for missing/invalid input. */
export function istParts(input: DateInput): IstParts | null {
  if (input === null || input === undefined || input === '') return null;
  const ms = input instanceof Date ? input.getTime() : new Date(input).getTime();
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms + IST_OFFSET_MS); // read with getUTC* = IST wall clock
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(), weekday: d.getUTCDay(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

/** ₹ with Indian digit grouping: 4820 → "₹4,820", 125000 → "₹1,25,000". Paise only when present. */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '₹0';
  const negative = amount < 0;
  const [whole, paise] = Math.abs(amount).toFixed(2).split('.');
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const grouped = rest ? `${rest},${last3}` : last3;
  return `${negative ? '-' : ''}₹${grouped}${paise !== '00' ? `.${paise}` : ''}`;
}

/** "17 Oct 2026" (year dropped when `short` and it's this year). */
export function formatDate(input: DateInput, { short = false }: { short?: boolean } = {}): string {
  const p = istParts(input);
  if (!p) return '';
  const thisYear = istParts(Date.now())?.year;
  return short && p.year === thisYear ? `${p.day} ${MONTHS[p.month]}` : `${p.day} ${MONTHS[p.month]} ${p.year}`;
}

/** "7 pm", "7:30 pm". */
export function formatTime(input: DateInput): string {
  const p = istParts(input);
  if (!p) return '';
  const h12 = p.hour % 12 || 12;
  const suffix = p.hour < 12 ? 'am' : 'pm';
  return p.minute ? `${h12}:${String(p.minute).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

/** "Fri 17 Oct, 7 pm" — for bookings, dues and payments. */
export function formatDateTime(input: DateInput): string {
  const p = istParts(input);
  if (!p) return '';
  return `${WEEKDAYS[p.weekday]} ${p.day} ${MONTHS[p.month]}, ${formatTime(input)}`;
}

/** Tournament dates: "12–14 Dec", "30 Nov – 2 Dec", or one day "12 Dec". Adds the year when it isn't this year. */
export function formatDateRange(start: DateInput, end?: DateInput): string {
  const a = istParts(start);
  const b = istParts(end);
  if (!a) return '';
  const thisYear = istParts(Date.now())?.year;
  const year = (y: number) => (y === thisYear ? '' : ` ${y}`);
  if (!b || (a.year === b.year && a.month === b.month && a.day === b.day)) return `${a.day} ${MONTHS[a.month]}${year(a.year)}`;
  if (a.year === b.year && a.month === b.month) return `${a.day}–${b.day} ${MONTHS[a.month]}${year(a.year)}`;
  if (a.year === b.year) return `${a.day} ${MONTHS[a.month]} – ${b.day} ${MONTHS[b.month]}${year(a.year)}`;
  return `${a.day} ${MONTHS[a.month]} ${a.year} – ${b.day} ${MONTHS[b.month]} ${b.year}`;
}

/** Minutes → "45 min", "1 h", "1 h 8 min". */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes) || minutes < 0) return '';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Elapsed time since `since` for running table timers: "1:09:04". */
export function formatElapsed(since: DateInput, now: number = Date.now()): string {
  const start = since instanceof Date ? since.getTime() : new Date(since ?? '').getTime();
  if (Number.isNaN(start)) return '';
  const s = Math.max(0, Math.floor((now - start) / 1000));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Today's date in India as YYYY-MM-DD (bookings are picked in India time). */
export function istTodayYmd(now: number = Date.now()): string {
  const p = istParts(now)!;
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Minutes since midnight in India right now. */
export function istMinutesNow(now: number = Date.now()): number {
  const p = istParts(now)!;
  return p.hour * 60 + p.minute;
}

/** Rupees in free text ("₹1,000", "1000 Rs") → 1000; 0 when there's no number. */
export function parseRupees(text: string | null | undefined): number {
  return Number((text ?? '').replace(/[^\d]/g, '')) || 0;
}
