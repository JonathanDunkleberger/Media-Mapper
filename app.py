import os
import requests
import re
import time
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
    {
        'id': 3498, 'media_type': 'game', 'title': 'Grand Theft Auto V', 
        'poster_path': 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg', 
        'release_date': '2013-09-17', 'vote_average': 4.47, 'genre': 'Action',
        'overview': 'An action-adventure game played from either a third-person or first-person perspective.',
        'howLongToBeat': {'main': '31.5 hours', 'extra': '78 hours', 'completionist': '80 hours'},
        'tasteProfile': {
            'storyComplexity': 7, 'combatDifficulty': 6, 'grindFactor': 4, 'explorationFocus': 8,
            'playerChoiceMatters': 6, 'artStyle': 9, 'replayValue': 9, 'learningCurve': 5,
            'cooperativePlay': 8, 'competitivePlay': 9, 'narrativeFocus': 7, 'techComplexity': 6
        }
    },
    {
        'id': 3328, 'media_type': 'game', 'title': 'The Witcher 3: Wild Hunt', 
        'poster_path': 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg', 
        'release_date': '2015-05-18', 'vote_average': 4.66, 'genre': 'RPG',
        'overview': 'An action role-playing game with a third-person perspective, set in a fantasy universe.',
        'howLongToBeat': {'main': '51.5 hours', 'extra': '103 hours', 'completionist': '173 hours'},
        'tasteProfile': {
            'storyComplexity': 9, 'combatDifficulty': 7, 'grindFactor': 6, 'explorationFocus': 9,
            'playerChoiceMatters': 9, 'artStyle': 10, 'replayValue': 8, 'learningCurve': 7,
            'cooperativePlay': 1, 'competitivePlay': 1, 'narrativeFocus': 10, 'techComplexity': 7
        }
    },
    {
        'id': 4200, 'media_type': 'game', 'title': 'Portal 2', 
        'poster_path': 'https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188742.jpg', 
        'release_date': '2011-04-18', 'vote_average': 4.61, 'genre': 'Puzzle',
        'overview': 'A puzzle-platform game played from a first-person perspective.',
        'howLongToBeat': {'main': '8.5 hours', 'extra': '11 hours', 'completionist': '21 hours'},
        'tasteProfile': {
            'storyComplexity': 8, 'combatDifficulty': 2, 'grindFactor': 1, 'explorationFocus': 6,
            'playerChoiceMatters': 4, 'artStyle': 9, 'replayValue': 7, 'learningCurve': 6,
            'cooperativePlay': 8, 'competitivePlay': 3, 'narrativeFocus': 8, 'techComplexity': 8
        }
    },
    {
        'id': 5679, 'media_type': 'game', 'title': 'The Elder Scrolls V: Skyrim', 
        'poster_path': 'https://media.rawg.io/media/games/7cf/7cfc9220b401b7a300e409e539c9afd6.jpg', 
        'release_date': '2011-11-11', 'vote_average': 4.42, 'genre': 'RPG',
        'overview': 'An action role-playing game, playable from either a first or third-person perspective.',
        'howLongToBeat': {'main': '34 hours', 'extra': '107 hours', 'completionist': '232 hours'},
        'tasteProfile': {
            'storyComplexity': 6, 'combatDifficulty': 6, 'grindFactor': 7, 'explorationFocus': 10,
            'playerChoiceMatters': 8, 'artStyle': 8, 'replayValue': 10, 'learningCurve': 6,
            'cooperativePlay': 1, 'competitivePlay': 1, 'narrativeFocus': 7, 'techComplexity': 5
        }
    },
    {
        'id': 1030, 'media_type': 'game', 'title': "Baldur's Gate 3", 
        'poster_path': 'https://media.rawg.io/media/games/26d/26d4437715bee602f742a9b12c5b0892.jpg', 
        'release_date': '2023-08-03', 'vote_average': 4.5, 'genre': 'RPG',
        'overview': 'An epic RPG set in the world of Dungeons & Dragons.',
        'howLongToBeat': {'main': '75 hours', 'extra': '101 hours', 'completionist': '140 hours'},
        'tasteProfile': {
            'storyComplexity': 10, 'combatDifficulty': 8, 'grindFactor': 5, 'explorationFocus': 9,
            'playerChoiceMatters': 10, 'artStyle': 9, 'replayValue': 9, 'learningCurve': 8,
            'cooperativePlay': 9, 'competitivePlay': 2, 'narrativeFocus': 10, 'techComplexity': 8
        }
    },
    {
        'id': 22509, 'media_type': 'game', 'title': 'Minecraft', 
        'poster_path': 'https://media.rawg.io/media/games/b4e/b4e4c73d5aa4ec66bbf75375c4847a2b.jpg', 
        'release_date': '2011-11-18', 'vote_average': 4.43, 'genre': 'Sandbox',
        'overview': 'A sandbox video game where players can build and explore virtual worlds made of blocks.',
        'howLongToBeat': {'main': '∞ hours', 'extra': '∞ hours', 'completionist': '∞ hours'},
        'tasteProfile': {
            'storyComplexity': 2, 'combatDifficulty': 4, 'grindFactor': 6, 'explorationFocus': 10,
            'playerChoiceMatters': 10, 'artStyle': 7, 'replayValue': 10, 'learningCurve': 4,
            'cooperativePlay': 9, 'competitivePlay': 7, 'narrativeFocus': 1, 'techComplexity': 5
        }
    },
    {
        'id': 4291, 'media_type': 'game', 'title': 'Cyberpunk 2077', 
        'poster_path': 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg', 
        'release_date': '2020-12-10', 'vote_average': 4.1, 'genre': 'RPG',
        'overview': 'An open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.',
        'howLongToBeat': {'main': '24.5 hours', 'extra': '60.5 hours', 'completionist': '103 hours'},
        'tasteProfile': {
            'storyComplexity': 8, 'combatDifficulty': 7, 'grindFactor': 5, 'explorationFocus': 8,
            'playerChoiceMatters': 8, 'artStyle': 10, 'replayValue': 7, 'learningCurve': 7,
            'cooperativePlay': 1, 'competitivePlay': 1, 'narrativeFocus': 9, 'techComplexity': 8
        }
    },
    {
        'id': 28, 'media_type': 'game', 'title': 'Red Dead Redemption 2', 
        'poster_path': 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg', 
        'release_date': '2018-10-26', 'vote_average': 4.58, 'genre': 'Action',
        'overview': 'A Western-themed action-adventure game set in an open world environment.',
        'howLongToBeat': {'main': '50 hours', 'extra': '79 hours', 'completionist': '174 hours'},
        'tasteProfile': {
            'storyComplexity': 9, 'combatDifficulty': 6, 'grindFactor': 7, 'explorationFocus': 9,
            'playerChoiceMatters': 7, 'artStyle': 10, 'replayValue': 8, 'learningCurve': 6,
            'cooperativePlay': 6, 'competitivePlay': 8, 'narrativeFocus': 9, 'techComplexity': 6
        }
    }
]

