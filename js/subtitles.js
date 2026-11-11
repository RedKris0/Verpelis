import { OPENSUBTITLES_API_KEY } from './config.js';

const api = 'https://api.opensubtitles.com/api/v1';
const maxBytes = 2 * 1024 * 1024;

function timestamp(value) {
  const match = /^(?:(\d+):)?([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(value);
  if (!match) return NaN;
  return Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

export function parseSubtitles(text) {
  const cues = [];
  for (const block of text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/)) {
    const lines = block.trim().split('\n');
    if (/^(?:NOTE(?:\s|$)|STYLE$|REGION$|WEBVTT(?:\s|$))/.test(lines[0])) continue;
    const index = lines[0].includes('-->') ? 0 : 1;
    const timing = /^(\S+)\s+-->\s+(\S+)/.exec(lines[index]?.trim() || '');
    if (!timing) continue;
    const start = timestamp(timing[1]);
    const end = timestamp(timing[2]);
    const caption = lines.slice(index + 1).join('\n').replace(/<[^>]*>/g, '').trim();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start && caption) cues.push({ start, end, caption });
  }
  return cues.sort((a, b) => a.start - b.start);
}

export function subtitleQuery(target, language) {
  const params = new URLSearchParams({ languages: language, order_by: 'download_count', order_direction: 'desc', type: target.media_type === 'tv' ? 'episode' : 'movie' });
  if (target.media_type === 'tv') {
    params.set('parent_tmdb_id', target.id);
    params.set('season_number', target.season);
    params.set('episode_number', target.episode);
  } else params.set('tmdb_id', target.id);
  return params;
}

async function fetchSubtitleResource(url, endpoint, signal, options) {
  const timeout = AbortSignal.timeout(12000);
  try {
    return await fetch(url, {
      ...options, credentials: 'omit', signal: AbortSignal.any([signal, timeout]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    if (timeout.aborted) throw new Error(`${endpoint}: se agotó el tiempo de espera.`);
    throw new Error(`${endpoint}: el navegador bloqueó la solicitud o falló la conexión (posible CORS).`);
  }
}

async function openSubtitles(path, token, signal, body) {
  const method = body ? 'POST' : 'GET';
  const endpoint = `${method} ${api}${path.split('?')[0]}`;
  const key = OPENSUBTITLES_API_KEY.trim();
  if (!key) throw new Error('Falta configurar la clave de OpenSubtitles en Fotograma.');
  const headers = { 'Api-Key': key, 'X-User-Agent': 'Fotograma v1', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetchSubtitleResource(api + path, endpoint, signal, {
    method, headers, body: body && JSON.stringify(body), redirect: 'error',
  });
  if (response.status === 401 || response.status === 403) {
    const detail = token
      ? 'Revisa el token de cuenta y la clave de la aplicación.'
      : 'Revisa la clave de la aplicación. Si se requiere acceso de cuenta, introduce tu token.';
    throw new Error(`${endpoint}: acceso rechazado (HTTP ${response.status}). ${detail}`);
  }
  if (response.status === 406 || response.status === 429) {
    const detail = token ? 'Revisa la cuota de tu cuenta o vuelve a intentarlo más tarde.'
      : 'Si agotaste las 5 descargas anónimas por IP en 24 horas, introduce tu token de cuenta o espera a que se renueve la cuota.';
    throw new Error(`${endpoint}: solicitud limitada (HTTP ${response.status}). ${detail}`);
  }
  if (!response.ok) throw new Error(`${endpoint}: error HTTP ${response.status}.`);
  return response.json();
}

export async function searchSubtitles(target, language, token, signal) {
  const payload = await openSubtitles(`/subtitles?${subtitleQuery(target, language)}`, token, signal);
  if (!Array.isArray(payload.data)) throw new Error('OpenSubtitles devolvió un catálogo inesperado.');
  return payload.data.flatMap(({ attributes }) => Array.isArray(attributes?.files)
    ? attributes.files.map((file) => ({
      id: file?.file_id,
      name: file?.file_name || attributes.release || 'Subtítulo',
    })) : []).filter(({ id }) => Number.isSafeInteger(id) && id > 0).slice(0, 30);
}

export async function subtitleDownload(id, token, signal) {
  const payload = await openSubtitles('/download', token, signal, { file_id: id });
  const url = URL.parse(payload.link);
  if (!url || url.protocol !== 'https:' || !['www.opensubtitles.com', 'opensubtitles.com'].includes(url.hostname) ||
      url.username || url.password || !url.pathname.startsWith('/download/')) {
    throw new Error('POST https://api.opensubtitles.com/api/v1/download: enlace de archivo inesperado.');
  }
  return { url: url.href, remaining: payload.remaining };
}

export async function fetchSubtitleFile(url, signal) {
  // El enlace contiene una firma temporal. El diagnóstico muestra la ruta pública.
  const endpoint = `GET ${new URL(url).origin}/download/… (archivo)`;
  const response = await fetchSubtitleResource(url, endpoint, signal, { referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`${endpoint}: error HTTP ${response.status}.`);
  return readSubtitleFile(await response.blob());
}

export async function readSubtitleFile(file) {
  if (file.size > maxBytes) throw new Error('El archivo de subtítulos supera 2 MB.');
  const bytes = await file.arrayBuffer();
  let text;
  const [first, second] = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 2));
  if (first === 0xff && second === 0xfe) text = new TextDecoder('utf-16le').decode(bytes);
  else if (first === 0xfe && second === 0xff) text = new TextDecoder('utf-16be').decode(bytes);
  else {
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { text = new TextDecoder('windows-1252').decode(bytes); }
  }
  const cues = parseSubtitles(text);
  if (!cues.length) throw new Error('El archivo no contiene subtítulos SRT o WebVTT válidos.');
  return cues;
}

export function vidSparkPosition(event, frame) {
  if (event.source !== frame || !['https://vidspark.to', 'https://cdn.vidspark.to'].includes(event.origin)) return null;
  const data = event.data;
  if (data?.source !== 'vidspark-player' || !['play', 'pause', 'ended', 'seeked', 'timeupdate', 'playerstatus'].includes(data.event) ||
      !Number.isFinite(data.currentTime) || data.currentTime < 0) return null;
  return data;
}

export const vidRiftOrigin = 'https://embed.vidrift.net';

export function vidRiftPosition(event, frame, target) {
  if (event.source !== frame || event.origin !== vidRiftOrigin) return null;
  const data = event.data;
  if (Number(data?.tmdbId) !== target.id || data.mediaType !== target.media_type ||
      (target.media_type === 'tv' && (Number(data.season) !== target.season || Number(data.episode) !== target.episode))) return null;
  if (!['vidrift:state', 'vidrift:progress', 'vidrift:unpaused', 'vidrift:paused'].includes(data.type) ||
      !Number.isFinite(data.currentTime) || data.currentTime < 0) return null;
  return { currentTime: data.currentTime, running: data.type !== 'vidrift:paused' && data.paused !== true };
}
