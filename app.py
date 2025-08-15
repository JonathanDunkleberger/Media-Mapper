import os
import time
import requests
import logging
import hashlib
from pathlib import Path
from urllib.parse import urlparse
from flask import Flask, render_template, request, jsonify, send_from_directory, abort
from collections import defaultdict
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

# --- Basic Setup ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- App Configuration ---
app = Flask(__name__, static_folder='static', template_folder='templates')

# Image cache directory (proxied images are saved here)
IMAGE_CACHE_DIR = Path(app.static_folder or 'static') / 'cache'
IMAGE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# --- API Configuration ---
class Config:
    TMDB_API_KEY = os.getenv('TMDB_API_KEY')
    GOOGLE_BOOKS_API_KEY = os.getenv('GOOGLE_BOOKS_API_KEY')
    RAWG_API_KEY = os.getenv('RAWG_API_KEY')
    TMDB_API_URL = 'https://api.themoviedb.org/3'
    GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes'
    RAWG_API_URL = 'https://api.rawg.io/api'

# --- Mock Data for Games (Enhanced Workaround) ---
MOCK_GAMES = [
    {'id': 3498, 'media_type': 'game', 'title': 'Grand Theft Auto V', 'poster_path': 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg', 'release_date': '2013-09-17', 'vote_average': 4.47, 'overview': 'An action-adventure game played from either a third-person or first-person perspective.'},
    {'id': 3328, 'media_type': 'game', 'title': 'The Witcher 3: Wild Hunt', 'poster_path': 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg', 'release_date': '2015-05-18', 'vote_average': 4.66, 'overview': 'An action role-playing game with a third-person perspective, set in a fantasy universe.'},
    {'id': 4200, 'media_type': 'game', 'title': 'Portal 2', 'poster_path': 'https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188742.jpg', 'release_date': '2011-04-18', 'vote_average': 4.61, 'overview': 'A puzzle-platform game played from a first-person perspective.'},
    {'id': 5679, 'media_type': 'game', 'title': 'The Elder Scrolls V: Skyrim', 'poster_path': 'https://media.rawg.io/media/games/7cf/7cfc9220b401b7a300e409e539c9afd6.jpg', 'release_date': '2011-11-11', 'vote_average': 4.42, 'overview': 'An action role-playing game, playable from either a first or third-person perspective.'}
]

# --- API Helper Functions ---
def make_request(url, params, service_name):
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"API request failed for {service_name}: {e}")
        return None

def tmdb_multi_search(query):
    if not Config.TMDB_API_KEY: return []
    endpoint = f'{Config.TMDB_API_URL}/search/multi'
    params = {'api_key': Config.TMDB_API_KEY, 'query': query}
    data = make_request(endpoint, params, "TMDb Search")
    if not data: return []
    results = [r for r in data.get('results', []) if r.get('media_type') in ['movie', 'tv']]
    for r in results: 
        r['title'] = r.get('title') or r.get('name')
        r['overview'] = r.get('overview', 'No description available.')
        # Add a canonical poster path field for frontend convenience
        if r.get('poster_path'):
            # TMDb poster paths are relative; convert to full URL client can request via proxy
            r['poster_path'] = f"https://image.tmdb.org/t/p/w400{r.get('poster_path')}" if r.get('poster_path') and not r.get('poster_path').startswith('http') else r.get('poster_path')
    return results

def google_books_search(query):
    if not Config.GOOGLE_BOOKS_API_KEY: return []
    params = {'q': query, 'key': Config.GOOGLE_BOOKS_API_KEY, 'maxResults': 5}
    data = make_request(Config.GOOGLE_BOOKS_API_URL, params, "Google Books")
    if not data: return []
    results = []
    for item in data.get('items', []):
        vol_info = item.get('volumeInfo', {})
        thumb = vol_info.get('imageLinks', {}).get('thumbnail')
        results.append({'id': item.get('id'), 'media_type': 'book', 'title': vol_info.get('title', 'No Title'), 'poster_path': thumb, 'release_date': vol_info.get('publishedDate', ''), 'vote_average': vol_info.get('averageRating', 0), 'overview': vol_info.get('description', 'No description available.')})
    return results

def rawg_games_search(query):
    if not Config.RAWG_API_KEY:
        return [game for game in MOCK_GAMES if query.lower() in game['title'].lower()]
    
    endpoint = f'{Config.RAWG_API_URL}/games'
    params = {'key': Config.RAWG_API_KEY, 'search': query}
    data = make_request(endpoint, params, "RAWG Games Search")
    if not data: return []
    results = []
    for game in data.get('results', []):
        results.append({'id': game.get('id'), 'media_type': 'game', 'title': game.get('name'), 'poster_path': game.get('background_image'), 'release_date': game.get('released', ''), 'vote_average': game.get('rating', 0), 'overview': game.get('short_description', 'No description available.')})
    return results


def get_watch_providers(media_id, media_type):
    if not Config.TMDB_API_KEY:
        return []
    endpoint = f'{Config.TMDB_API_URL}/{media_type}/{media_id}/watch/providers'
    params = {'api_key': Config.TMDB_API_KEY}
    data = make_request(endpoint, params, "TMDb Watch Providers")
    if not data: return []
    return data.get('results', {}).get('US', {}).get('flatrate', [])


def get_tmdb_recommendations(media_id, media_type):
    if not Config.TMDB_API_KEY:
        return []
    endpoint = f'{Config.TMDB_API_URL}/{media_type}/{media_id}/recommendations'
    params = {'api_key': Config.TMDB_API_KEY}
    data = make_request(endpoint, params, "TMDb Recommendations")
    return data.get('results', []) if data else []


def _normalize_title(s: str) -> str:
    if not s: return ''
    s = s.lower()
    # basic normalize: strip punctuation and articles
    for ch in "',.!?:;()[]{}\\/":
        s = s.replace(ch, ' ')
    s = ' '.join([w for w in s.split() if w not in ('the','a','an')])
    return s.strip()


def _dedupe_and_rank(items):
    """Deduplicate by normalized title and prefer TMDb > GoogleBooks > RAWG order, then sort by score."""
    by_key = {}
    source_priority = {'movie': 3, 'tv': 3, 'book': 2, 'game': 1}
    for it in items:
        title = it.get('title') or it.get('name') or ''
        key = _normalize_title(title)
        if not key:
            key = f"{it.get('media_type','unknown')}-{it.get('id') or ''}"
        existing = by_key.get(key)
        if not existing:
            by_key[key] = it
            # compute a base score
            it['_score'] = (it.get('popularity') or it.get('vote_average') or 0) + (source_priority.get(it.get('media_type'), 0) * 0.1)
        else:
            # prefer higher priority sources or higher score
            existing_priority = source_priority.get(existing.get('media_type'), 0)
            this_priority = source_priority.get(it.get('media_type'), 0)
            if this_priority > existing_priority or (it.get('vote_average') or 0) > (existing.get('vote_average') or 0):
                by_key[key] = it
                it['_score'] = (it.get('popularity') or it.get('vote_average') or 0) + (this_priority * 0.1)

    out = list(by_key.values())
    out.sort(key=lambda x: (x.get('_score') or 0), reverse=True)
    return out


@app.route('/image-proxy')
def image_proxy():
    """Simple image proxy with file cache. Call with /image-proxy?url=<encoded-url>"""
    url = request.args.get('url')
    if not url: return abort(400)
    # basic validation
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        return abort(400)

    # Hash the URL for a cache filename
    h = hashlib.sha256(url.encode('utf-8')).hexdigest()
    # attempt to keep extension
    ext = Path(parsed.path).suffix or '.img'
    filename = f"{h}{ext}"
    cached = IMAGE_CACHE_DIR / filename
    if not cached.exists():
        try:
            resp = requests.get(url, timeout=6, stream=True)
            resp.raise_for_status()
            # If the response has no extension, try to derive from content-type
            if ext == '.img':
                ct = resp.headers.get('content-type','')
                if '/' in ct:
                    ext = '.' + ct.split('/')[-1]
                    filename = f"{h}{ext}"
                    cached = IMAGE_CACHE_DIR / filename
            with open(cached, 'wb') as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)
        except Exception as e:
            logging.error(f"Failed to fetch proxied image {url}: {e}")
            return abort(502)

    return send_from_directory(str(IMAGE_CACHE_DIR), cached.name)

