import { APP_NAME } from './config.js';
import { buildMovieURL, buildTVURL } from './providers.js';

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

document.title = `${APP_NAME} — Tu próxima gran historia`;
document.querySelectorAll('[data-app-name]').forEach((node) => { node.textContent = APP_NAME; });

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
  const key = $('apikey').value.trim();
  if (!key) throw new Error('Falta la API key de TMDB.');
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.search = new URLSearchParams({ api_key: key, language: 'es-ES', ...params });
  const response = await fetch(url, { signal });
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
  } catch (error) {
    if (!controller.signal.aborted) message('detail-status', error.message);
  }
}

function play() {
  if (!selected) return;
  $('now-playing').textContent = titleOf(selected);
  player.src = selected.media_type === 'tv' ? buildTVURL(selected.id, 1, 1) : buildMovieURL(selected.id);
  $('playback').hidden = false;
  $('playback').scrollIntoView({ block: 'nearest' });
}

$('search-form').addEventListener('submit', (event) => { event.preventDefault(); search(); });
$('more').addEventListener('click', () => search(true));
$('play').addEventListener('click', play);
$('close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  detailController?.abort();
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

search();
