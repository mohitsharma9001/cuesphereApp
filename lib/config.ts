/** Base URL of the CueSphere API (cuespherebackend), without /api/v1.
 * On a physical phone `localhost` is the phone itself — set
 * EXPO_PUBLIC_API_URL to your computer's LAN address, e.g. http://192.168.1.20:5100. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5100').replace(/\/$/, '');
export const API_BASE = `${API_URL}/api/v1`;

/** The CueSphere website — media (demo video, photos) and share links point here. */
export const WEBSITE_URL = (process.env.EXPO_PUBLIC_WEBSITE_URL ?? 'https://cuesphere.ashugangtok.workers.dev').replace(/\/$/, '');

/** Sales / support WhatsApp for clubs (same as the website's For Clubs page). */
export const CLUBS_WHATSAPP = '917904551660';
export const CLUBS_PHONE_DISPLAY = '+91 79045 51660';
