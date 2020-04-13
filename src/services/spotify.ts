import axios from "axios";
import { promisify } from "util";
import { ISpotifyUser, ISpotifyArtist, ISpotifyTrack, ISpotifyRepeatModeState, ICurrentTrackResponse } from "../typings/spotify";
import { IArtistListDataItem } from "../typings/front";

const sleep = promisify(setTimeout);
const axiosInstance = axios.create({ baseURL: "https://api.spotify.com/v1" });


export async function getCurrentlyPalyingTrack(token: string): Promise<ICurrentTrackResponse> {
  const response = await axiosInstance.get("/me/player/currently-playing", {
    headers: getHeader(token),
  });
  return response.data;
}

export async function skipToNextTrack(token: string) {
  const response = await axiosInstance.post("/me/player/next", {}, {
    headers: getHeader(token),
  });
  return response.data;
}

export async function skipToPreviousTrack(token: string) {
  const response = await axiosInstance.post("/me/player/previous", {}, {
    headers: getHeader(token),
  });
  return response.data;
}

export async function setRepeatMode(token: string, state: ISpotifyRepeatModeState) {
  const response = await axiosInstance.put(`/me/player/repeat?state=${state}`, {}, {
    headers: getHeader(token),
  });
  return response.data;
}

export async function play(token: string, uri: string, progression: number, deviceId: string) {
  const uris = [uri];
  const response = await axiosInstance.put(`/me/player/play/?device_id=${deviceId}`, { uris, "position_ms": progression }, {
    headers: getHeader(token),
  });
  return response.data;
}

export async function pause(token: string, deviceId: string) {
  const response = await axiosInstance.put(`/me/player/pause/?device_id=${deviceId}`, {}, {
    headers: getHeader(token),
  });
  return response.data;
}

export async function search(token: string, query: string): Promise<{ tracks: {href: string; items: ISpotifyTrack[]} }> {
  const response = await axiosInstance.get(`search/?q=${query}&type=track&market=from_token&limit=10`, {
    headers: getHeader(token),
  });
  return response.data;
}

export async function addTrackToPlaybackQueue(token: string, uri: string) {
  const response = await axiosInstance.post(`/me/player/queue?uri=${uri}`, {}, {
    headers: getHeader(token),
  });
  return response.data;
}

export async function seek(token: string, time: number) {
  const response = await axiosInstance.put(`/me/player/seek?position_ms=${time}`, {}, {
    headers: getHeader(token),
  });
  return response.data;
}

function getHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function getTopArtists(
  token: string,
  country: string,
  term: string
): Promise<IArtistListDataItem[]> {
  const response = await axiosInstance.get(`/me/top/artists/?time_range=${term}&limit=50`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const artists: ISpotifyArtist[] = response.data.items;
  const artistsTopTracks: { artistID: string; track: ISpotifyTrack }[] = [];
  for (let i = 0; i < artists.length; i += 1) {
    const artistTopTracks = (await getArtistTopTracks(token, artists[i].id, country)).tracks;
    const track = artistTopTracks[Math.floor(Math.random() * artistTopTracks.length)];
    artistsTopTracks.push({ artistID: artists[i].id, track });
  }
  const topArtists: IArtistListDataItem[] = artists.map((artist, index) => {
    const artistsTopTrack = artistsTopTracks.find(a => a.artistID === artist.id);
    const track = artistsTopTrack ? artistsTopTrack.track : undefined;
    return {
      name: artist.name,
      rank: index + 1,
      image: artist.images[0].url,
      id: artist.id,
      track,
      popularity: artist.popularity,
      genres: artist.genres
    };
  });
  return topArtists;
}

async function getArtistTopTracks(
  token: string,
  artistID: string,
  country: string
): Promise<{ tracks: ISpotifyTrack[] }> {
  const response = await axiosInstance.get(`/artists/${artistID}/top-tracks?country=${country}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}

export async function getTopTracks(token: string, term: string): Promise<{ items: ISpotifyTrack[] }> {
  const response = await axiosInstance.get(`/me/top/tracks/?time_range=${term}&limit=50`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}

export async function getConnections(
  token: string,
  artist: IArtistListDataItem
): Promise<{ artist: IArtistListDataItem; connections: ISpotifyArtist[] }> {
  const response = await axiosInstance.get(`/artists/${artist.id}/related-artists`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return { artist, connections: response.data.artists };
}

export async function createPlaylist(token: string, userId: string): Promise<string> {
  const response = await axiosInstance.post(
    `/users/${userId}/playlists`,
    {
      name: "eclectix",
      public: true,
      description: `Your music taste, your favourite songs, created on ${new Date().toDateString()}`
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data.id;
}

export async function addTracksToPlaylist(token: string, playlistId: string, trackUris: string[]) {
  const response = await axiosInstance.post(
    `/playlists/${playlistId}/tracks`,
    {
      uris: trackUris
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data.snapshot_id;
}

export async function getUserProfile(token: string): Promise<ISpotifyUser> {
  const response = await axiosInstance.get(`/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
}