import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { APP_NAME, TMDB_API_KEY } from '../js/config.js';
import { providers } from '../js/providers.js';

assert.ok(APP_NAME.trim());
assert.ok(TMDB_API_KEY.trim());
assert.equal(providers[0].id, 'videasy');
assert.equal(new Set(providers.map((provider) => provider.id)).size, providers.length);

for (const provider of providers) {
  assert.ok(provider.nombre.trim());
  const movie = new URL(provider.movie(550));
  const tv = new URL(provider.tv(1399, 2, 3));
  assert.equal(movie.protocol, 'https:');
  assert.equal(tv.protocol, 'https:');
}

const videasy = providers[0];
const tv = new URL(videasy.tv(1399, 2, 3));
assert.equal(tv.pathname, '/tv/1399/2/3');
assert.equal(new URL(videasy.movie(550)).pathname, '/movie/550');
for (const parameter of ['nextEpisode', 'autoplayNextEpisode', 'episodeSelector', 'overlay']) {
  assert.equal(tv.searchParams.get(parameter), 'true');
}
assert.equal(tv.searchParams.get('playsinline'), '1');
assert.equal(tv.searchParams.get('color'), '8B5CF6');

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

console.log('Comprobaciones de configuración, proveedores y seguridad superadas.');
