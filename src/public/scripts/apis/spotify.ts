import axios from "axios";
import { ISpotifyTrack } from "../../../typings/spotify";

async function getToken(code: string, state: string) {
  const response = await axios.get<{ access_token: string, refresh_token: string }>("/spotify/get-token", {
    params: { code, state, }
  });
  return response;
}

async function refreshToken(refreshToken: string) {
  const response = await axios.get<{ access_token: string }>("/spotify/refresh-token", {
    params: { refresh_token: refreshToken }
  });
  return response;
}

async function searchForSongs(token: string, query: string, userId: string) {
  const response = await axios.get<{ tracks: { href: string; items: ISpotifyTrack[] }}>("/spotify/search", {
    params: { token, query, userId }
  });
  return response;
}

async function generatePlaylist(token: string, uris: string[], userId: string, name: string) {
  const response = await axios.post("/spotify/generate-playlist", { uris, userId, name }, {
    params: { token }
  });
  return response;
}

async function getPlaylists(token: string, userId: string, limit: number, page: number) {
  const response = await axios.get("/spotify/playlists", {
    params: { token, userId, page, limit }
  });
  return response;
}


export default {
  getToken,
  refreshToken,
  searchForSongs,
  generatePlaylist,
  getPlaylists,
}
