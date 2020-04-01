export interface ISpotifyArtist {
  external_urls: {
    [propName: string]: string;
  };
  followers: {
    href?: string;
    total: number;
  };
  genres: string[];
  href: string;
  id: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  name: string;
  popularity: number;
  type: string;
  uri: string;
}

export interface ISpotifyTrack {
  album: {
    album_type: string;
    artists: {
      external_urls: {
        [propName: string]: string;
      };
      href: string;
      id: string;
      name: string;
      type: string;
      uri: string;
    }[];
    available_markets: string[];

    external_urls: {
      [propName: string]: string;
    };
    href: string;
    id: string;
    images: {
      height: number;
      url: string;
      width: number;
    }[];
    name: string;
    release_date: string;
    release_date_precision: string;
    type: string;
    uri: string;
  };
  artists: {
    external_urls: {
      [propName: string]: string;
    };
    href: string;
    id: string;
    name: string;
    type: string;
    uri: string;
  }[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: {
    isrc?: string;
  };
  external_urls: {
    [propName: string]: string;
  };
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
}

export interface ISpotifyUser {
  birthdate: string;
  country: string;
  display_name: string;
  email: string;
  external_urls: { [propName: string]: string };
  followers: { href?: string; total: number };
  href: string;
  id: string;
  images: {
    height: number;
    url: string;
    width: number;
  }[];
  product: string;
  type: string;
  uri: string;
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
