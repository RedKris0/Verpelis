export const providers = [
  {
    id: 'videasy',
    nombre: 'Videasy',
    movie: (tmdbId) => `https://player.videasy.net/movie/${tmdbId}?color=8B5CF6&overlay=true&playsinline=1`,
    tv: (tmdbId, season, episode) => `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}?color=8B5CF6&nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&playsinline=1`,
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

