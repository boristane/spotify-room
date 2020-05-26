import axios from "axios";

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

export default {
  getToken,
  refreshToken,
}
