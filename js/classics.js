const archiveItems = new Map([
  [15856, 'HouseOnHauntedHill1959'],
  [20529, 'Sita_Sings_the_Blues'],
]);

export function archiveMovie(tmdbId) {
  const identifier = archiveItems.get(Number(tmdbId));
  return identifier ? `https://archive.org/embed/${identifier}` : null;
}

const commonsFiles = new Map([
  [34078, 'The_Screaming_Skull.webm'],
  [10331, 'Night_of_the_Living_Dead_(1968).webm'],
]);

export function commonsMovie(tmdbId) {
  const filename = commonsFiles.get(Number(tmdbId));
  return filename ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}?embedplayer=yes` : null;
}