# (Other helper functions like get_watch_providers, get_tmdb_recommendations remain the same)
# ...

# --- Routes ---
@app.route('/')
def index():
    # add a cache-busting integer (seconds) so dev browsers fetch updated JS
    return render_template('index.html', cache_bust=int(time.time()))

@app.route('/search')
def search():
    query = request.args.get('query', '').strip()
    if not query or len(query) < 3: return jsonify([])

    # **PERFORMANCE UPGRADE**: Run all API calls at the same time.
    with ThreadPoolExecutor() as executor:
        future_tmdb = executor.submit(tmdb_multi_search, query)
        future_books = executor.submit(google_books_search, query)
        future_games = executor.submit(rawg_games_search, query)

        tmdb_results = future_tmdb.result()
        book_results = future_books.result()
        game_results = future_games.result()

    combined = tmdb_results + book_results + game_results
    # Deduplicate and rank across sources
    combined = _dedupe_and_rank(combined)

    # Convert absolute poster URLs to proxied URLs to avoid client-side mixed content and caching
    from urllib.parse import quote_plus
    for it in combined:
        p = it.get('poster_path')
        if p and isinstance(p, str) and p.startswith('http'):
            it['poster_path'] = f"/image-proxy?url={quote_plus(p)}"

    return jsonify(combined[:10])

