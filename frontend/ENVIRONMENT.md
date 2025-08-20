# Media Mapper - Environment Variables

The application requires the following environment variables to run:

## Required for Build & Runtime:
- `TMDB_V4_TOKEN` - TMDB API v4 Bearer Token (preferred)
- `TWITCH_CLIENT_ID` - For IGDB game data  
- `TWITCH_CLIENT_SECRET` - For IGDB authentication
- `GOOGLE_BOOKS_API_KEY` - For book search
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Development Testing:
Create a `.env.local` file with real API keys for testing, or with placeholder values just to pass build validation (runtime will fail with API calls).

## Production Deployment:
Configure these environment variables in your deployment platform (Vercel, etc.).

The build will fail without proper environment variables due to validation during the build process.