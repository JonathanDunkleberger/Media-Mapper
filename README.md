# Media Mapper

Lightweight no-signup media taste profiler and recommender. Fast autofill with images, keyboard navigation, and recommendations across movies, TV, books and games.

Key features
- Fast, image-rich typeahead powered by TMDb / Google Books / RAWG
- Server-side image proxy and disk cache to avoid mixed-content and rate issues
- Simple selection card UX for building a taste profile and requesting recommendations

Local setup
1. Copy `.env.example` to `.env` and fill your API keys (TMDB, GOOGLE_BOOKS, RAWG optional).
2. Create and activate a Python venv and install requirements:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

3. Run the dev server:

```powershell
python app.py
```

Notes for recruiters
- Small prototype demonstrating API integration, concurrency, caching, and a polished frontend interaction model.
- Ready for tests, Docker, or production hardening on request.

License: MIT