# The /recommend route remains largely the same, so it's omitted for brevity.
@app.route('/recommend', methods=['POST'])
def recommend():
    selections = request.form.getlist('media_selection')
    if not selections or len(selections) < 3:
        return render_template('index.html', error="Please select at least 3 media titles.")

    agg_recs = defaultdict(lambda: {'data': None, 'score': 0})
    tmdb_selections = [s for s in selections if s.startswith('movie-') or s.startswith('tv-')]
    
    for sel in tmdb_selections:
        try:
            media_type, media_id = sel.split('-', 1)
            for rec in get_tmdb_recommendations(media_id, media_type):
                rec_id = f"{rec.get('media_type', 'unknown')}-{rec.get('id')}"
                if rec_id not in selections:
                    agg_recs[rec_id]['data'] = rec
                    agg_recs[rec_id]['score'] = (agg_recs[rec_id].get('score') or 0) + 1
        except ValueError:
            continue

    sorted_recs = sorted([v for v in agg_recs.values() if v.get('data')], key=lambda x: (x.get('score') or 0), reverse=True)

    final_recs = defaultdict(list)
    for item in sorted_recs[:15]:
        rec = item.get('data')
        if not rec or not rec.get('id'): continue
        media_type, rec_id = rec.get('media_type'), rec.get('id')
        if media_type in ['movie', 'tv']:
            rec['providers'] = get_watch_providers(rec_id, media_type)
        category = 'anime' if media_type == 'tv' and 16 in rec.get('genre_ids', []) else f"{media_type}_shows" if media_type == 'tv' else f"{media_type}s"
        final_recs[category].append(rec)

    if any(s.startswith('book-') for s in selections):
        final_recs['books'] = google_books_search("dystopian novels")[:5]
    
    if not Config.RAWG_API_KEY:
        final_recs['games'] = MOCK_GAMES
    elif any(s.startswith('game-') for s in selections):
        final_recs['games'] = rawg_games_search("top rated")[:5]

    for cat in final_recs:
        final_recs[cat] = final_recs[cat][:5]

    return render_template('index.html', recommendations=dict(final_recs))

# ... (Other helpers are above)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)