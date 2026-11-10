import { APP_NAME, TMDB_API_KEY } from './config.js';
import { Availability, getSources, playbackKey, selectSource } from './providers.js';

const $ = (id) => document.getElementById(id);
const results = $('results');
const dialog = $('detail-dialog');
const player = $('player');
let currentPage = 0;
let totalPages = 0;
let currentQuery = '';
let debounceTimer;
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
let preferredProviderId = readStorage('fotograma.provider', null);
let availability = readStorage('fotograma.availability', {});
if (!availability || typeof availability !== 'object' || Array.isArray(availability)) availability = {};
const sourceErrors = new Set();
let sources = [];
let activeSource = null;
let playbackTarget = null;
const categories = { primary: 'Principales', alternative: 'Alternativos', classic: 'Cine clásico', experimental: 'Experimentales' };
const availabilityLabels = {
  AVAILABLE: 'Reproducción confirmada por ti',
  UNAVAILABLE: 'Título ausente según tu comprobación',
  UNKNOWN: 'Reproducción sin verificar',
  ERROR: 'Error técnico',
};
let safeModes = readStorage('fotograma.safeModes', {});
if (!safeModes || typeof safeModes !== 'object' || Array.isArray(safeModes)) safeModes = {};

document.title = `${APP_NAME} — Tu próxima gran historia`;
document.querySelector('[property="og:title"]').content = document.title;
document.querySelectorAll('[data-app-name]').forEach((node) => { node.textContent = APP_NAME; });
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
  const timeout = AbortSignal.timeout(12000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await fetch(url, { signal: requestSignal });
    if (response.status === 401) throw new Error('La API key de TMDB no es válida, revisa js/config.js');
    if (response.status === 429) throw new Error('TMDB ha recibido demasiadas consultas. Espera unos segundos y vuelve a intentarlo.');
    if (response.status === 404) throw new Error('Este título o temporada ya no está disponible en TMDB.');
    if (!response.ok) throw new Error('TMDB no está disponible en este momento. Vuelve a intentarlo en unos minutos.');
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new SyntaxError();
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw new Error('TMDB tardó demasiado en responder. Revisa tu conexión y vuelve a intentarlo.');
    if (error instanceof TypeError) throw new Error('No pudimos conectar con TMDB. Revisa tu conexión a internet y vuelve a intentarlo.');
    if (error instanceof SyntaxError) throw new Error('TMDB devolvió una respuesta inesperada. Vuelve a intentarlo.');
    throw error;
  }
}

function titleOf(item) { return [item.title, item.name].find((value) => typeof value === 'string' && value.trim()) || 'Título sin nombre'; }
function yearOf(item) { return [item.release_date, item.first_air_date].find((value) => typeof value === 'string' && /^\d{4}-/.test(value))?.slice(0, 4) || 'Sin fecha'; }
function ratingOf(item) { return Number.isFinite(item.vote_average) && item.vote_average > 0 ? `★ ${item.vote_average.toFixed(1)}` : 'Sin valoración'; }

function poster(item) {
  const fallback = element('div', 'poster-fallback', 'Sin póster');
  if (typeof item.poster_path !== 'string' || !/^\/[\w.-]+$/.test(item.poster_path)) return fallback;
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
  button.dataset.mediaKey = `${item.media_type}-${item.id}`;
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
  append = append && query === currentQuery;
  currentQuery = query;
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
    if (!Array.isArray(data.results)) throw new Error('TMDB devolvió una lista inesperada. Vuelve a intentarlo.');
    const items = data.results.filter((item) => item && Number.isSafeInteger(item.id) && item.id > 0 && ['movie', 'tv'].includes(item.media_type));
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
  clearSources();
  seasonController?.abort();
  seasons = [];
  episodes = [];
  $('episode-controls').hidden = true;
  message('episode-status');
  message('player-status');
  $('play').disabled = true;
  opener = trigger;
  $('detail-content').hidden = true;
  $('playback').hidden = true;
  message('detail-status', 'Preparando tu próxima historia…');
  dialog.showModal();
  document.body.classList.add('modal-open');
  $('close').focus();
  try {
    const detail = await tmdb(`/${item.media_type}/${item.id}`, {}, controller.signal);
    if (controller.signal.aborted) return;
    selected = { ...detail, id: item.id, media_type: item.media_type };
    $('detail-title').textContent = titleOf(selected);
    $('detail-type').textContent = item.media_type === 'tv' ? 'SERIE' : 'PELÍCULA';
    $('detail-meta').textContent = `${yearOf(selected)} · ${ratingOf(selected)}`;
    $('detail-genres').textContent = (Array.isArray(detail.genres) ? detail.genres : []).filter((genre) => genre && typeof genre.name === 'string').map((genre) => genre.name).join(' · ');
    $('detail-overview').textContent = typeof detail.overview === 'string' && detail.overview.trim() ? detail.overview : 'Esta historia todavía no tiene sinopsis disponible.';
    $('detail-poster').replaceChildren(poster(selected));
    $('detail-content').hidden = false;
    message('detail-status');
    if (selected.media_type === 'tv') {
      seasons = (Array.isArray(detail.seasons) ? detail.seasons : []).filter((season) => season && Number.isSafeInteger(season.season_number) && season.season_number >= 0 && season.episode_count > 0).sort((a, b) => a.season_number - b.season_number);
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
    } else updateSources();
  } catch (error) {
    if (!controller.signal.aborted) message('detail-status', error.message);
  }
}

