import { archiveMovie, commonsMovie } from './classics.js';

export const providers = [
  {
    id: 'internet-archive', nombre: 'Internet Archive', category: 'classic',
    movie: archiveMovie,
  },
  {
    id: 'wikimedia-commons', nombre: 'Wikimedia Commons', category: 'classic',
    movie: commonsMovie,
  },
  {
    id: 'vidspark', nombre: 'VidSpark', category: 'alternative',
    movie: (id) => `https://vidspark.to/movie/${id}`,
    tv: (id, season, episode) => `https://vidspark.to/tv/${id}/${season}/${episode}`,
  },
  {
    id: 'vidrift', nombre: 'VidRift', category: 'alternative', requiresUnsandboxed: true,
    movie: (id) => `https://embed.vidrift.net/embed/movie/${id}`,
    tv: (id, season, episode) => `https://embed.vidrift.net/embed/tv/${id}/${season}/${episode}?hide=next,episodes`,
  },
  {
    id: '2embed-cc', nombre: '2Embed.cc', category: 'primary', requiresUnsandboxed: true,
    movie: (id) => `https://www.2embed.cc/embed/${id}`,
    tv: (id, season, episode) => `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
  },
  {
    id: 'vidsrc-to', nombre: 'VidSrc.to', category: 'primary', requiresUnsandboxed: true,
    movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tv: (id, season, episode) => `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`,
  },
  {
    id: 'autoembed', nombre: 'AutoEmbed', category: 'alternative', requiresUnsandboxed: true,
    movie: (id) => `https://autoembed.me/movie/tmdb/${id}`,
    tv: (id, season, episode) => `https://autoembed.me/tv/tmdb/${id}-${season}-${episode}`,
  },
];

export const Availability = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
  ERROR: 'ERROR',
});

export function playbackKey({ media_type, id, season, episode }, providerId) {
  return media_type === 'tv' ? `tv:${id}:${season}:${episode}:${providerId}` : `movie:${id}:${providerId}`;
}

export function getSources({ media_type, id, season, episode }, pageOrigin, registry = providers) {
  if (!['movie', 'tv'].includes(media_type) || !Number.isSafeInteger(id) || id < 1) return [];
  if (media_type === 'tv' && (!Number.isSafeInteger(season) || season < 0 ||
      !Number.isSafeInteger(episode) || episode < 1)) return [];

  const ids = new Set();
  const urls = new Set();
  const sources = [];
  for (const provider of registry) {
    if (provider.enabled === false || ids.has(provider.id)) continue;
    try {
      const value = media_type === 'tv' ? provider.tv?.(id, season, episode) : provider.movie?.(id);
      if (typeof value !== 'string') continue;
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.origin === pageOrigin || url.username || url.password ||
          url.hostname.endsWith('.invalid') || urls.has(url.href)) continue;
      ids.add(provider.id);
      urls.add(url.href);
      sources.push({ ...provider, url: url.href });
    } catch {
      // A malformed template must not prevent other sources from being selected.
    }
  }
  return sources;
}

export function selectSource(sources, preferredId, statusFor, usesSafeMode) {
  const eligible = sources.filter((source) => !source.requiresUnsandboxed || !usesSafeMode(source.id));
  const preferred = eligible.find((source) => source.id === preferredId);
  if (preferred && [Availability.AVAILABLE, Availability.UNKNOWN].includes(statusFor(preferred.id))) return preferred;
  return eligible.find((source) => statusFor(source.id) === Availability.AVAILABLE)
    || eligible.find((source) => statusFor(source.id) === Availability.UNKNOWN)
    || eligible[0]
    || sources[0];
}
