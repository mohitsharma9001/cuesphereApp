import type { Href } from 'expo-router';

import { WEBSITE_URL } from '@/lib/config';

/** Maps a website path (or full website URL) to the app screen showing the same thing.
 * Used by push notifications (their `url` is a website path) and by opened links.
 * Returns null for pages the app doesn't have. */
export function appPathFromWeb(input: string): Href | null {
  let path = input.trim();
  if (/^https?:\/\//.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }
  path = `/${path.replace(/^\/+|\/+$/g, '')}`.split(/[?#]/)[0];
  const p = path.split('/').filter(Boolean).map(decodeURIComponent);

  if (p.length === 0) return '/';
  if (p[0] === 'play' && p[1]) return `/friendly/${p[1]}`;
  if (p[0] === 'play') return '/play';
  if (p[0] === 'matches' && p[1]) return `/match/${p[1]}`;
  if (p[0] === 'players' && p[1]) return `/player/${p[1]}`;
  if (p[0] === 'players') return '/players';
  if (p[0] === 'rankings') return '/rankings';
  if (p[0] === 'tournaments') return '/browse/tournaments';
  if (p[0] === 'clubs') return '/clubs';
  if (p[0] === 'friends') return '/friends';
  if (p[0] === 'for-clubs') return '/for-clubs';
  if (p[0] === 'login') return '/';
  if (p[0] === 'register') return '/';

  if (p[0] === 'c' && p[1]) {
    const club = `/club/${p[1]}`;
    const [section, id] = [p[2], p[3]];
    if (!section) return club as Href;
    if (section === 'tournaments' && id) return `/tournament/${p[1]}/${id}`;
    if (section === 'tournaments') return `${club}/tournaments` as Href;
    if (section === 'live' && id) return `/match/${id}`;
    if (section === 'live') return `${club}/live` as Href;
    if (section === 'account' && id === 'dues') return `${club}/dues` as Href;
    if (section === 'account') return `${club}/dashboard` as Href;
    if (section === 'book') return `${club}/book` as Href;
    if (section === 'gallery') return `${club}/gallery` as Href;
    if (section === 'hall-of-fame') return `${club}/hall-of-fame` as Href;
    if (section === 'admin' && id === 'tables') return `${club}/admin/tables` as Href;
    if (section === 'admin' && id === 'tournaments') return `${club}/admin/tournaments` as Href;
    if (section === 'admin' && id === 'live') return `${club}/admin/live` as Href;
    if (section === 'admin') return `${club}/admin` as Href;
    return club as Href;
  }
  return null;
}

/** True for links to our website (so they can open in the app). */
export function isWebsiteLink(url: string) {
  try {
    return new URL(url).host === new URL(WEBSITE_URL).host;
  } catch {
    return false;
  }
}

