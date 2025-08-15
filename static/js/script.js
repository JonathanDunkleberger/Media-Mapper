document.addEventListener('DOMContentLoaded', () => {
    const inputSection = document.getElementById('input-section');
    if (!inputSection) return;

    // DOM refs
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-container');
    const loadingEl = document.getElementById('search-loading');
    const hiddenInputs = document.getElementById('hidden-inputs');
    const submitBtn = document.getElementById('submit-btn');
    const form = document.getElementById('recommendation-form');

    const favoriteEls = {
        movie: document.getElementById('favorite-movies'),
        tv: document.getElementById('favorite-tv'),
        book: document.getElementById('favorite-book'),
        game: document.getElementById('favorite-games')
    };

    // State
    let suggestions = [];
    let highlighted = -1;
    let debounceTimer = null;
    const picks = new Map();

    // Helpers
    function setLoading(on){ loadingEl && loadingEl.classList.toggle('hidden', !on); }
    function updateSubmit(){
        submitBtn.disabled = picks.size < 3;
        submitBtn.textContent = picks.size < 3 ? `Select at least ${3 - picks.size} more` : `Find recommendations (${picks.size})`;
    }

    function debounce(fn, ms){ return (...args)=>{ clearTimeout(debounceTimer); debounceTimer = setTimeout(()=>fn(...args), ms); }; }

    // Render suggestions
    function renderSuggestions(items){
        suggestions = items || [];
        resultsContainer.innerHTML = '';
        if(!items || items.length===0){ resultsContainer.classList.add('hidden'); return; }

        const list = document.createElement('div');
        list.className = 'divide-y divide-gray-700';

        items.slice(0,8).forEach((it, i)=>{
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'search-result-item w-full text-left px-3 py-2 flex items-center gap-3';
            btn.dataset.index = i;

            const img = document.createElement('img');
            img.className = 'search-result-poster';
            img.alt = it.title || it.name || 'Untitled';
            img.src = it.poster_path || `https://placehold.co/80x120/1f2937/ffffff?text=${encodeURIComponent(img.alt)}`;
            img.onerror = ()=> img.src = `https://placehold.co/80x120/1f2937/ffffff?text=${encodeURIComponent(img.alt)}`;

            const meta = document.createElement('div');
            meta.className = 'flex-1';
            const title = document.createElement('div'); title.className='font-medium'; title.textContent = it.title || it.name || 'Untitled';
            const sub = document.createElement('div'); sub.className='text-sm text-gray-400';
            const year = (it.release_date || it.first_air_date || it.publishedDate || '').slice(0,4);
            sub.textContent = [it.media_type || '', year].filter(Boolean).join(' • ');

            meta.appendChild(title); meta.appendChild(sub);
            btn.appendChild(img); btn.appendChild(meta);
            btn.addEventListener('click', ()=> pick(it));
            list.appendChild(btn);
        });

        resultsContainer.appendChild(list);
        resultsContainer.classList.remove('hidden');
        highlighted = -1;
    }

    function pick(it){
        const media = it.media_type || 'unknown';
        const id = it.id ? `${media}-${it.id}` : `${media}-${Math.random().toString(36).slice(2,9)}`;
        if(picks.has(id)) return;
        if(picks.size >= 25) return;

        picks.set(id, it);

        const el = favoriteEls[media] || favoriteEls.movie;
        const card = document.createElement('div'); card.className='favorite-card'; card.id = `card-${id}`;

        const img = document.createElement('img'); img.className='favorite-card-poster'; img.alt = it.title || it.name || 'Untitled'; img.src = it.poster_path || `https://placehold.co/160x240/1f2937/ffffff?text=${encodeURIComponent(img.alt)}`;
        img.onerror = ()=> img.src = `https://placehold.co/160x240/1f2937/ffffff?text=${encodeURIComponent(img.alt)}`;

        const remove = document.createElement('button'); remove.type='button'; remove.className='remove-btn'; remove.title='Remove'; remove.innerHTML='×';
        remove.addEventListener('click', ()=>{
            picks.delete(id); card.remove(); const h = document.getElementById(`hidden-${id}`); if(h) h.remove(); updateSubmit();
        });

        card.appendChild(img); card.appendChild(remove);
        el.appendChild(card);

        const hidden = document.createElement('input'); hidden.type='hidden'; hidden.name='media_selection'; hidden.value = id; hidden.id = `hidden-${id}`; hiddenInputs.appendChild(hidden);

        resultsContainer.classList.add('hidden'); searchInput.value = ''; updateSubmit();
    }

    // Keyboard navigation
    searchInput.addEventListener('keydown', (e)=>{
        const items = Array.from(resultsContainer.querySelectorAll('.search-result-item'));
        if(!items.length) return;
        if(e.key === 'ArrowDown'){ e.preventDefault(); highlighted = (highlighted+1)%items.length; items.forEach((it,i)=> it.classList.toggle('bg-gray-700', i===highlighted)); items[highlighted].scrollIntoView({block:'nearest'}); }
        else if(e.key === 'ArrowUp'){ e.preventDefault(); highlighted = (highlighted-1+items.length)%items.length; items.forEach((it,i)=> it.classList.toggle('bg-gray-700', i===highlighted)); items[highlighted].scrollIntoView({block:'nearest'}); }
        else if(e.key === 'Enter'){ e.preventDefault(); if(highlighted>=0) items[highlighted].click(); }
        else if(e.key === 'Escape'){ resultsContainer.classList.add('hidden'); }
    });

    // Click outside
    document.addEventListener('click', (ev)=>{
        if(!resultsContainer.contains(ev.target) && ev.target !== searchInput){ resultsContainer.classList.add('hidden'); }
    });

    // Debounced search
    const doSearch = debounce(async (q)=>{
        try{ setLoading(true); const res = await fetch(`/search?query=${encodeURIComponent(q)}`, {cache:'no-store'}); if(!res.ok) throw new Error('search failed'); const data = await res.json(); renderSuggestions(data); }
        catch(err){ console.error(err); resultsContainer.innerHTML = `<div class="p-3 text-gray-400">No results</div>`; resultsContainer.classList.remove('hidden'); }
        finally{ setLoading(false); }
    }, 200);

    searchInput.addEventListener('input', (e)=>{ const q = e.target.value.trim(); if(q.length < 2){ resultsContainer.classList.add('hidden'); return; } doSearch(q); });

    // Form guard
    form.addEventListener('submit', (e)=>{ if(picks.size < 3){ e.preventDefault(); alert('Please select at least 3 favorites to get recommendations.'); } });

    // Init
    updateSubmit();
});