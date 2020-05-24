import axios, { AxiosResponse } from "axios";
import { IRoom } from "../../models/room";

async function joinRoom(roomId: string, token: string, userId: string, deviceId: string) {
  const body = {
    token,
    userId,
    deviceId,
  };
  const response = await axios.put<{ message: string, room: IRoom }>("/room/join", body,
    {
      params: {
        id: roomId,
      }
    });
  return response;
}

async function getToken(code: string, state: string) {
  const response = await axios.get<{ access_token: string, refresh_token: string }>("/spotify/get-token", {
    params: {
      code,
      state,
    }
  });
  return response;
}

async function refreshToken(refreshToken: string) {
  const response = await axios.get<{ access_token: string }>("/spotify/refresh-token", {
    params: {
      refresh_token: refreshToken,
    }
  });
  return response;
}

async function refreshTokenInRoom(roomId: string, userId: string, token: string) {
  const body = {
    userId,
    token
  }
  const response = await axios.put<{ message: string, room: IRoom }>("/room/update-token", body, {
    params: {
      id: roomId
    }
  });
  return response;
}

export default {
  joinRoom,
  getToken,
  refreshToken,
  refreshTokenInRoom,
}