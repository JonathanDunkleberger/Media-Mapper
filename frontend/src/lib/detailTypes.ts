// Unified enriched media detail schema used by /api/details
import { MediaType } from './types';

export interface BaseRecommendationSummary {
  id: number | string;
  type: MediaType;
  title: string;
  year: number | null;
  posterUrl: string | null;
  sublabel?: string | null; // e.g. MOVIE • 2024
}

export interface HowLongToBeatTimes {
  mainStory?: number; // minutes
  mainExtra?: number; // minutes
  completionist?: number; // minutes
}

export interface StreamingAvailabilityItem {
  service: string; // e.g. netflix
  type: 'subscription' | 'rent' | 'buy' | 'free';
  url?: string;
  quality?: string; // e.g. 4K
}

export interface StorefrontItem {
  store: string; // e.g. steam
  url?: string;
  price?: number | null; // lowest known price in base currency
  currency?: string;
}

export interface CastCrewPerson {
  id?: number | string;
  name: string;
  role?: string; // character or job
  department?: string; // Acting, Directing, Writing, etc.
  profileUrl?: string | null;
}

export interface CrossMediaLink extends BaseRecommendationSummary {
  reason?: string; // rationale explanation
  relation?: string; // sequel, adaptation, universe
}

export type RatingSource = {
  source: string; // tmdb, igdb, google, opencritic, etc.
  value: number; // normalized 0-10
  votes?: number;
};

export interface EnrichedMediaDetail {
  id: number | string;
  type: MediaType;
  title: string;
  year: number | null;
  sublabel?: string | null;
  posterUrl: string | null;
  backdropUrl?: string | null;
  overview: string | null;
  tagline?: string | null;
  genres?: string[];
  rating?: RatingSource[];

  // Movies / TV
  runtimeMinutes?: number | null;
  totalEpisodes?: number | null;
  totalWatchMinutes?: number | null; // runtime * totalEpisodes fallback

  // Games
  howLongToBeat?: HowLongToBeatTimes;
  platforms?: string[];
  stores?: StorefrontItem[];

  // Books
  pageCount?: number | null;
  readingMinutes?: number | null; // derived
  authors?: string[];
  publisher?: string | null;
  publishedDate?: string | null;
  isbn?: string | null;

  // Financial (movies)
  budget?: number | null;
  revenue?: number | null;
  status?: string | null; // Released etc.
  originalLanguage?: string | null;

  // People
  cast?: CastCrewPerson[];
  crew?: CastCrewPerson[];
  authorsPeople?: CastCrewPerson[];
  creators?: CastCrewPerson[]; // show creators / game directors

  // Availability
  streaming?: StreamingAvailabilityItem[];

  // Recommendations
  recommendations: BaseRecommendationSummary[];
  crossRecommendations: CrossMediaLink[];
}

export type DetailCategory = MediaType | 'anime';
