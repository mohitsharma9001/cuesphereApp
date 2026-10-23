import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_URL } from './config';

/** Room names used by the API's live signals (same as the website). */
export const liveMatchChannel = (matchId: string) => `live:match:${matchId}`;
/** Any table in the club changed. */
export const liveClubChannel = (clubId: string) => `live:club:${clubId}`;

let socket: Socket | null = null;
const rooms = new Map<string, number>();

function getSocket() {
  if (!socket) {
    socket = io(API_URL, { transports: ['websocket'] });
    socket.on('connect', () => rooms.forEach((_n, room) => socket?.emit('subscribe', room)));
  }
  return socket;
}

/** Calls onSignal when the API says this room changed (e.g. a ball was potted).
 * The event carries no data — the screen refetches. Bursts are collapsed. */
export function useLiveSignal(room: string | null, onSignal: () => void, minGapMs = 400) {
  const callback = useRef(onSignal);
  useEffect(() => {
    callback.current = onSignal;
  });

  useEffect(() => {
    if (!room) return;
    const s = getSocket();
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fire = (payload?: { room?: string }) => {
      if (payload?.room !== room) return;
      const wait = minGapMs - (Date.now() - last);
      if (wait <= 0) {
        last = Date.now();
        callback.current();
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          last = Date.now();
          callback.current();
        }, wait);
      }
    };

    const n = rooms.get(room) ?? 0;
    rooms.set(room, n + 1);
    if (n === 0) s.emit('subscribe', room);
    s.on('changed', fire);

    return () => {
      if (timer) clearTimeout(timer);
      s.off('changed', fire);
      const left = (rooms.get(room) ?? 1) - 1;
      if (left > 0) rooms.set(room, left);
      else {
        rooms.delete(room);
        s.emit('unsubscribe', room);
      }
    };
  }, [room, minGapMs]);
}