PRIORITY_GAMES_RAW = [ "Cyberpunk 2077", "Baldur's Gate 3", "Minecraft", "The Witcher 3: Wild Hunt", "Portal 2", "Skyrim", "Grand Theft Auto V", "Red Dead Redemption 2", "God of War", "Call of Duty" ]

# --- API Helper Functions ---
def make_request(url, params, service_name):
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"API request failed for {service_name}: {e}")
        return None

def get_watch_providers(media_id, media_type):
    if not Config.TMDB_API_KEY: return []
    endpoint = f'{Config.TMDB_API_URL}/{media_type}/{media_id}/watch/providers'
    params = {'api_key': Config.TMDB_API_KEY}
    data = make_request(endpoint, params, "TMDb Watch Providers")
    return data.get('results', {}).get('US', {}).get('flatrate', []) if data else []

def get_tmdb_recommendations(media_id, media_type):
    if not Config.TMDB_API_KEY: return []
    endpoint = f'{Config.TMDB_API_URL}/{media_type}/{media_id}/recommendations'
    params = {'api_key': Config.TMDB_API_KEY}
    data = make_request(endpoint, params, "TMDb Recommendations")
    return data.get('results', []) if data else []

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
        p = r.get('poster_path')
        if p: r['poster_path'] = f"https://image.tmdb.org/t/p/w400{p}" if not p.startswith('http') else p
        b = r.get('backdrop_path') or r.get('backdrop')
        if b: r['banner_path'] = f"https://image.tmdb.org/t/p/w780{b}" if not b.startswith('http') else b
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
    if Config.RAWG_API_KEY:
        endpoint = f'{Config.RAWG_API_URL}/games'
        params = {'key': Config.RAWG_API_KEY, 'search': query}
        data = make_request(endpoint, params, "RAWG Games Search")
        if data and data.get('results'):
            results = []
            for game in data.get('results', []):
                results.append({'id': game.get('id'), 'media_type': 'game', 'title': game.get('name'), 'poster_path': game.get('background_image'), 'release_date': game.get('released', ''), 'vote_average': game.get('rating', 0), 'overview': game.get('short_description', 'No description available.')})
            if results: return results
    
    qnorm = _normalize_title(query)
    qtokens = [t for t in qnorm.split() if t and t != 's']
    matched = []
    for game in MOCK_GAMES:
        tnorm = _normalize_title(game['title'])
        t_tokens = [t for t in tnorm.split() if t and t != 's']
        if not qtokens: continue
        ok = any(tt.startswith(qt) or qt.startswith(tt) or qt.rstrip('s') == tt.rstrip('s') for qt in qtokens for tt in t_tokens)
        if ok: matched.append(game)
    return matched

