import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { APP_NAME, TMDB_API_KEY } from '../js/config.js';
import { Availability, getSources, playbackKey, providers, selectSource } from '../js/providers.js';

assert.ok(APP_NAME.trim());
assert.ok(TMDB_API_KEY.trim());
assert.ok(providers.length > 1);
assert.ok(!providers.some(({ id }) => id === 'videasy'));
assert.equal(new Set(providers.map(({ id }) => id)).size, providers.length);
const pageOrigin = 'https://redkris0.github.io';
const movie = { id: 15856, media_type: 'movie' };
const episode = { id: 4087, media_type: 'tv', season: 2, episode: 3 };
const movieSources = getSources(movie, pageOrigin);
const episodeSources = getSources(episode, pageOrigin);
for (const source of [...movieSources, ...episodeSources]) {
  assert.ok(source.nombre.trim());
  assert.equal(new URL(source.url).protocol, 'https:');
}
const urls = (sources) => Object.fromEntries(sources.map(({ id, url }) => [id, url]));
assert.deepEqual(urls(movieSources), {
  'internet-archive': 'https://archive.org/embed/HouseOnHauntedHill1959',
  vidspark: 'https://vidspark.to/movie/15856',
  vidrift: 'https://embed.vidrift.net/embed/movie/15856',
  '2embed-cc': 'https://www.2embed.cc/embed/15856',
  'vidsrc-to': 'https://vidsrc.to/embed/movie/15856',
  autoembed: 'https://autoembed.me/movie/tmdb/15856',
});
assert.deepEqual(urls(episodeSources), {
  vidspark: 'https://vidspark.to/tv/4087/2/3',
  vidrift: 'https://embed.vidrift.net/embed/tv/4087/2/3?hide=next,episodes',
  '2embed-cc': 'https://www.2embed.cc/embedtv/4087&s=2&e=3',
  'vidsrc-to': 'https://vidsrc.to/embed/tv/4087/2/3',
  autoembed: 'https://autoembed.me/tv/tmdb/4087-2-3',
});
assert.equal(urls(getSources({ ...movie, id: 11377 }, pageOrigin))['internet-archive'], undefined);
assert.equal(urls(getSources({ ...movie, id: 20529 }, pageOrigin))['internet-archive'],
  'https://archive.org/embed/Sita_Sings_the_Blues');
assert.equal(urls(getSources({ ...movie, id: 34078 }, pageOrigin))['wikimedia-commons'],
  'https://commons.wikimedia.org/wiki/File:The_Screaming_Skull.webm?embedplayer=yes');
assert.match(urls(getSources({ ...movie, id: 10331 }, pageOrigin))['wikimedia-commons'], /Night_of_the_Living_Dead_\(1968\)\.webm/);
assert.equal(urls(getSources({ ...movie, id: 19185 }, pageOrigin))['wikimedia-commons'], undefined);
assert.equal(urls(getSources({ ...movie, id: 485620 }, pageOrigin))['wikimedia-commons'], undefined);
assert.equal(urls(getSources({ ...episode, season: 0 }, pageOrigin)).vidspark, 'https://vidspark.to/tv/4087/0/3');
assert.deepEqual(getSources({ ...episode, episode: 0 }, pageOrigin), []);
assert.deepEqual(getSources({ ...movie, id: -1 }, pageOrigin), []);

const valid = { id: 'test', movie: () => 'https://example.com/player' };
const registry = [
  { ...valid, id: 'disabled', enabled: false },
  { id: 'tv-only', tv: valid.movie },
  { ...valid, id: 'relative', movie: () => '/player' },
  { ...valid, id: 'http', movie: () => 'http://example.com/player' },
  { ...valid, id: 'same-origin', movie: () => pageOrigin + '/Verpelis/' },
  { ...valid, id: 'credentials', movie: () => 'https://user:pass@example.com/player' },
  { ...valid, id: 'placeholder', movie: () => 'https://provider.invalid/' },
  { ...valid, id: 'broken', movie: () => { throw new Error(); } },
  valid,
  { ...valid, id: 'duplicate-url' },
  { ...valid, movie: () => 'https://example.com/another' },
];
assert.deepEqual(getSources(movie, pageOrigin, registry).map(({ id }) => id), ['test']);

