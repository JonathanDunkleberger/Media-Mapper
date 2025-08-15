import os
import re
import random
from functools import wraps
from flask import Flask, render_template, request, jsonify
from concurrent.futures import ThreadPoolExecutor
import requests
import logging
from dotenv import load_dotenv
from collections import defaultdict

# --- Basic Setup ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- App Configuration ---
app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0 # Disable caching for static files in debug

# --- API Configuration ---
class Config:
    TMDB_API_KEY = os.getenv('TMDB_API_KEY')
    GOOGLE_BOOKS_API_KEY = os.getenv('GOOGLE_BOOKS_API_KEY')
    RAWG_API_KEY = os.getenv('RAWG_API_KEY')
    TMDB_API_URL = 'https://api.themoviedb.org/3'
    GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes'
    RAWG_API_URL = 'https://api.rawg.io/api'

# --- API Helper Functions ---
def make_api_request(url, params, service_name):
    """Generic function to make API requests with error handling."""
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"API request failed for {service_name}: {e}")
        return None

def _normalize_title(s: str) -> str:
    """A helper to normalize titles for better matching."""
    if not s: return ''
    s = s.lower()
    s = re.sub(r"[\W_]+", ' ', s) # Remove punctuation
    s = re.sub(r"\b(the|a|an)\b", '', s) # Remove leading articles
    return ' '.join(s.split()).strip()

def search_tmdb(query):
    """Searches TMDb for movies and TV shows and standardizes the output."""
    if not Config.TMDB_API_KEY: return []
    endpoint = f'{Config.TMDB_API_URL}/search/multi'
    params = {'api_key': Config.TMDB_API_KEY, 'query': query}
    data = make_api_request(endpoint, params, "TMDb Search")
    if not data: return []
    
    results = []
    for r in data.get('results', []):
        if r.get('media_type') not in ['movie', 'tv']: continue
        poster = r.get('poster_path')
        backdrop = r.get('backdrop_path')
        results.append({
            'id': r.get('id'),
            'media_type': r.get('media_type'),
            'title': r.get('title') or r.get('name'),
            'poster_path': f"https://image.tmdb.org/t/p/w400{poster}" if poster else None,
            'banner_path': f"https://image.tmdb.org/t/p/w780{backdrop}" if backdrop else None,
            'release_date': r.get('release_date') or r.get('first_air_date', ''),
            'vote_average': r.get('vote_average', 0),
            'popularity': r.get('popularity', 0),
            'overview': r.get('overview', 'No description available.')
        })
    return results

def search_google_books(query):
    """Searches Google Books and standardizes the output."""
    if not Config.GOOGLE_BOOKS_API_KEY: return []
    params = {'q': query, 'key': Config.GOOGLE_BOOKS_API_KEY, 'maxResults': 5}
    data = make_api_request(Config.GOOGLE_BOOKS_API_URL, params, "Google Books")
    if not data: return []
    
    results = []
    for item in data.get('items', []):
        info = item.get('volumeInfo', {})
        results.append({
            'id': item.get('id'),
            'media_type': 'book',
            'title': info.get('title', 'No Title'),
            'poster_path': info.get('imageLinks', {}).get('thumbnail'),
            'banner_path': None,
            'release_date': info.get('publishedDate', ''),
            'vote_average': info.get('averageRating', 0),
            'popularity': info.get('ratingsCount', 0),
            'overview': info.get('description', 'No description available.')
        })
    return results

def search_rawg_games(query):
    """Searches RAWG for video games and standardizes the output."""
    if not Config.RAWG_API_KEY: return []
    endpoint = f'{Config.RAWG_API_URL}/games'
    params = {'key': Config.RAWG_API_KEY, 'search': query, 'page_size': 5}
    data = make_api_request(endpoint, params, "RAWG Games Search")
    if not data: return []

    results = []
    for game in data.get('results', []):
        results.append({
            'id': game.get('id'),
            'media_type': 'game',
            'title': game.get('name'),
            'poster_path': game.get('background_image'),
            'banner_path': game.get('background_image'), # Use same for banner
            'release_date': game.get('released', ''),
            'vote_average': game.get('rating', 0),
            'popularity': game.get('ratings_count', 0),
            'overview': 'A popular video game.' # RAWG search doesn't provide overview
        })
    return results

