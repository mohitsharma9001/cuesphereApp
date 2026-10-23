/** Club tables, timers and bills — shapes from the API's table endpoints, and
 * the same bill maths as the website (types/tables.ts there). */

export type PaymentMethod = 'cash' | 'upi' | 'card';
export type SplitMode = 'loser' | 'split' | 'custom';

export interface ClubTable {
  id: string;
  tableNumber: number;
  name: string;
  hourlyRate: number;
  active: boolean;
}

export interface LineupEntry {
  name: string;
  playerId: string | null;
}

export interface TableSession {
  id: string;
  tableId: string;
  players: string[];
  lineup: LineupEntry[];
  playerName: string;
  bookingId: string | null;
  startedAt: string;
  endedAt: string | null;
  hourlyRate: number;
  minutes: number | null;
  amount: number | null;
  paid: boolean;
}

export interface OutstandingCharge {
  id: string;
  sessionId: string;
  payerName: string;
  payerPlayerId: string | null;
  splitMode: SplitMode | null;
  amount: number;
  paid: boolean;
  tableNumber: number | null;
  opponents: string[];
  minutes: number;
  startedAt: string;
}

export interface TableBooking {
  id: string;
  tableId: string | null;
  playerId: string;
  playerName: string;
  startAt: string;
  durationMinutes: number;
  status: 'requested' | 'confirmed' | 'rejected' | 'cancelled' | 'started' | 'no_show';
  note: string;
}

export interface DaySummary {
  collected: number;
  byMethod: Record<PaymentMethod, number>;
  unpaid: number;
  playing: number;
  free: number;
  bookedToday: number;
}

export interface TablesOverview {
  tables: ClubTable[];
  open: TableSession[];
  outstanding: { unsplit: TableSession[]; charges: OutstandingCharge[] };
  bookings: TableBooking[];
  summary: DaySummary;
}

export interface Share {
  payerName: string;
  payerPlayerId: string | null;
  amount: number;
}

/** Billed minutes (rounded up, at least 1) and amount (rupees, rounded up). */
export function billFor(startedAt: string, endedAt: string | number | Date, hourlyRate: number) {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return { minutes, amount: Math.ceil((hourlyRate * minutes) / 60) };
}

/** ₹340 between 2 → [170, 170]; ₹341 → [171, 170] (the extra rupees go first). */
export function splitEqually(amount: number, people: number): number[] {
  const n = Math.max(1, people);
  const base = Math.floor(amount / n);
  return Array.from({ length: n }, (_, i) => base + (i < amount - base * n ? 1 : 0));
}

export const METHOD_LABEL: Record<PaymentMethod, string> = { cash: 'Cash', upi: 'UPI', card: 'Card' };
