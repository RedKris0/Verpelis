export const providers = [
  {
    id: 'vidlink',
    nombre: 'VidLink',
    requiresUnsandboxed: true,
    subtitle: 'vtt',
    movie: (tmdbId) => `https://vidlink.pro/movie/${tmdbId}`,
    tv: (tmdbId, season, episode) => `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?nextbutton=false`,
  },
  {
    id: 'videasy-ws',
    nombre: 'Videasy (.ws)',
    requiresUnsandboxed: true,
    subtitle: 'language',
    movie: (tmdbId) => `https://player.videasy.ws/embed/movie/${tmdbId}`,
    tv: (tmdbId, season, episode) => `https://player.videasy.ws/embed/tv/${tmdbId}/${season}/${episode}?autonext=0`,
  },
  {
    id: 'videasy',
    nombre: 'Videasy clásico',
    movie: (tmdbId) => `https://player.videasy.net/movie/${tmdbId}?color=8B5CF6&overlay=true&playsinline=1`,
    tv: (tmdbId, season, episode) => `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}?color=8B5CF6&nextEpisode=false&autoplayNextEpisode=false&episodeSelector=false&overlay=true&playsinline=1`,
  },
  // AÑADIR PROVEEDORES AQUÍ
  // Sustituye los dominios .invalid por tus plantillas HTTPS reales y descomenta.
  // {
  //   id: 'ejemplo-1', nombre: 'Mi proveedor 1',
  //   movie: (tmdbId) => `https://proveedor-1.invalid/movie/${tmdbId}`,
  //   tv: (tmdbId, season, episode) => `https://proveedor-1.invalid/tv/${tmdbId}/${season}/${episode}`,
  // },
  // {
  //   id: 'ejemplo-2', nombre: 'Mi proveedor 2',
  //   movie: (tmdbId) => `https://proveedor-2.invalid/embed?tmdb=${tmdbId}`,
  //   tv: (tmdbId, season, episode) => `https://proveedor-2.invalid/embed?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
  // },
];

export function playbackUrl(provider, { id, media_type }, episode, subtitles) {
  const url = new URL(media_type === 'tv'
    ? provider.tv(id, episode.season_number, episode.episode_number)
    : provider.movie(id));
  if (provider.subtitle === 'language' && subtitles.language) url.searchParams.set('ds_lang', subtitles.language);
  if (provider.subtitle === 'vtt' && subtitles.vtt) {
    url.searchParams.set('sub_file', subtitles.vtt);
    url.searchParams.set('sub_label', 'Pista externa');
  }
  return url;
}

