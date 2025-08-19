import { z } from 'zod';

// Shared primitives
const zBaseRecommendation = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.enum(['movie','tv','game','book']),
  title: z.string(),
  year: z.number().nullable(),
  posterUrl: z.string().nullable(),
  sublabel: z.string().nullable().optional(),
});

const zRating = z.object({ source: z.string(), value: z.number(), votes: z.number().optional() });
const zHowLongToBeat = z.object({
  mainStory: z.number().optional(),
  mainExtra: z.number().optional(),
  completionist: z.number().optional(),
}).strict();

const zCastCrew = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  role: z.string().optional(),
  department: z.string().optional(),
  profileUrl: z.string().nullable().optional(),
});

// Base common fields
const zBaseDetail = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.enum(['movie','tv','game','book']),
  title: z.string(),
  year: z.number().nullable(),
  sublabel: z.string().nullable().optional(),
  posterUrl: z.string().nullable(),
  backdropUrl: z.string().nullable().optional(),
  overview: z.string().nullable(),
  tagline: z.string().nullable().optional(),
  genres: z.array(z.string()).optional(),
  rating: z.array(zRating).optional(),
  recommendations: z.array(zBaseRecommendation),
  crossRecommendations: z.array(zBaseRecommendation).optional().default([]),
});

// Movie / TV specifics
const zScreenDetail = zBaseDetail.extend({
  type: z.enum(['movie','tv']),
  runtimeMinutes: z.number().nullable().optional(),
  totalEpisodes: z.number().nullable().optional(),
  totalWatchMinutes: z.number().nullable().optional(),
  budget: z.number().nullable().optional(),
  revenue: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  originalLanguage: z.string().nullable().optional(),
  cast: z.array(zCastCrew).optional(),
  crew: z.array(zCastCrew).optional(),
});

const zGameDetail = zBaseDetail.extend({
  type: z.literal('game'),
  howLongToBeat: zHowLongToBeat.optional(),
  platforms: z.array(z.string()).optional(),
  stores: z.array(z.object({ store: z.string(), url: z.string().optional(), price: z.number().nullable().optional(), currency: z.string().optional() })).optional(),
  cast: z.array(zCastCrew).optional(),
  crew: z.array(zCastCrew).optional(),
});

const zBookDetail = zBaseDetail.extend({
  type: z.literal('book'),
  pageCount: z.number().nullable().optional(),
  readingMinutes: z.number().nullable().optional(),
  authors: z.array(z.string()).optional(),
  publisher: z.string().nullable().optional(),
  publishedDate: z.string().nullable().optional(),
  isbn: z.string().nullable().optional(),
});

export const zEnrichedDetail = z.discriminatedUnion('type', [zScreenDetail, zGameDetail, zBookDetail]);
export type EnrichedDetail = z.infer<typeof zEnrichedDetail>;

export const zDetailsApiResponse = z.object({ item: zEnrichedDetail });
export type DetailsApiResponse = z.infer<typeof zDetailsApiResponse>;
