import { APP_NAME, TMDB_API_KEY } from './config.js';
import { providers } from './providers.js';

const $ = (id) => document.getElementById(id);
const results = $('results');
const dialog = $('detail-dialog');
const player = $('player');
let currentPage = 0;
let totalPages = 0;
let selected = null;
let opener = null;
let searchController;
let detailController;
let seasonController;
let seasons = [];
let episodes = [];
let loadingSeason = false;
let history = readStorage('fotograma.history', []);
if (!Array.isArray(history)) history = [];
history = history.filter((item) => item && Number.isSafeInteger(item.id) && item.id > 0 && ['movie', 'tv'].includes(item.media_type)).slice(0, 18);
let providerId = readStorage('fotograma.provider', providers[0]?.id);
if (!providers.some((provider) => provider.id === providerId)) providerId = providers[0]?.id;

document.title = `${APP_NAME} — Tu próxima gran historia`;
document.querySelectorAll('[data-app-name]').forEach((node) => { node.textContent = APP_NAME; });
providers.forEach((provider) => $('provider').add(new Option(provider.nombre, provider.id)));
$('provider').value = providerId || '';
$('rotate-provider').disabled = providers.length < 2;
$('provider-note').textContent = providers.length < 2 ? 'Solo hay un proveedor configurado. Puedes añadir los tuyos en js/providers.js.' : 'Prueba otro proveedor si este no reproduce.';

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { message('storage-warning', 'El navegador no permite guardar los datos locales. Tus cambios se conservarán solo durante esta sesión.'); }
}

function renderHistory() {
  $('history').hidden = !history.length;
  $('history-results').replaceChildren(...history.map(card));
}