async function loadSeason(preferredEpisode, last = false) {
  seasonController?.abort();
  const controller = new AbortController();
  seasonController = controller;
  const resume = !$('playback').hidden;
  clearSources();
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
    episodes = (Array.isArray(data.episodes) ? data.episodes : []).filter((episode) => episode && Number.isSafeInteger(episode.episode_number) && episode.episode_number > 0);
    $('episode').replaceChildren(...episodes.map((episode) => new Option(`${episode.episode_number}. ${episode.name || 'Sin título'}`, episode.episode_number)));
    const initial = episodes.find((episode) => episode.episode_number === preferredEpisode) || (last ? episodes.at(-1) : episodes[0]);
    if (initial) $('episode').value = String(initial.episode_number);
    message('episode-status', initial ? '' : 'No hay episodios disponibles en esta temporada.');
    $('episode').disabled = !initial;
    if (initial) updateSources();
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
    updateEpisodeSelection();
    return;
  }
  const seasonIndex = seasons.findIndex((season) => season.season_number === Number($('season').value));
  const season = seasons[seasonIndex + direction];
  if (season) { $('season').value = String(season.season_number); loadSeason(undefined, direction < 0); }
}

function usesSafeMode(id) {
  return safeModes[id] !== false;
}

function statusFor(id) {
  const key = playbackKey(playbackTarget, id);
  if (sourceErrors.has(key)) return Availability.ERROR;
  const saved = availability[key];
  return [Availability.AVAILABLE, Availability.UNAVAILABLE].includes(saved) ? saved : Availability.UNKNOWN;
}

function updateOptions() {
  for (const option of $('provider').options) {
    const source = sources.find(({ id }) => id === option.value);
    const blocked = source.requiresUnsandboxed && usesSafeMode(source.id);
    option.textContent = `${source.nombre} · ${blocked ? 'Modo seguro incompatible' : availabilityLabels[statusFor(source.id)]}`;
  }
}

function clearSources() {
  player.removeAttribute('src');
  activeSource = null;
  playbackTarget = null;
  sources = [];
  $('provider').replaceChildren();
  $('provider').disabled = true;
  $('rotate-provider').disabled = true;
  $('safe-mode').disabled = true;
  $('availability-report').disabled = true;
  $('now-playing').textContent = '';
  message('provider-note');
  message('player-status');
}

function updateSources() {
  playbackTarget = {
    media_type: selected.media_type,
    id: selected.id,
    season: Number($('season').value),
    episode: Number($('episode').value),
  };
  sources = getSources(playbackTarget, location.origin);
  activeSource = selectSource(sources, preferredProviderId, statusFor, usesSafeMode);
  const groups = [];
  for (const [category, label] of Object.entries(categories)) {
    const options = sources.filter((source) => (source.category || 'primary') === category);
    if (!options.length) continue;
    const group = document.createElement('optgroup');
    group.label = label;
    group.append(...options.map((source) => new Option(source.nombre, source.id)));
    groups.push(group);
  }
  $('provider').replaceChildren(...groups);
  $('provider').value = activeSource?.id || '';
  $('provider').disabled = !activeSource;
  $('safe-mode').disabled = !activeSource;
  $('rotate-provider').disabled = sources.length < 2;
  $('play').disabled = !activeSource;
  message('player-status', activeSource ? '' : 'No hay proveedores compatibles para esta selección.');
  updateOptions();
}

function updateEpisodeSelection() {
  updateEpisodeButtons();
  updateSources();
  if (!$('playback').hidden) play();
}

