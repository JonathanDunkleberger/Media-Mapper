document.addEventListener('DOMContentLoaded', () => {
    const inputSection = document.getElementById('input-section');
    if (!inputSection) return;

    // --- DOM Element References ---
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const hiddenInputsContainer = document.getElementById('hidden-inputs');
    const submitBtn = document.getElementById('submit-btn');

    const favoriteContainers = {
        movie: document.getElementById('favorite-movies'),
        tv: document.getElementById('favorite-tv'),
        book: document.getElementById('favorite-book'),
        game: document.getElementById('favorite-games')
    };

    // --- State Management ---
    let debounceTimer;
    const selectedItems = new Map(); // Use a Map to store full item data
    let mediaFilter = localStorage.getItem('mediaFilter') || 'all';
    let currentController = null;

    // --- Functions ---
    function updateSubmitButton() {
        const count = selectedItems.size;
        submitBtn.disabled = count < 3;
        if (count >= 3) {
            submitBtn.textContent = `Find Recommendations (${count} favorites)`;
        } else {
            const needed = 3 - count;
            submitBtn.textContent = `Select ${needed} more favorite${needed > 1 ? 's' : ''}`;
        }
    }

    async function fetchSearchResults(query) {
        try {
            // cancel previous request
            if (currentController) currentController.abort();
            currentController = new AbortController();
            const response = await fetch(`/search?query=${encodeURIComponent(query)}`, { signal: currentController.signal });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            displayResults(data);
        } catch (error) {
            if (error.name === 'AbortError') return; // cancelled
            console.error("Failed to fetch search results:", error);
            searchResultsContainer.innerHTML = `<div class="p-3 text-gray-400">Error fetching results.</div>`;
            searchResultsContainer.classList.remove('hidden');
        }
    }

    function displayResults(results) {
        searchResultsContainer.innerHTML = '';
        // normalize shape coming from various callers (array or { value: [...] })
        if (!results) {
            searchResultsContainer.classList.add('hidden');
            return;
        }
        if (results.value && Array.isArray(results.value)) results = results.value;
        if (!Array.isArray(results) || results.length === 0) {
            searchResultsContainer.classList.add('hidden');
            return;
        }

    // client-side sort to ensure the UI honors backend ranking signals
        results.sort((a, b) => {
            const ka = (a._exact_match ? 10000 : 0) + (a._token_match || 0) * 200 + (a._media_pri || 0) * 500 + (a._prefix_match ? 10 : 0) + (a._score || 0);
            const kb = (b._exact_match ? 10000 : 0) + (b._token_match || 0) * 200 + (b._media_pri || 0) * 500 + (b._prefix_match ? 10 : 0) + (b._score || 0);
            return kb - ka;
        });

        // apply media filter (all/game/movie/book)
        if (mediaFilter && mediaFilter !== 'all') {
            results = results.filter(r => (r.media_type || '').toLowerCase() === mediaFilter);
        }

        // Always render a prominent top banner for the first result (if available)
        const top = results[0];
        if (top) {
            const banner = document.createElement('div');
            banner.className = 'search-top-banner mb-3 rounded-md overflow-hidden relative';
            const bannerImg = document.createElement('img');
            bannerImg.loading = 'lazy';
            bannerImg.src = top.banner_path || top.poster_path || top.image_url || 'https://placehold.co/800x200/111827/ffffff?text=No+Image';
            bannerImg.alt = top.title || top.name || 'Top result';
            bannerImg.className = 'w-full h-36 object-cover';
            bannerImg.onerror = () => bannerImg.src = 'https://placehold.co/800x200/111827/ffffff?text=No+Image';

            const overlay = document.createElement('div');
            overlay.className = 'p-3 bg-gradient-to-t from-black/80 to-transparent w-full text-white flex items-center justify-between absolute bottom-0 left-0 right-0';
            const metaLeft = document.createElement('div');
            const title = document.createElement('div'); title.className='text-lg font-semibold'; title.textContent = top.title || top.name || 'Untitled';
            const yearRaw = top.release_date || top.first_air_date || top.publishedDate || '';
            const year = yearRaw ? ('' + yearRaw).slice(0,4) : 'N/A';
            const sub = document.createElement('div'); sub.className='text-sm text-gray-300'; sub.textContent = `${(top.media_type||'').toUpperCase()} • ${year}`;
            metaLeft.appendChild(title); metaLeft.appendChild(sub);
            const addBtn = document.createElement('button'); addBtn.type='button'; addBtn.className='p-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'; addBtn.textContent='Add to favorites';
            addBtn.addEventListener('click', ()=> addSelectedItem(top));

            overlay.appendChild(metaLeft); overlay.appendChild(addBtn);
            // show a small placeholder badge when this is a backend placeholder entry
            if (top.id && String(top.id).startsWith('ph-')) {
                const badge = document.createElement('span');
                badge.textContent = 'Placeholder';
                badge.className = 'ml-3 inline-block text-xs font-medium text-gray-200 bg-gray-600 px-2 py-1 rounded';
                badge.style.opacity = '0.9';
                metaLeft.appendChild(badge);
            }
            banner.appendChild(bannerImg);
            banner.appendChild(overlay);
            searchResultsContainer.appendChild(banner);
        }

        // Render list items after banner; skip the top entry already shown as banner
        const fragment = document.createDocumentFragment();
        results.slice(0, 12).forEach(item => {
            const resultItem = document.createElement('button');
            resultItem.type = 'button';
            resultItem.className = 'search-result-item';
            const posterPath = item.poster_path || item.image_url || 'https://placehold.co/40x60/1f2937/ffffff?text=?';
            const year = (item.release_date || 'N/A').substring(0, 4);

            const img = document.createElement('img');
            img.loading = 'lazy';
            img.src = posterPath;
            img.alt = `Poster for ${item.title || item.name}`;
            img.className = 'search-result-poster';
            img.onerror = () => img.src = 'https://placehold.co/40x60/1f2937/ffffff?text=?';

            const textContainer = document.createElement('div');
            textContainer.className = 'search-result-text';

            const titleEl = document.createElement('div');
            titleEl.className = 'font-semibold text-white';
            titleEl.textContent = item.title;

            // tiny placeholder badge for list items
            if (item.id && String(item.id).startsWith('ph-')) {
                const ph = document.createElement('span');
                ph.textContent = 'placeholder';
                ph.className = 'ml-2 text-xs text-gray-300';
                titleEl.appendChild(ph);
            }

            const detailEl = document.createElement('div');
            detailEl.className = 'text-xs text-gray-400';
            detailEl.textContent = `${year} · ${(item.media_type || 'unknown').toUpperCase()}`;

            textContainer.append(titleEl, detailEl);
            resultItem.append(img, textContainer);

            resultItem.addEventListener('click', () => addSelectedItem(item));
            fragment.appendChild(resultItem);
        });
        searchResultsContainer.appendChild(fragment);

        searchResultsContainer.classList.remove('hidden');
    }

    function addSelectedItem(item) {
        const itemId = `${item.media_type}-${item.id}`;
        if (selectedItems.has(itemId) || selectedItems.size >= 25) {
            searchInput.value = '';
            searchResultsContainer.classList.add('hidden');
            return;
        }

        selectedItems.set(itemId, item);

        const container = favoriteContainers[item.media_type];
        if (!container) return;

        const card = document.createElement('div');
        card.id = `card-${itemId}`;
        card.className = 'favorite-card';

        const posterPath = item.poster_path || 'https://placehold.co/200x300/1f2937/ffffff?text=?';
        const year = (item.release_date || 'N/A').substring(0, 4);
        const overview = item.overview || 'No description available.';

        card.innerHTML = `
            <img src="${posterPath}" alt="Poster for ${item.title}" class="favorite-card-poster">
            <div class="favorite-card-overlay">
                <div class="favorite-card-content">
                    <h4 class="favorite-card-title">${item.title}</h4>
                    <p class="favorite-card-year">${year}</p>
                    <p class="favorite-card-desc">${overview.substring(0, 70)}...</p>
                </div>
            </div>
            <button type="button" class="remove-btn" title="Remove" aria-label="Remove ${item.title}">&times;</button>
        `;

        card.querySelector('.remove-btn').addEventListener('click', () => {
            selectedItems.delete(itemId);
            card.remove();
            document.getElementById(`hidden-${itemId}`).remove();
            updateSubmitButton();
        });

        requestAnimationFrame(() => {
            card.classList.add('fade-in');
        });

        container.appendChild(card);

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'media_selection';
        hiddenInput.value = itemId;
        hiddenInput.id = `hidden-${itemId}`;
        hiddenInputsContainer.appendChild(hiddenInput);

        searchInput.value = '';
        searchResultsContainer.classList.add('hidden');
        updateSubmitButton();
    }

    // --- Event Listeners ---
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        if (query.length < 2) {
            searchResultsContainer.classList.add('hidden');
            return;
        }
        debounceTimer = setTimeout(() => fetchSearchResults(query), 120);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResultsContainer.contains(e.target)) {
            searchResultsContainer.classList.add('hidden');
        }
    });

    // Media toggle wiring
    const mediaToggle = document.getElementById('media-toggle');
    if (mediaToggle) {
        const buttons = mediaToggle.querySelectorAll('.media-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                mediaFilter = btn.dataset.media;
                localStorage.setItem('mediaFilter', mediaFilter);
                // re-run current query if there's text
                const q = searchInput.value.trim();
                if (q.length >= 2) fetchSearchResults(q);
            });
        });
        // default active
    const allBtn = mediaToggle.querySelector('[data-media="' + mediaFilter + '"]');
    if (allBtn) { allBtn.classList.add('active'); allBtn.setAttribute('aria-pressed', 'true'); }
    }

    updateSubmitButton();
});
