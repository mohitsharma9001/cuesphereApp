/** Shapes returned by the CueSphere API (same as the website's src/types). */
export interface User {
  id: string;
  email: string;
  isPlatformAdmin: boolean;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  memberId: string;
  fullName: string;
  email: string;
  mobile: string;
  city: string;
  profilePhotoUrl: string;
  preferredCue: string;
  primaryClubId: string | null;
}

export type ClubRole = 'club_admin' | 'club_staff_receptionist' | 'club_staff_referee' | 'club_staff_scorekeeper' | 'player';

export interface ClubMembership {
  id: string;
  clubId: string;
  userId: string;
  memberId: string;
  role: ClubRole;
}

export interface Club {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logoUrl: string;
  heroBannerUrl: string;
  address: string;
  phone: string;
  email: string;
  stateCode: string | null;
  cityId: string | null;
  status: 'pending' | 'approved' | 'suspended';
}

export type TournamentStatus = 'upcoming' | 'live' | 'completed';

export interface Tournament {
  id: string;
  clubId: string;
  slug: string;
  name: string;
  description: string;
  status: TournamentStatus;
  startDate: string | null;
  endDate: string | null;
  location: string;
  prizePool: string;
  entryFee: string;
  format: string;
  bestOf: number;
  maxPlayers: number;
  registrationOpen: boolean;
  imageUrl: string;
  prizeBreakdown?: { label: string; amount: string }[];
  championId?: string | null;
  runnerUpId?: string | null;
  registeredCount?: number;
  /** Only from GET /tournaments?status= (all-clubs list). */
  club?: { id: string; slug: string; name: string; logoUrl: string } | null;
  liveMatchCount?: number;
  isRegistered?: boolean;
}

export interface Registration {
  id: string;
  playerId: string;
  status: string;
  player?: { id: string; fullName: string; profilePhotoUrl?: string };
}

export type MatchStatus = 'awaiting_draw' | 'scheduled' | 'live' | 'completed';

export interface Match {
  id: string;
  kind: 'tournament' | 'friendly';
  clubId: string | null;
  tournamentId: string | null;
  round: string;
  tableNumber: number;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  status: MatchStatus;
  winnerId: string | null;
  score: string | null;
  framesWonPlayer1: number;
  framesWonPlayer2: number;
  highestBreak: number;
  currentFrameScorePlayer1: number;
  currentFrameScorePlayer2: number;
  currentBreak: number;
  currentPlayer: 1 | 2 | null;
  inFrameBreak: boolean;
  redsRemaining: number;
  bestOf: number | null;
  matchStartTime: string;
  frameScores?: { frame: number; player1Score: number; player2Score: number }[];
  currentBreakBalls?: string[];
  venueClubId?: string | null;
  /** Friendlies only. */
  friendlyState?: 'invited' | 'declined' | 'cancelled' | 'accepted' | 'pending_confirmation' | 'confirmed' | 'disputed' | null;
  createdBy?: string | null;
  /** Profile id of the player who entered the final score. */
  resultSubmittedBy?: string | null;
}

export interface RankingEntry {
  rank: number;
  playerId: string;
  name: string;
  photoUrl: string;
  points: number;
  matchesPlayed: number;
  wins: number;
  highestBreak: number;
}

export interface City {
  id: string;
  stateCode: string;
  name: string;
}

export interface IndianState {
  code: string;
  name: string;
  active: boolean;
}

export interface Friendship {
  id: string;
  requesterId: string; // user ids
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

/** Tournament stats at one club. */
export interface PlayerStatistics {
  playerId: string;
  clubId: string;
  tournamentsPlayed: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  framesWon: number;
  framesLost: number;
  highestBreak: number;
  rankingPoints: number;
  recentForm: string[];
}

export interface FriendlyStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  framesWon: number;
  framesLost: number;
  highestBreak: number;
  recentForm: ('W' | 'L')[];
}

export interface PlayerRank {
  scope: 'state' | 'city';
  code: string;
  name: string;
  rank: number;
  total: number;
}

/** Where a player is in the "open a club" journey (GET /club-enquiries/me). */
export type EnquiryStage = 'none' | 'pending' | 'rejected' | 'approved' | 'club_pending' | 'club_live';

export interface ClubEnquiry {
  id: string;
  userId: string;
  ownerName: string;
  mobile: string;
  clubName: string;
  stateCode: string;
  cityId: string;
  tables: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason: string;
  reviewedAt: string | null;
  clubId: string | null;
  createdAt: string;
}

/** An approved club the viewer runs (GET /viewer → ownedClubs). */
export interface OwnedClub {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
}