def get_tmdb_recommendations(media_type, media_id):
    """Gets recommendations for a given TMDb movie or TV show."""
    if not Config.TMDB_API_KEY: return []
    endpoint = f"{Config.TMDB_API_URL}/{media_type}/{media_id}/recommendations"
    params = {'api_key': Config.TMDB_API_KEY}
    data = make_api_request(endpoint, params, "TMDb Recommendations")
    if not data: return []
    
    # Standardize the output just like search results
    results = []
    for r in data.get('results', []):
        poster = r.get('poster_path')
        results.append({
            'id': r.get('id'),
            'media_type': r.get('media_type', media_type),
            'title': r.get('title') or r.get('name'),
            'poster_path': f"https://image.tmdb.org/t/p/w400{poster}" if poster else None,
            'release_date': r.get('release_date') or r.get('first_air_date', ''),
            'vote_average': r.get('vote_average', 0),
            'overview': r.get('overview', 'No description available.')
        })
    return results

# --- Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search')
def search():
    query = request.args.get('query', '').strip()
    if len(query) < 2:
        return jsonify([])

    # Run API calls concurrently for speed
    with ThreadPoolExecutor() as executor:
        futures = [
            executor.submit(search_tmdb, query),
            executor.submit(search_google_books, query),
            executor.submit(search_rawg_games, query)
        ]
        results = [future.result() for future in futures]
    
    combined = [item for sublist in results for item in sublist]
    
    # Simple scoring for relevance
    norm_q = _normalize_title(query)
    for item in combined:
        norm_title = _normalize_title(item['title'])
        score = item.get('popularity', 0)
        if norm_q == norm_title:
            score += 1000  # Big boost for exact match
        elif norm_title.startswith(norm_q):
            score += 500   # Boost for prefix match
        item['_score'] = score
    
    # Sort by score, descending
    combined.sort(key=lambda x: x.get('_score', 0), reverse=True)
    
    return jsonify(combined[:12])

@app.route('/recommend', methods=['POST'])
def recommend():
    selections = request.form.getlist('media_selection')
    if not selections or len(selections) < 3:
        return jsonify({'error': 'Please select at least 3 favorites.'}), 400

    seed_ids = set(selections)
    all_recs = defaultdict(list)
    
    with ThreadPoolExecutor() as executor:
        future_to_seed = {}
        for sel in selections:
            try:
                media_type, media_id = sel.split('-', 1)
                if media_type in ['movie', 'tv']:
                    future = executor.submit(get_tmdb_recommendations, media_type, media_id)
                    future_to_seed[future] = (media_type, media_id)
                # Add other recommendation sources (e.g., for books, games) here if available
            except ValueError:
                logging.warning(f"Could not parse selection: {sel}")
                continue

        for future in future_to_seed:
            recs = future.result()
            media_type, _ = future_to_seed[future]
            all_recs[media_type].extend(recs)
    
    # Process recommendations: deduplicate and remove seeds
    final_recs = defaultdict(list)
    seen_ids = set()
    
    for media_type, items in all_recs.items():
        for item in items:
            item_id_str = f"{item['media_type']}-{item['id']}"
            if item_id_str not in seen_ids and item_id_str not in seed_ids:
                final_recs[media_type].append(item)
                seen_ids.add(item_id_str)
    
    # Shuffle and limit results for variety
    for media_type in final_recs:
        random.shuffle(final_recs[media_type])
        final_recs[media_type] = final_recs[media_type][:10]

    return render_template('index.html', recommendations=final_recs)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)