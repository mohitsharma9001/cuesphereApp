import type { PlayerProfile } from './types';

/** Same rule as the website: these must be filled to register for tournaments (a photo is optional). */
export const REQUIRED_PROFILE_FIELDS = ['fullName', 'mobile', 'email', 'dob', 'city', 'emergencyContact'] as const;
export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export const PROFILE_FIELD_LABELS: Record<RequiredProfileField, string> = {
  fullName: 'Full Name',
  mobile: 'Mobile Number',
  email: 'Email',
  dob: 'Date of Birth',
  city: 'City',
  emergencyContact: 'Emergency Contact',
};

export type EditableProfile = Pick<PlayerProfile, 'fullName' | 'mobile' | 'city' | 'profilePhotoUrl' | 'preferredCue' | 'email'> & {
  dob: string; // YYYY-MM-DD
  emergencyContact: string;
};

export function profileCompletion(p: Partial<EditableProfile> | null | undefined) {
  const missing = REQUIRED_PROFILE_FIELDS.filter((f) => !String(p?.[f] ?? '').trim());
  const percent = Math.round(((REQUIRED_PROFILE_FIELDS.length - missing.length) / REQUIRED_PROFILE_FIELDS.length) * 100);
  return { percent, missing, isComplete: missing.length === 0 };
}

/** Completion of the signed-in player's own profile as /viewer returns it
 * (dob may be a full date string; email falls back to the account's). */
export function viewerProfileCompletion(profile: PlayerProfile | null | undefined, accountEmail: string) {
  if (!profile) return profileCompletion(null);
  const p = profile as PlayerProfile & { dob?: string | null; emergencyContact?: string | null };
  return profileCompletion({ ...p, email: p.email || accountEmail, dob: p.dob ? String(p.dob) : '', emergencyContact: p.emergencyContact ?? '' });
}