function saveHistory() {
  const entry = {
    id: selected.id, media_type: selected.media_type, title: titleOf(selected),
    release_date: selected.release_date || selected.first_air_date,
    poster_path: selected.poster_path, vote_average: selected.vote_average,
    season: Number($('season').value), episode: Number($('episode').value),
  };
  history = [entry, ...history.filter((item) => item.id !== entry.id || item.media_type !== entry.media_type)].slice(0, 18);
  writeStorage('fotograma.history', history);
  renderHistory();
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function message(id, text = '') {
  $(id).textContent = text;
  $(id).hidden = !text;
}

async function tmdb(path, params = {}, signal) {
  const key = TMDB_API_KEY.trim();
  if (!key) throw new Error('La API key de TMDB no es válida, revisa js/config.js');
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.search = new URLSearchParams({ api_key: key, language: 'es-ES', ...params });
  const response = await fetch(url, { signal });
  if (response.status === 401) throw new Error('La API key de TMDB no es válida, revisa js/config.js');
  if (!response.ok) throw new Error('No pudimos consultar TMDB. Revisa tu conexión y la API key.');
  return response.json();
}

function titleOf(item) { return item.title || item.name || 'Título sin nombre'; }
function yearOf(item) { return (item.release_date || item.first_air_date || '').slice(0, 4) || 'Sin fecha'; }
function ratingOf(item) { return item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : 'Sin valoración'; }

function poster(item) {
  const fallback = element('div', 'poster-fallback', 'Sin póster');
  if (!item.poster_path) return fallback;
  const img = element('img', 'poster');
  img.src = `https://image.tmdb.org/t/p/w342${item.poster_path}`;
  img.alt = `Póster de ${titleOf(item)}`;
  img.loading = 'lazy';
  img.width = 342;
  img.height = 513;
  img.addEventListener('error', () => img.replaceWith(fallback), { once: true });
  return img;
}

function card(item) {
  const button = element('button', 'card');
  button.type = 'button';
  button.setAttribute('aria-label', `Ver detalle de ${titleOf(item)}`);
  const image = element('div', 'poster-wrap');
  image.append(poster(item), element('span', 'badge', item.media_type === 'tv' ? 'Serie' : 'Película'));
  const meta = element('span', 'card-meta');
  meta.append(element('span', '', yearOf(item)), element('span', 'rating', ratingOf(item)));
  if (item.media_type === 'tv' && item.episode > 0) meta.append(element('span', '', `T${item.season} · E${item.episode}`));
  button.append(image, element('span', 'card-title', titleOf(item)), meta);
  button.addEventListener('click', () => openDetail(item, button));
  return button;
}

async function search(append = false) {
  searchController?.abort();
  const controller = new AbortController();
  searchController = controller;
  const query = $('q').value.trim();
  const page = append ? currentPage + 1 : 1;
  $('catalog-title').textContent = query ? `Resultados para «${query}»` : 'En el radar';
  $('more').hidden = true;
  $('result-count').textContent = '';
  results.setAttribute('aria-busy', 'true');
  message('status');
  if (!append) {
    results.replaceChildren();
    for (let i = 0; i < 12; i++) {
      const skeleton = element('div', 'skeleton skeleton-card');
      skeleton.setAttribute('aria-hidden', 'true');
      results.append(skeleton);
    }
  }
  try {
    const data = await tmdb(query ? '/search/multi' : '/trending/all/week', { page, ...(query ? { query } : {}) }, controller.signal);
    if (controller.signal.aborted) return;
    if (!append) results.replaceChildren();
    const items = (data.results || []).filter((item) => ['movie', 'tv'].includes(item.media_type));
    results.append(...items.map(card));
    currentPage = page;
    totalPages = Math.min(data.total_pages || 0, 500);
    $('result-count').textContent = `${results.children.length} títulos`;
    $('more').hidden = currentPage >= totalPages;
    if (!results.children.length) message('status', 'Ninguna historia por aquí todavía. Prueba con otro título.');
  } catch (error) {
    if (controller.signal.aborted) return;
    if (!append) results.replaceChildren();
    message('status', error.message || 'No pudimos conectar con TMDB. Inténtalo de nuevo.');
    $('more').hidden = !append;
  } finally {
    if (searchController === controller) results.setAttribute('aria-busy', 'false');
  }
}

async function openDetail(item, trigger) {
  detailController?.abort();
  detailController = new AbortController();
  const controller = detailController;
  selected = null;
  seasonController?.abort();
  seasons = [];
  episodes = [];
  $('episode-controls').hidden = true;
  message('episode-status');
  $('play').disabled = true;
  opener = trigger;
  $('detail-content').hidden = true;
  $('playback').hidden = true;
  player.removeAttribute('src');
  message('detail-status', 'Preparando tu próxima historia…');
  dialog.showModal();
  document.body.classList.add('modal-open');
  $('close').focus();
  try {
    const detail = await tmdb(`/${item.media_type}/${item.id}`, {}, controller.signal);
    if (controller.signal.aborted) return;
    selected = { ...detail, media_type: item.media_type };
    $('detail-title').textContent = titleOf(selected);
    $('detail-type').textContent = item.media_type === 'tv' ? 'SERIE' : 'PELÍCULA';
    $('detail-meta').textContent = `${yearOf(selected)} · ${ratingOf(selected)}`;
    $('detail-genres').textContent = (detail.genres || []).map((genre) => genre.name).join(' · ');
    $('detail-overview').textContent = detail.overview || 'Esta historia todavía no tiene sinopsis disponible.';
    $('detail-poster').replaceChildren(poster(selected));
    $('detail-content').hidden = false;
    message('detail-status');
    if (selected.media_type === 'tv') {
      seasons = (detail.seasons || []).filter((season) => season.episode_count > 0).sort((a, b) => a.season_number - b.season_number);
      $('episode-controls').hidden = false;
      $('season').replaceChildren(...seasons.map((season) => new Option(season.name || `Temporada ${season.season_number}`, season.season_number)));
      const saved = history.find((entry) => entry.id === selected.id && entry.media_type === 'tv');
      const initial = seasons.find((season) => season.season_number === saved?.season) || seasons.find((season) => season.season_number > 0) || seasons[0];
      if (initial) {
        $('season').value = String(initial.season_number);
        await loadSeason(saved?.episode);
      } else {
        message('episode-status', 'TMDB todavía no tiene episodios para esta serie.');
        updateEpisodeButtons();
      }
    } else $('play').disabled = !providers.length;
  } catch (error) {
    if (!controller.signal.aborted) message('detail-status', error.message);
  }
}

async function loadSeason(preferredEpisode, last = false) {
  seasonController?.abort();
  const controller = new AbortController();
  seasonController = controller;
  const resume = !$('playback').hidden;
  player.removeAttribute('src');
  episodes = [];
  loadingSeason = true;
  $('episode').replaceChildren();
  $('episode').disabled = true;
  $('play').disabled = true;
  updateEpisodeButtons();
  message('episode-status', 'Cargando episodios…');
  try {
    const data = await tmdb(`/tv/${selected.id}/season/${$('season').value}`, {}, controller.signal);
    if (controller.signal.aborted) return;
    episodes = (data.episodes || []).filter((episode) => Number.isSafeInteger(episode.episode_number) && episode.episode_number > 0);
    $('episode').replaceChildren(...episodes.map((episode) => new Option(`${episode.episode_number}. ${episode.name || 'Sin título'}`, episode.episode_number)));
    const initial = episodes.find((episode) => episode.episode_number === preferredEpisode) || (last ? episodes.at(-1) : episodes[0]);
    if (initial) $('episode').value = String(initial.episode_number);
    message('episode-status', initial ? '' : 'No hay episodios disponibles en esta temporada.');
    $('episode').disabled = !initial;
    $('play').disabled = !initial || !providers.length;
    if (resume && initial) play();
  } catch (error) {
    if (!controller.signal.aborted) message('episode-status', error.message);
  } finally {
    if (seasonController === controller) { loadingSeason = false; updateEpisodeButtons(); }
  }
}

function updateEpisodeButtons() {
  const seasonIndex = seasons.findIndex((season) => season.season_number === Number($('season').value));
  const episodeIndex = episodes.findIndex((episode) => episode.episode_number === Number($('episode').value));
  $('previous').disabled = loadingSeason || episodeIndex < 0 || (seasonIndex === 0 && episodeIndex === 0);
  $('next').disabled = loadingSeason || episodeIndex < 0 || (seasonIndex === seasons.length - 1 && episodeIndex === episodes.length - 1);
}

function moveEpisode(direction) {
  const index = episodes.findIndex((episode) => episode.episode_number === Number($('episode').value));
  if (episodes[index + direction]) {
    $('episode').value = String(episodes[index + direction].episode_number);
    updateEpisodeButtons();
    if (!$('playback').hidden) play();
    return;
  }
  const seasonIndex = seasons.findIndex((season) => season.season_number === Number($('season').value));
  const season = seasons[seasonIndex + direction];
  if (season) { $('season').value = String(season.season_number); loadSeason(undefined, direction < 0); }
}

function play() {
  const provider = providers.find((entry) => entry.id === providerId);
  if (!selected || !provider || (selected.media_type === 'tv' && !episodes.length)) return;
  const season = Number($('season').value);
  const episode = Number($('episode').value);
  $('now-playing').textContent = `${titleOf(selected)}${selected.media_type === 'tv' ? ` · T${season} · E${episode}` : ''} · ${provider.nombre}`;
  player.src = selected.media_type === 'tv' ? provider.tv(selected.id, season, episode) : provider.movie(selected.id);
  $('playback').hidden = false;
  saveHistory();
  $('playback').scrollIntoView({ block: 'nearest' });
}

$('search-form').addEventListener('submit', (event) => { event.preventDefault(); search(); });
$('more').addEventListener('click', () => search(true));
$('play').addEventListener('click', play);
$('season').addEventListener('change', () => loadSeason());
$('episode').addEventListener('change', () => { updateEpisodeButtons(); if (!$('playback').hidden) play(); });
$('previous').addEventListener('click', () => moveEpisode(-1));
$('next').addEventListener('click', () => moveEpisode(1));
$('provider').addEventListener('change', () => {
  providerId = $('provider').value;
  writeStorage('fotograma.provider', providerId);
  play();
});
$('rotate-provider').addEventListener('click', () => {
  const index = providers.findIndex((provider) => provider.id === providerId);
  $('provider').value = providers[(index + 1) % providers.length].id;
  $('provider').dispatchEvent(new Event('change'));
});
$('clear-history').addEventListener('click', () => { history = []; writeStorage('fotograma.history', history); renderHistory(); });
$('close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  detailController?.abort();
  seasonController?.abort();
  player.removeAttribute('src');
  $('playback').hidden = true;
  document.body.classList.remove('modal-open');
  opener?.focus();
});
dialog.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll('button, input, select, a[href], iframe')].filter((node) => !node.disabled && node.getClientRects().length);
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

renderHistory();
search();
