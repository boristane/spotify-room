import { ISpotifyTrack } from "../typings/spotify";
import { IArtistListDataItem, INode } from "../typings/front";
import { getConnections } from "../services/spotify";

export function getScore(connections, genreClusters, tracksAgesClusters, topArtists) {
  const numLoneNodes = connections.nodes.filter(node => node.numLinks === 0).length;
  const meanConnections = average(connections.nodes.map(node => node.numLinks));
  const numGenres = genreClusters.length;
  const numGenresWithCountOne = genreClusters.filter(genre => genre.count === 1).length;
  const maxNumSongsPerYear = Math.max(...tracksAgesClusters.map(cluster => cluster.tracks.length));
  const meanPopularity = average(topArtists.map(artist => artist.popularity));
  const score =
    (100 * (numLoneNodes + numGenres + numGenresWithCountOne)) /
    (maxNumSongsPerYear + meanPopularity + meanConnections);
  return score;
}

function average(arr: number[]) {
  return arr.reduce((p, c) => p + c, 0) / arr.length;
}

export function getExplicit(tracks: any[]): { explicit: number; total: number } {
  const total = tracks.length;
  const explicit = tracks.filter(track => track.explicit).length;
  return { explicit, total };
}

export function clusterTracksAges(tracks: ISpotifyTrack[]): { year: number; tracks: ISpotifyTrack[] }[] {
  const result: { year: number; tracks: ISpotifyTrack[] }[] = [];
  tracks.forEach(track => {
    const year = Number(track.album.release_date.split("-")[0]);
    const currentYearObject = result.find(o => o.year === year);
    if (!currentYearObject) {
      result.push({
        year,
        tracks: [track]
      });
    } else {
      currentYearObject.tracks.push(track);
    }
  });
  return result;
}

export function clusterGenres(
  artists: IArtistListDataItem[]
): { genre: string; count: number; artists: IArtistListDataItem[] }[] {
  const cluster: { genre: string; count: number; artists: IArtistListDataItem[] }[] = [];
  artists.forEach(artist => {
    const genres = artist.genres;
    genres.forEach(genre => {
      const g = cluster.find(c => c.genre === genre);
      if (g === undefined) {
        cluster.push({
          genre,
          count: 1,
          artists: [artist]
        });
      } else {
        g.count += 1;
        g.artists.push(artist);
      }
    });
  });
  return cluster;
}

export function getPeriod(term) {
  if (term === "medium_term") return "~6 Months";
  if (term === "short_term") return "~1 month";
  if (term === "long_term") return "All time";
}

export async function findConnections(
  token: string,
  artists: IArtistListDataItem[]
): Promise<{ links: { source: string; target: string }[]; nodes: any }> {
  const nodes: INode[] = [];
  const links: { source: string; target: string }[] = [];
  const artistsIDs = artists.map(artist => artist.id);
  const promises = artists.map(artist => getConnections(token, artist));
  const resolves = await Promise.all(promises);
  resolves.forEach(resolve => {
    nodes.push({
      id: resolve.artist.name,
      image: resolve.artist.image,
      i: resolve.artist.id,
      group: resolve.artist.genres[0],
      track: resolve.artist.track,
      rank: resolve.artist.rank,
      numLinks: 0
    });
  });
  resolves.forEach((resolve, i) => {
    const relatedArtists = resolve.connections;
    const relatedArtistsIDs = relatedArtists.map(artist => artist.id);
    const commonIDs = artistsIDs.filter(value => relatedArtistsIDs.includes(value));
    if (commonIDs.length > 0) {
      const commonArtists = commonIDs.map(id => artists.find(artist => artist.id === id));
      commonArtists.forEach(commonArtist => {
        const commonArtistName = commonArtist ? commonArtist.name : "";
        links.push({ source: resolve.artist.name, target: commonArtistName });
        const temp = nodes.find(artist => artist.id === commonArtistName);
        if (temp !== undefined) {
          temp.numLinks += 1;
        }
      });
    }
    nodes[i].numLinks += commonIDs.length;
  });
  return { links, nodes };
}