const saved = JSON.parse(JSON.stringify({
  [playbackKey(episode, '2embed-cc')]: Availability.AVAILABLE,
  [playbackKey(movie, 'vidspark')]: Availability.UNAVAILABLE,
}));
const states = (target) => (id) => saved[playbackKey(target, id)] || Availability.UNKNOWN;
const secure = () => true;
const insecure = () => false;
assert.equal(selectSource(episodeSources, '2embed-cc', states(episode), secure).id, 'vidspark');
assert.equal(selectSource(episodeSources, 'vidspark', states(episode), insecure).id, 'vidspark');
assert.equal(selectSource(episodeSources, 'videasy', states(episode), insecure).id, '2embed-cc');
assert.equal(selectSource(movieSources, 'vidspark', states(movie), secure).id, 'internet-archive');
assert.equal(states({ ...episode, episode: 4 })('2embed-cc'), Availability.UNKNOWN);
assert.equal(states({ ...episode, season: 3 })('2embed-cc'), Availability.UNKNOWN);
assert.equal(selectSource(episodeSources, 'vidspark',
  (id) => id === 'vidspark' ? Availability.ERROR : Availability.UNKNOWN, insecure).id, 'vidrift');
assert.deepEqual(Object.values(Availability).sort(), ['AVAILABLE', 'ERROR', 'UNAVAILABLE', 'UNKNOWN']);

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
assert.doesNotMatch(html, /id=["']apikey["']/);
assert.ok(!html.includes(TMDB_API_KEY));
assert.doesNotMatch(app, /innerHTML|outerHTML|insertAdjacentHTML/);
assert.match(html, /sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"/);
assert.doesNotMatch(html, /allow-popups|allow-top-navigation/);
assert.match(html, /allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"/);
assert.match(html, /referrerpolicy="strict-origin-when-cross-origin"/);
assert.match(html, /id="safe-mode"[^>]*checked/);
assert.match(app, /AbortSignal\.timeout\(12000\)/);
assert.match(app, /La API key de TMDB no es válida, revisa js\/config\.js/);

assert.match(html, /import\('\.\/js\/app\.js'\)/);
assert.match(html, /location\.protocol === 'file:'/);
assert.equal((html.match(/<iframe\b/g) || []).length, 1);
assert.match(app, /writeStorage\('fotograma\.provider', id\)/);
assert.match(app, /readStorage\('fotograma\.provider', null\)/);
assert.match(app, /writeStorage\('fotograma\.availability', availability\)/);
assert.doesNotMatch(app, /player\.addEventListener\('load'/);
assert.match(app, /dialog\.addEventListener\('close',[\s\S]*?clearSources\(\)/);

console.log('Comprobaciones de configuración, selección, disponibilidad y seguridad superadas.');

const { parseSubtitles, readSubtitleFile, subtitleQuery, vidRiftPosition, vidSparkPosition } = await import('../js/subtitles.js');
const srt = '\uFEFF1\r\n00:00:01,500 --> 00:00:03,250\r\n<i>Hola</i>\r\nMundo\r\n\r\n2\r\n00:00:05,000 --> 00:00:04,000\r\nInválido';
assert.deepEqual(parseSubtitles(srt), [{ start: 1.5, end: 3.25, caption: 'Hola\nMundo' }]);
assert.deepEqual(parseSubtitles('WEBVTT\n\nNOTE comentario\n\n00:05.000 --> 00:06.000 align:center\nHola'),
  [{ start: 5, end: 6, caption: 'Hola' }]);
await assert.rejects(readSubtitleFile(new Blob(['archivo incorrecto'])), /SRT o WebVTT/);
assert.equal(subtitleQuery(movie, 'es').get('tmdb_id'), '15856');
assert.equal(subtitleQuery(episode, 'ea').get('parent_tmdb_id'), '4087');
assert.equal(subtitleQuery(episode, 'ea').get('season_number'), '2');
assert.equal(subtitleQuery(episode, 'ea').get('episode_number'), '3');
const frame = {};
const data = { source: 'vidspark-player', event: 'timeupdate', currentTime: 60 };
assert.equal(vidSparkPosition({ source: frame, origin: 'https://vidspark.to', data }, frame), data);
assert.equal(vidSparkPosition({ source: {}, origin: 'https://vidspark.to', data }, frame), null);
assert.equal(vidSparkPosition({ source: frame, origin: 'https://example.com', data }, frame), null);
console.log('Comprobaciones de subtítulos y mensajes del reproductor superadas.');

const riftEvent = { source: frame, origin: 'https://embed.vidrift.net',
  data: { type: 'vidrift:paused', tmdbId: '4087', mediaType: 'tv', season: 2, episode: 3, currentTime: 42 } };
assert.deepEqual(vidRiftPosition(riftEvent, frame, episode), { currentTime: 42, running: false });
assert.equal(vidRiftPosition(riftEvent, frame, { ...episode, episode: 4 }), null);