function updateProviderStatus() {
  const status = statusFor(activeSource.id);
  message('provider-note', availabilityLabels[status]);
  $('availability-report').value = status;
}

function play({ retry = false } = {}) {
  if (!activeSource) return;
  const { season, episode, media_type } = playbackTarget;
  const safe = usesSafeMode(activeSource.id);
  const blocked = safe && activeSource.requiresUnsandboxed;
  $('safe-mode').checked = safe;
  $('now-playing').textContent = `${titleOf(selected)}${media_type === 'tv' ? ` · T${season} · E${episode}` : ''} · ${activeSource.nombre}`;
  $('playback').hidden = false;
  const reload = retry || player.getAttribute('src') !== activeSource.url || player.hasAttribute('sandbox') !== safe;
  if (blocked || reload) player.removeAttribute('src');
  if (reload) {
    if (safe) player.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
    else player.removeAttribute('sandbox');
  }
  $('availability-report').disabled = blocked;
  message('player-status', blocked ? 'Este proveedor rechaza el modo seguro. Puedes elegir otra fuente.' : '');
  if (!blocked && reload) {
    sourceErrors.delete(playbackKey(playbackTarget, activeSource.id));
    player.src = activeSource.url;
    if (!retry) saveHistory();
  }
  updateOptions();
  updateProviderStatus();
}

function chooseProvider(id) {
  const source = sources.find((entry) => entry.id === id);
  if (!source) return;
  activeSource = source;
  preferredProviderId = id;
  $('provider').value = id;
  writeStorage('fotograma.provider', id);
  play();
}

$('search-form').addEventListener('submit', (event) => { event.preventDefault(); clearTimeout(debounceTimer); search(); });
$('q').addEventListener('input', () => {
  clearTimeout(debounceTimer);
  searchController?.abort();
  $('more').hidden = true;
  debounceTimer = setTimeout(() => search(), 350);
});
$('more').addEventListener('click', () => { clearTimeout(debounceTimer); search(true); });
$('play').addEventListener('click', () => {
  play({ retry: player.hasAttribute('src') });
  $('playback').scrollIntoView({ block: 'nearest' });
});
$('season').addEventListener('change', () => loadSeason());
$('episode').addEventListener('change', updateEpisodeSelection);
$('previous').addEventListener('click', () => moveEpisode(-1));
$('next').addEventListener('click', () => moveEpisode(1));
$('provider').addEventListener('change', () => chooseProvider($('provider').value));
$('safe-mode').addEventListener('change', () => {
  if (!activeSource) return;
  safeModes[activeSource.id] = $('safe-mode').checked;
  writeStorage('fotograma.safeModes', safeModes);
  play();
});
$('rotate-provider').addEventListener('click', () => {
  const visibleIds = [...$('provider').options].map((option) => option.value);
  const index = visibleIds.indexOf(activeSource?.id);
  const alternatives = [...visibleIds.slice(index + 1), ...visibleIds.slice(0, index)];
  const next = alternatives.find((id) => {
    const source = sources.find((entry) => entry.id === id);
    return (!source.requiresUnsandboxed || !usesSafeMode(id)) &&
      [Availability.AVAILABLE, Availability.UNKNOWN].includes(statusFor(id));
  });
  chooseProvider(next || alternatives[0]);
});
$('availability-report').addEventListener('change', () => {
  if (!activeSource) return;
  const key = playbackKey(playbackTarget, activeSource.id);
  const report = $('availability-report').value;
  if (report === Availability.ERROR) {
    sourceErrors.add(key);
    updateOptions();
    updateProviderStatus();
    return;
  }
  sourceErrors.delete(key);
  delete availability[key];
  if ([Availability.AVAILABLE, Availability.UNAVAILABLE].includes(report)) availability[key] = report;
  availability = Object.fromEntries(Object.entries(availability).slice(-500));
  writeStorage('fotograma.availability', availability);
  updateOptions();
  updateProviderStatus();
});
player.addEventListener('error', () => {
  if (!activeSource || !player.hasAttribute('src')) return;
  sourceErrors.add(playbackKey(playbackTarget, activeSource.id));
  updateOptions();
  updateProviderStatus();
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
  clearSources();
  $('playback').hidden = true;
  document.body.classList.remove('modal-open');
  const returnTarget = opener?.isConnected ? opener : [...$('history-results').children].find((node) => node.dataset.mediaKey === opener?.dataset.mediaKey) || $('q');
  returnTarget.focus();
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
