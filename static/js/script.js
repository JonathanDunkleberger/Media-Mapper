document.addEventListener('DOMContentLoaded', () => {
    const inputSection = document.getElementById('input-section');
    if (!inputSection) return;

    // --- DOM Element References ---
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-container');
    const hiddenInputsContainer = document.getElementById('hidden-inputs');
    const submitBtn = document.getElementById('submit-btn');
    const recommendationForm = document.getElementById('recommendation-form');

    const favoriteContainers = {
        movie: document.getElementById('favorite-movies'),
        tv: document.getElementById('favorite-tv'),
        book: document.getElementById('favorite-book'),
        game: document.getElementById('favorite-games')
    };

    // --- State Management ---
    let debounceTimer;
    const selections = new Map();
    let abortController = null;

    // --- Core Functions ---
    const updateSubmitButton = () => {
        const count = selections.size;
        submitBtn.disabled = count < 3;
        if (count >= 50) {
            submitBtn.textContent = 'Maximum reached (50)';
            submitBtn.disabled = false;
        } else if (count >= 3) {
            submitBtn.textContent = `Find Recommendations (${count} selected)`;
        } else {
            const needed = 3 - count;
            submitBtn.textContent = `Select ${needed} more favorite${needed > 1 ? 's' : ''}`;
        }
    };

    const fetchSearchResults = async (query) => {
        if (abortController) {
            abortController.abort(); // Cancel the previous request
        }
        abortController = new AbortController();

        try {
            const response = await fetch(`/search?query=${encodeURIComponent(query)}`, { signal: abortController.signal });
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            renderSearchResults(data);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Search fetch error:", error);
                resultsContainer.innerHTML = `<div class="p-4 text-gray-400">Could not fetch results.</div>`;
                resultsContainer.classList.remove('hidden');
            }
        }
    };

    const renderSearchResults = (items) => {
        resultsContainer.innerHTML = '';
        if (!items || items.length === 0) {
            resultsContainer.classList.add('hidden');
            return;
        }

        // Top Result Banner
        const topResult = items[0];
        if (topResult && topResult.banner_path) {
            resultsContainer.innerHTML += `
                <button type="button" class="top-result-banner" data-item='${JSON.stringify(topResult)}'>
                    <img src="${topResult.banner_path}" alt="Backdrop for ${topResult.title}" class="top-result-img">
                    <div class="top-result-overlay">
                        <div>
                            <div class="font-bold text-lg">${topResult.title}</div>
                            <div class="text-sm text-gray-300">${(topResult.release_date || '').slice(0, 4)} • ${topResult.media_type.toUpperCase()}</div>
                        </div>
                        <span class="add-button">Add</span>
                    </div>
                </button>
            `;
        }

        // List of other results, excluding the top one
        const itemsHtml = items.slice(1).map(item => `
            <button type="button" class="result-item" data-item='${JSON.stringify(item)}'>
                <img src="${item.poster_path || 'https://placehold.co/80x120/1e293b/475569?text=?'}" alt="Poster" class="result-poster">
                <div class="result-text">
                    <div class="font-semibold">${item.title}</div>
                    <div class="text-xs text-gray-400">${(item.release_date || '').slice(0, 4)} • ${item.media_type.toUpperCase()}</div>
                </div>
            </button>
        `).join('');

        const listContainer = document.createElement('div');
        listContainer.className = 'result-list';
        listContainer.innerHTML = itemsHtml;
        resultsContainer.appendChild(listContainer);
        
        resultsContainer.classList.remove('hidden');
    };
    
    const addItem = (item) => {
        const itemId = `${item.media_type}-${item.id}`;
        if (selections.has(itemId) || selections.size >= 50) return;

        selections.set(itemId, item);

        const container = favoriteContainers[item.media_type];
        if (!container) return;
        
        const card = document.createElement('div');
        card.id = `card-${itemId}`;
        card.className = 'favorite-card';
        card.innerHTML = `
            <img src="${item.poster_path || 'https://placehold.co/200x300/1e293b/475569?text=?'}" alt="Poster" class="favorite-poster">
            <button type="button" class="remove-btn" title="Remove">&times;</button>
        `;

        container.appendChild(card);
        // Trigger animation
        requestAnimationFrame(() => card.classList.add('is-visible'));

        // Add hidden input for the form
        hiddenInputsContainer.innerHTML += `<input type="hidden" name="media_selection" value="${itemId}" id="hidden-${itemId}">`;

        card.querySelector('.remove-btn').addEventListener('click', () => removeItem(itemId));

        updateSubmitButton();
        searchInput.value = '';
        resultsContainer.classList.add('hidden');
        searchInput.focus();
    };

    const removeItem = (itemId) => {
        selections.delete(itemId);
        
        const card = document.getElementById(`card-${itemId}`);
        const hiddenInput = document.getElementById(`hidden-${itemId}`);
        
        if (card) {
            card.classList.remove('is-visible');
            card.addEventListener('transitionend', () => card.remove(), { once: true });
        }
        if (hiddenInput) hiddenInput.remove();
        
        updateSubmitButton();
    };


    // --- Event Listeners ---
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }
        debounceTimer = setTimeout(() => fetchSearchResults(query), 250);
    });

    resultsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-item]');
        if (button) {
            const item = JSON.parse(button.dataset.item);
            addItem(item);
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
    
    recommendationForm.addEventListener('submit', (e) => {
        if (selections.size < 3) {
            e.preventDefault();
            alert('Please select at least 3 favorites to get recommendations.');
        }
    });

    // --- Init ---
    updateSubmitButton();
});