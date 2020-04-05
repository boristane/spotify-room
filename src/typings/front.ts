import { ISpotifyTrack, ISpotifyUser } from "./spotify";

export interface IServerResponse {
  genreClusters: { genre: string; count: number; artists: IArtistListDataItem[] }[];
  topArtists: IArtistListDataItem[];
  connections: { links: { source: string; target: string }[]; nodes: any };
  topTracks: ISpotifyTrack[];
  explicit: { explicit: number; total: number };
  user: ISpotifyUser;
  tracksAgesClusters: { year: number; tracks: ISpotifyTrack[] }[];
  period: string;
  score: number;
  eclectixPercentage: number;
}

export interface IMargin {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface IArtistsListProps {
  width: number;
  height: number;
  margin: IMargin;
  data: IArtistListDataItem[];
}

export interface IArtistListDataItem {
  name: string;
  rank: number;
  image: string;
  id: string;
  track: any;
  popularity: number;
  genres: string[];
}

export interface INode {
  id: string;
  image: string;
  i: string;
  group: string;
  track: any;
  rank: number;
  numLinks: number;
}