def _normalize_title(s: str) -> str:
    if not s: return ''
    s = s.lower()
    s = re.sub(r"[\W_]+", ' ', s)
    s = re.sub(r"\b(the|a|an)\b", '', s)
    return ' '.join(s.split()).strip()

def _resolve_seed_details(media_type, media_id):
    """Try to resolve media details from APIs or return basic info."""
    try:
        # For games, check if we missed it in MOCK_GAMES
        if media_type == 'game':
            # Try RAWG API if available
            if Config.RAWG_API_KEY:
                endpoint = f"{Config.RAWG_API_URL}/games/{media_id}"
                params = {'key': Config.RAWG_API_KEY}
                data = make_request(endpoint, params, 'RAWG Game Detail')
                if data:
                    return {
                        'title': data.get('name', f'Game {media_id}'),
                        'poster_path': data.get('background_image'),
                        'overview': data.get('description_raw') or data.get('description') or 'No description available.'
                    }
            # Fallback for games
            return {
                'title': f'Game {media_id}',
                'poster_path': '/static/images/game-placeholder.svg',
                'overview': 'Game details not available.'
            }
        
        # For movies/TV, try TMDb API
        if media_type in ['movie', 'tv'] and Config.TMDB_API_KEY:
            endpoint = f"{Config.TMDB_API_URL}/{media_type}/{media_id}"
            params = {'api_key': Config.TMDB_API_KEY}
            data = make_request(endpoint, params, 'TMDb Detail')
            if data:
                title = data.get('title') or data.get('name', f'{media_type.title()} {media_id}')
                poster = data.get('poster_path')
                if poster and not poster.startswith('http'):
                    poster = f"https://image.tmdb.org/t/p/w400{poster}"
                return {
                    'title': title,
                    'poster_path': poster,
                    'overview': data.get('overview', 'No description available.')
                }
        
        # For books, try Google Books API
        if media_type == 'book' and Config.GOOGLE_BOOKS_API_KEY:
            endpoint = f"{Config.GOOGLE_BOOKS_API_URL}/{media_id}"
            params = {'key': Config.GOOGLE_BOOKS_API_KEY}
            data = make_request(endpoint, params, 'Google Books Detail')
            if data:
                vol_info = data.get('volumeInfo', {})
                return {
                    'title': vol_info.get('title', f'Book {media_id}'),
                    'poster_path': vol_info.get('imageLinks', {}).get('thumbnail'),
                    'overview': vol_info.get('description', 'No description available.')
                }
        
        # Generic fallback
        return {
            'title': f'{media_type.title()} {media_id}',
            'poster_path': None,
            'overview': 'Details not available.'
        }
        
    except Exception as e:
        logging.error(f"Error resolving seed details: {e}")
        return None

# --- Routes ---
@app.route('/')
def index():
    # Adding a cache-busting query parameter to the JS file URL
    cache_bust = os.path.getmtime('static/js/script.js')
    return render_template('index.html', cache_bust=cache_bust)

