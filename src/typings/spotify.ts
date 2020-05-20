export interface ICurrentTrackResponse {
  actions: any;
  context: any;
  currently_playing_type: string;
  is_playing: boolean;
  item: ISpotifyTrack;
  progress_ms: number;
  timestamp: number;
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
  explicit_content: { filter_enabled: boolean; filter_locked: boolean; }
}

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

export enum ISpotifyRepeatModeState {
  track = "track",
  context = "context",
  off = "off",
}

export interface ISpotifyWebPlaybackState {
  context: {
    uri: string, // The URI of the context (can be null)
    metadata: Object,             // Additional metadata for the context (can be null)
  },
  disallows: {                // A simplified set of restriction controls for
    pausing: boolean,           // The current track. By default, these fields
    peeking_next: boolean,      // will either be set to false or undefined, which
    peeking_prev: boolean,      // indicates that the particular operation is
    resuming: boolean,          // allowed. When the field is set to `true`, this
    seeking: boolean,           // means that the operation is not permitted. For
    skipping_next: boolean,     // example, `skipping_next`, `skipping_prev` and
    skipping_prev: boolean      // `seeking` will be set to `true` when playing an
    // ad track.
  },
  paused: boolean,  // Whether the current track is paused.
  position: number,    // The position_ms of the current track.
  duration: number,
  repeat_mode: number, // The repeat mode. No repeat mode is 0,
  // once-repeat is 1 and full repeat is 2.
  shuffle: boolean, // True if shuffled, false otherwise.
  track_window: {
    current_track: ISpotifyWebPlaybackTrack,                              // The track currently on local playback
    previous_tracks: ISpotifyWebPlaybackTrack[], // Previously played tracks. Number can vary.
    next_tracks: ISpotifyWebPlaybackTrack[],      // Tracks queued next. Number can vary.
  },
}

export interface ISpotifyWebPlaybackTrack {
  uri: string, // Spotify URI
  id: string,                // Spotify ID from URI (can be null)
  type: string,             // Content type: can be "track", "episode" or "ad"
  media_type: string,       // Type of file: can be "audio" or "video"
  name: string,         // Name of content
  is_playable: boolean,         // Flag indicating whether it can be played
  album: {
    uri: string, // Spotify Album URI
    name: string,
    images: { url: string }[],
  },
  artists: { uri: string, name: string }[],
}

