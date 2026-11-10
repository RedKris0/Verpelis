export function buildMovieURL(id){
  return `https://player.videasy.net/movie/${id}?color=8B5CF6&overlay=true&playsinline=1`;
}
export function buildTVURL(id, season, episode){
  return `https://player.videasy.net/tv/${id}/${season}/${episode}?color=8B5CF6&nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&playsinline=1`;
}