@app.route('/search')
def search():
    query = request.args.get('query', '').strip()
    if not query or len(query) < 2: return jsonify([])

    norm_q = _normalize_title(query)
    q_has_digits = bool(re.search(r"\d", query))

    with ThreadPoolExecutor() as executor:
        future_tmdb = executor.submit(tmdb_multi_search, query)
        future_books = executor.submit(google_books_search, query)
        future_games = executor.submit(rawg_games_search, query)
        tmdb_results, book_results, game_results = future_tmdb.result(), future_books.result(), future_games.result()

    combined = tmdb_results + book_results + game_results
    media_priority = {'game': 4, 'movie': 3, 'tv': 3, 'book': 2}
    
    for it in combined:
        title = it.get('title') or it.get('name') or ''
        tnorm = _normalize_title(title)
        it['_exact_match'] = bool(tnorm and tnorm == norm_q)
        it['_prefix_match'] = bool(tnorm and tnorm.startswith(norm_q))
        qtokens = [t for t in norm_q.split() if t]
        t_tokens = [t for t in tnorm.split() if t]
        it['_token_match'] = sum(1 for qt in qtokens for tt in t_tokens if tt.startswith(qt) or qt.startswith(tt) or qt.rstrip('s') == tt.rstrip('s'))
        it['_score'] = (it.get('popularity') or it.get('vote_average') or 0)
        it['_media_pri'] = media_priority.get(it.get('media_type'), 0)
        it['_media_pri_adj'] = it['_media_pri'] + (10 if q_has_digits and it.get('media_type') == 'game' else 0)

    priority_set = set(_normalize_title(t) for t in PRIORITY_GAMES_RAW)
    for r in combined:
        r['_priority_boost'] = 0
        r_norm = _normalize_title(r.get('title') or '')
        if r.get('media_type') == 'game':
            if r_norm in priority_set: r['_priority_boost'] = 8
            elif any(tok in r_norm for tok in [t for t in norm_q.split() if t]): r['_priority_boost'] = 5

    combined.sort(key=lambda x: (x.get('_exact_match', 0), x.get('_token_match', 0), x.get('_priority_boost', 0), x.get('_media_pri_adj', 0), x.get('_prefix_match', 0), x.get('_score', 0)), reverse=True)
    
    return jsonify(combined[:12])

@app.route('/details/<media_type>/<media_id>')
def details(media_type, media_id):
    """Serve detailed media information for the premium details dashboard."""
    
    # First try to get data from MOCK_GAMES if it's a game
    if media_type == 'game':
        try:
            media_id_int = int(media_id)
        except ValueError:
            media_id_int = None
            
        for game in MOCK_GAMES:
            if game.get('id') == media_id_int:
                # Add cache_bust for JS files
                cache_bust = int(time.time())
                return render_template('details.html', media=game, cache_bust=cache_bust)
    
    # For other media types or if game not found in MOCK_GAMES, try API resolution
    details_data = _resolve_seed_details(media_type, media_id)
    
    if not details_data:
        # Return 404 if no data found
        return render_template('index.html', error=f"Media not found: {media_type} {media_id}"), 404
    
    # Create a basic media object for non-game items
    media = {
        'id': media_id,
        'media_type': media_type,
        'title': details_data.get('title', 'Unknown Title'),
        'poster_path': details_data.get('poster_path'),
        'overview': details_data.get('overview', 'No description available.'),
        'release_date': '',
        'vote_average': 0,
        'genre': media_type.title()
    }
    
    cache_bust = int(time.time())
    return render_template('details.html', media=media, cache_bust=cache_bust)

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
                    agg_recs[rec_id]['score'] += 1
        except ValueError: continue

    sorted_recs = sorted([v for v in agg_recs.values() if v.get('data')], key=lambda x: x['score'], reverse=True)

    final_recs = defaultdict(list)
    for item in sorted_recs[:15]:
        rec = item.get('data')
        if not rec or not rec.get('id'): continue
        media_type, rec_id = rec.get('media_type'), rec.get('id')
        if media_type in ['movie', 'tv']: rec['providers'] = get_watch_providers(rec_id, media_type)
        
        category = 'anime' if media_type == 'tv' and 16 in rec.get('genre_ids', []) else f"{media_type}s" if media_type == 'movie' else f"tv_shows"
        final_recs[category].append(rec)

    if any(s.startswith('book-') for s in selections):
        final_recs['books'] = google_books_search("dystopian novels")[:5]
    
    if any(s.startswith('game-') for s in selections) or not Config.RAWG_API_KEY:
        final_recs['games'] = [g for g in MOCK_GAMES if f"game-{g['id']}" not in selections]

    for cat in final_recs: final_recs[cat] = final_recs[cat][:5]
    return render_template('index.html', recommendations=dict(final_recs))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
