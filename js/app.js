import { APP_NAME } from './config.js';
import { buildMovieURL, buildTVURL } from './providers.js';

document.title = `${APP_NAME} — buscador para Videasy`;
const perf = document.getElementById('perf');
for(let i=0;i<40;i++){ const s=document.createElement('span'); perf.appendChild(s); }

const q = document.getElementById('q');
const go = document.getElementById('go');
const apikey = document.getElementById('apikey');
const results = document.getElementById('results');
const status = document.getElementById('status');

const overlay = document.getElementById('overlay');
const player = document.getElementById('player');
const nowPlaying = document.getElementById('nowPlaying');
const closeBtn = document.getElementById('closeBtn');

async function search(){
  const query = q.value.trim();
  const key = apikey.value.trim();
  if(!query) return;
  if(!key){ status.style.display='block'; status.textContent='Falta la API key de TMDB.'; return; }

  results.innerHTML = '';
  status.style.display='block';
  status.textContent = 'Buscando…';

  try{
    const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${key}&query=${encodeURIComponent(query)}&language=es-ES`);
    const data = await res.json();
    const items = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');

    if(items.length === 0){
      status.textContent = 'No se encontró nada. Prueba con otro título.';
      return;
    }
    status.style.display='none';

    items.forEach(item => {
      const title = item.title || item.name;
      const date = item.release_date || item.first_air_date || '';
      const year = date ? date.slice(0,4) : '—';
      const poster = item.poster_path
        ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
        : null;

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <span class="badge">${item.media_type === 'tv' ? 'Serie' : 'Película'}</span>
        ${poster
          ? `<img class="poster" src="${poster}" alt="${title}">`
          : `<div class="poster" style="display:flex;align-items:center;justify-content:center;color:#5f5a53;font-size:12px;padding:10px;text-align:center;">sin imagen</div>`}
        <div class="meta">
          <div class="title">${title}</div>
          <div class="year">${year}</div>
        </div>
      `;
      card.addEventListener('click', () => openPlayer(item.media_type, item.id, title, year));
      results.appendChild(card);
    });
  }catch(err){
    status.style.display='block';
    status.textContent = 'Error buscando en TMDB. Revisa tu API key o tu conexión.';
  }
}

function openPlayer(type, id, title, year){
  overlay.classList.add('open');
  if(type === 'tv'){
    nowPlaying.innerHTML = `${title} <span>· ${year}</span>`;
    player.src = buildTVURL(id, 1, 1);
  } else {
    nowPlaying.innerHTML = `${title} <span>· ${year}</span>`;
    player.src = buildMovieURL(id);
  }
}

closeBtn.addEventListener('click', () => {
  overlay.classList.remove('open');
  player.src = '';
});

go.addEventListener('click', search);
q.addEventListener('keydown', e => { if(e.key === 'Enter') search(); });
