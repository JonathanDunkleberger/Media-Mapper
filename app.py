import os
import requests
import re
from urllib.parse import quote_plus
import logging
from flask import Flask, render_template, request, jsonify
from collections import defaultdict
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

# --- Basic Setup ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- App Configuration ---
app = Flask(__name__, static_folder='static', template_folder='templates')

# --- API Configuration ---
class Config:
    TMDB_API_KEY = os.getenv('TMDB_API_KEY')
    GOOGLE_BOOKS_API_KEY = os.getenv('GOOGLE_BOOKS_API_KEY')
    RAWG_API_KEY = os.getenv('RAWG_API_KEY')
    TMDB_API_URL = 'https://api.themoviedb.org/3'
    GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes'
    RAWG_API_URL = 'https://api.rawg.io/api'

# --- Mock Data for Games (Workaround for RAWG API) ---
MOCK_GAMES = [
    {'id': 3498, 'media_type': 'game', 'title': 'Grand Theft Auto V', 'poster_path': 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg', 'release_date': '2013-09-17', 'vote_average': 4.47, 'overview': 'An action-adventure game played from either a third-person or first-person perspective.'},
    {'id': 3328, 'media_type': 'game', 'title': 'The Witcher 3: Wild Hunt', 'poster_path': 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg', 'release_date': '2015-05-18', 'vote_average': 4.66, 'overview': 'An action role-playing game with a third-person perspective, set in a fantasy universe.'},
    {'id': 4200, 'media_type': 'game', 'title': 'Portal 2', 'poster_path': 'https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188742.jpg', 'release_date': '2011-04-18', 'vote_average': 4.61, 'overview': 'A puzzle-platform game played from a first-person perspective.'},
    {'id': 5679, 'media_type': 'game', 'title': 'The Elder Scrolls V: Skyrim', 'poster_path': 'https://media.rawg.io/media/games/7cf/7cfc9220b401b7a300e409e539c9afd6.jpg', 'release_date': '2011-11-11', 'vote_average': 4.42, 'overview': 'An action role-playing game, playable from either a first or third-person perspective.'},
    {'id': 1030, 'media_type': 'game', 'title': "Baldur's Gate 3", 'poster_path': 'https://media.rawg.io/media/games/26d/26d4437715bee602f742a9b12c5b0892.jpg', 'release_date': '2023-08-03', 'vote_average': 4.5, 'overview': 'An epic RPG set in the world of Dungeons & Dragons.'}
    ,{'id': 1200, 'media_type': 'game', 'title': 'Minecraft', 'poster_path': '/static/images/minecraft.svg', 'release_date': '2011-11-18', 'vote_average': 4.2, 'overview': 'A sandbox game about placing blocks, crafting, and exploration.'}
    ,{'id': 2001, 'media_type': 'game', 'title': 'Cyberpunk 2077', 'poster_path': '/static/images/cyberpunk2077.svg', 'release_date': '2020-12-10', 'vote_average': 4.0, 'overview': 'An open-world action-adventure RPG set in Night City.'}
]

PRIORITY_GAMES_RAW = [
    "Cyberpunk 2077",
    "Baldur's Gate 3",
    "Minecraft",
    "The Witcher 3: Wild Hunt",
    "Portal 2",
    "Skyrim",
    "Grand Theft Auto V",
    "Red Dead Redemption 2",
    "God of War",
    "Call of Duty",
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
        # normalize and attach poster/backdrop URLs when available
        p = r.get('poster_path')
        if p:
            r['poster_path'] = f"https://image.tmdb.org/t/p/w400{p}" if not p.startswith('http') else p
        b = r.get('backdrop_path') or r.get('backdrop')
        if b:
            r['banner_path'] = f"https://image.tmdb.org/t/p/w780{b}" if not b.startswith('http') else b
    return results

def google_books_search(query):
    if not Config.GOOGLE_BOOKS_API_KEY: return []
    params = {'q': query, 'key': Config.GOOGLE_BOOKS_API_KEY, 'maxResults': 5}
    data = make_request(Config.GOOGLE_BOOKS_API_URL, params, "Google Books")
    if not data: return []
    results = []
    for item in data.get('items', []):
        vol_info = item.get('volumeInfo', {})
        results.append({'id': item.get('id'), 'media_type': 'book', 'title': vol_info.get('title', 'No Title'), 'poster_path': vol_info.get('imageLinks', {}).get('thumbnail'), 'release_date': vol_info.get('publishedDate', ''), 'vote_average': vol_info.get('averageRating', 0), 'overview': vol_info.get('description', 'No description available.')})
    return results

def rawg_games_search(query):
    # Try live RAWG API if configured
    if Config.RAWG_API_KEY:
        endpoint = f'{Config.RAWG_API_URL}/games'
        params = {'key': Config.RAWG_API_KEY, 'search': query}
        data = make_request(endpoint, params, "RAWG Games Search")
        if data and data.get('results'):
            results = []
            for game in data.get('results', []):
                results.append({'id': game.get('id'), 'media_type': 'game', 'title': game.get('name'), 'poster_path': game.get('background_image'), 'release_date': game.get('released', ''), 'vote_average': game.get('rating', 0), 'overview': game.get('short_description', 'No description available.')})
            if results:
                return results

    # Fallback: try permissive mock matching against known big games so the UI
    # still surfaces major titles when RAWG is down.
    qnorm = _normalize_title(query)
    qtokens = [t for t in qnorm.split() if t and t != 's']
    matched = []
    for game in MOCK_GAMES:
        tnorm = _normalize_title(game['title'])
        t_tokens = [t for t in tnorm.split() if t and t != 's']
        if not qtokens:
            continue
        ok = False
        for qt in qtokens:
            if any(tt.startswith(qt) or qt.startswith(tt) or qt.rstrip('s') == tt.rstrip('s') for tt in t_tokens):
                ok = True
                break
        if ok:
            matched.append(game)
    # if we found permissive matches in MOCK_GAMES, return them; otherwise return a single placeholder
    if matched:
        return matched

    q = (query or '').strip()
    if not q:
        return []
    placeholder = {
        'id': f'ph-{quote_plus(q)}',
        'media_type': 'game',
        'title': q.title(),
        'poster_path': '/static/images/game-placeholder.svg',
        'release_date': '',
        'vote_average': 0,
        'overview': 'Placeholder result — RAWG unavailable.'
    }
    return [placeholder]


def _normalize_title(s: str) -> str:
    if not s:
        return ''
    s = s.lower()
    # remove punctuation
    s = re.sub(r"[\W_]+", ' ', s)
    # remove leading articles
    s = re.sub(r"\b(the|a|an)\b", '', s)
    return ' '.join(s.split()).strip()

# --- Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search')
def search():
    query = request.args.get('query', '').strip()
    # match frontend min length (2)
    if not query or len(query) < 2:
        return jsonify([])

    norm_q = _normalize_title(query)
    q_has_digits = bool(re.search(r"\d", query))

    # Run API calls concurrently
    with ThreadPoolExecutor() as executor:
        future_tmdb = executor.submit(tmdb_multi_search, query)
        future_books = executor.submit(google_books_search, query)
        future_games = executor.submit(rawg_games_search, query)

        tmdb_results = future_tmdb.result()
        book_results = future_books.result()
        game_results = future_games.result()

    combined = tmdb_results + book_results + game_results

    # compute small scoring fields and flags
    media_priority = {'game': 4, 'movie': 3, 'tv': 3, 'book': 2}
    for it in combined:
        title = it.get('title') or it.get('name') or ''
        tnorm = _normalize_title(title)
        it['_exact_match'] = bool(tnorm and tnorm == norm_q)
        it['_prefix_match'] = bool(tnorm and tnorm.startswith(norm_q))
        # token prefix matching: count how many query tokens match start of title tokens
        qtokens = [t for t in norm_q.split() if t]
        t_tokens = [t for t in tnorm.split() if t]
        token_match = 0
        if qtokens and t_tokens:
            for qt in qtokens:
                for tt in t_tokens:
                    # exact start, or query starts with title token, or stem-equal after removing trailing s
                    if tt.startswith(qt) or qt.startswith(tt) or qt.rstrip('s') == tt.rstrip('s'):
                        token_match += 1
                        break
        it['_token_match'] = token_match
        # base popularity score
        it['_score'] = (it.get('popularity') or it.get('vote_average') or 0)
        it['_media_pri'] = media_priority.get(it.get('media_type'), 0)
        # adjusted media priority: boost games strongly when query likely refers to a game (e.g., contains digits like '2077')
        it['_media_pri_adj'] = it['_media_pri'] + (10 if q_has_digits and it.get('media_type') == 'game' else 0)

        # deprioritize placeholder entries created when RAWG is unavailable
        if it.get('id') and isinstance(it.get('id'), str) and it['id'].startswith('ph-'):
            # push placeholder items lower in results
            it['_media_pri'] = 0
            # small negative score so they appear below real exact matches
            it['_score'] = -1
            # but also make sure they do not claim exact/prefix/token matches
            it['_exact_match'] = False
            it['_prefix_match'] = False
            it['_token_match'] = 0

    # sort: exact match first, then token-prefix matches, then media priority (to prefer games), then prefix, then score
    combined.sort(key=lambda x: (
                                1 if x.get('_exact_match') else 0,
                                x.get('_token_match', 0),
                                x.get('_media_pri_adj', 0),
                                1 if x.get('_prefix_match') else 0,
                                x.get('_score', 0)
                            ),
                  reverse=True)

    # ensure poster/banner URLs are proxied where needed (for external absolute URLs we keep them)
    for it in combined:
        p = it.get('poster_path')
        if p and isinstance(p, str) and p.startswith('http'):
            # leave absolute URLs as-is (frontend will fetch them)
            continue
        # if poster path is a relative TMDb path (rare now), prefix it
        if p and isinstance(p, str) and not p.startswith('/') and not p.startswith('http'):
            it['poster_path'] = f"https://image.tmdb.org/t/p/w400{p}"
        # banner_path already set for TMDb results in helper; if relative, prefix
        b = it.get('banner_path')
        if b and isinstance(b, str) and not b.startswith('http') and not b.startswith('/'):
            it['banner_path'] = f"https://image.tmdb.org/t/p/w780{b}"

    # --- Priority Boost for Blockbuster Games ---
    priority_set = set(_normalize_title(t) for t in PRIORITY_GAMES_RAW)
    qtokens = [t for t in norm_q.split() if t]
    for r in combined:
        # ensure a default
        r.setdefault('_priority_boost', 0)
        # compute normalized title safely
        r_title = (r.get('title') or '')
        r_norm = _normalize_title(r_title)
        # give a boost only for game entries that match our curated list or share tokens with the query
        if r.get('media_type') == 'game':
            if r_norm in priority_set:
                # strong boost for curated exact titles
                r['_priority_boost'] = max(r['_priority_boost'], 8)
            else:
                # token overlap boost (e.g., user typed part of a blockbuster title)
                if any(tok in r_norm for tok in qtokens):
                    r['_priority_boost'] = max(r['_priority_boost'], 5)

    # update the sort key to include the new priority boost (placed high in the priority order)
    combined_sorted = sorted(combined, key=lambda r: (
        r.get('_exact_match', 0),
        r.get('_token_match', 0),
        r.get('_priority_boost', 0),
        r.get('_media_pri_adj', 0),
        r.get('_prefix_match', 0),
        r.get('_score', 0),
    ), reverse=True)

    return jsonify(combined_sorted[:12])


@app.route('/recommend', methods=['GET', 'POST'])
def recommend():
    """Minimal recommend endpoint: GET renders the main page (so link doesn't 404).
    POST accepts form field `media_selection` (multiple) and returns a small placeholder
    recommendations JSON so the frontend has something to display while the full
    recommender is implemented.
    """
    if request.method == 'GET':
        return render_template('index.html')

    # POST: collect selections from form or JSON
    selections = request.form.getlist('media_selection') if request.form else []
    if not selections and request.is_json:
        selections = request.get_json().get('media_selection', [])

    if not selections or len(selections) < 1:
        return jsonify({'error': 'No favorites submitted. Select favorites before requesting recommendations.'}), 400

    # build minimal placeholder recommendations
    recs = []
    for i, s in enumerate(selections[:6]):
        media = s.split('-', 1)[0] if isinstance(s, str) and '-' in s else 'unknown'
        recs.append({
            'id': f'rec-{i+1}',
            'title': f'Recommended for {s}',
            'media_type': media,
            'poster_path': None,
            'overview': 'Placeholder recommendation — real recommender not yet implemented.'
        })

    return jsonify({'seed_count': len(selections), 'recommendations': recs})

# NOTE: The full /recommend route and other helpers would be included here.
# This is a summary view. The full code is in the main artifact.

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
