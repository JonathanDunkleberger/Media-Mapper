-- Users table
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Media table (movies, tv, books, games)
create table if not exists media (
  id uuid primary key default uuid_generate_v4(),
  external_id text not null,
  type text not null, -- movie, tv, book, game
  title text not null,
  description text,
  image_url text,
  release_date date,
  extra jsonb, -- for provider-specific fields
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Favorites table
create table if not exists favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  media_id uuid references media(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, media_id)
);
