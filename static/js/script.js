document.addEventListener('DOMContentLoaded', () => {
    const inputSection = document.getElementById('input-section');
    if (!inputSection) return;

    // --- DOM Element References ---
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-container');
    const loadingEl = document.getElementById('search-loading');
    const hiddenInputs = document.getElementById('hidden-inputs');
    const submitBtn = document.getElementById('submit-btn');
    const form = document.getElementById('recommendation-form');

    const favoriteContainers = {
        movie: document.getElementById('favorite-movies'),
        tv: document.getElementById('favorite-tv'),
        book: document.getElementById('favorite-book'),
        game: document.getElementById('favorite-games')
    };

    // --- State Management ---
    let debounceTimer = null;
    const selectedItems = new Map();
    let mediaFilter = 'all';

    // --- Functions ---
    function updateSubmitButton() {
        const count = selectedItems.size;
        submitBtn.disabled = count < 3;
        submitBtn.textContent = count < 3 ? `Select at least ${3 - count} more` : `Find recommendations (${count})`;
    }

    const debounce = (fn, ms) => (...args) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fn(...args), ms);
    };

    function displayResults(items) {
        resultsContainer.innerHTML = '';
        if (!items || items.length === 0) {
            resultsContainer.classList.add('hidden');
            return;
        }

        let filteredItems = items;
        if (mediaFilter !== 'all') {
            filteredItems = items.filter(it => it.media_type === mediaFilter);
        }

        const topResult = filteredItems[0];
        if (topResult) {
            const banner = document.createElement('div');
            banner.className = 'search-top-banner mb-3 rounded-md overflow-hidden relative';
            banner.innerHTML = `
                <img src="${topResult.banner_path || topResult.poster_path || 'https://placehold.co/800x200/111827/ffffff?text=No+Image'}" alt="${topResult.title || 'Top result'}" class="w-full h-36 object-cover">
                <div class="p-3 bg-gradient-to-t from-black/80 to-transparent w-full text-white flex items-center justify-between absolute bottom-0 left-0 right-0">
                    <div>
                        <div class="text-lg font-semibold">${topResult.title || 'Untitled'}</div>
                        <div class="text-sm text-gray-300">${(topResult.media_type || '').toUpperCase()} • ${(topResult.release_date || '').slice(0, 4) || 'N/A'}</div>
                    </div>
                    <button type="button" class="p-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">Add to favorites</button>
                </div>
            `;
            banner.querySelector('button').addEventListener('click', () => addSelectedItem(topResult));
            resultsContainer.appendChild(banner);
        }

        const list = document.createElement('div');
        list.className = 'divide-y divide-gray-700';
        filteredItems.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'search-result-item w-full text-left px-3 py-2 flex items-center gap-3';
            btn.innerHTML = `
                <img src="${item.poster_path || `https://placehold.co/80x120/1f2937/ffffff?text=${encodeURIComponent(item.title)}`}" alt="${item.title}" class="search-result-poster">
                <div class="flex-1">
                    <div class="font-medium">${item.title || 'Untitled'}</div>
                    <div class="text-sm text-gray-400">${(item.media_type || '')} • ${(item.release_date || '').slice(0, 4) || ''}</div>
                </div>
            `;
            btn.addEventListener('click', () => addSelectedItem(item));
            list.appendChild(btn);
        });

        resultsContainer.appendChild(list);
        resultsContainer.classList.remove('hidden');
    }

    function addSelectedItem(item) {
        const id = `${item.media_type}-${item.id}`;
        if (selectedItems.has(id) || selectedItems.size >= 25) return;

        selectedItems.set(id, item);

        const container = favoriteContainers[item.media_type];
        if (!container) return;

        const card = document.createElement('div');
        card.className = 'favorite-card';
        card.id = `card-${id}`;
        
        const posterPath = item.poster_path || `https://placehold.co/200x300/1f2937/ffffff?text=${encodeURIComponent(item.title)}`;
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
            selectedItems.delete(id);
            card.remove();
            document.getElementById(`hidden-${id}`).remove();
            updateSubmitButton();
        });

        requestAnimationFrame(() => card.classList.add('fade-in'));
        container.appendChild(card);

        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'media_selection';
        hidden.value = id;
        hidden.id = `hidden-${id}`;
        hiddenInputs.appendChild(hidden);

        resultsContainer.classList.add('hidden');
        searchInput.value = '';
        updateSubmitButton();
    }

    const doSearch = debounce(async (q) => {
        try {
            loadingEl && loadingEl.classList.remove('hidden');
            const res = await fetch(`/search?query=${encodeURIComponent(q)}`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            displayResults(data);
        } catch (err) {
            console.error(err);
            resultsContainer.innerHTML = `<div class="p-3 text-gray-400">No results</div>`;
            resultsContainer.classList.remove('hidden');
        } finally {
            loadingEl && loadingEl.classList.add('hidden');
        }
    }, 200);

    searchInput.addEventListener('input', e => {
        const q = e.target.value.trim();
        if (q.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }
        doSearch(q);
    });
    
    document.getElementById('media-toggle')?.querySelectorAll('.media-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            mediaFilter = btn.dataset.media;
            const q = searchInput.value.trim();
            if (q.length >= 2) doSearch(q);
        });
    });

    updateSubmitButton();
});
