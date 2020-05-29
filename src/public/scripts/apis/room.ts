import axios from "axios";
import { IRoom } from "../../../models/room";


async function joinRoom(roomId: string, token: string, userId: string, deviceId: string) {
  const body = { token, userId, deviceId, };
  const response = await axios.put<{ message: string, room: IRoom }>("/room/join", body, {
    params: { id: roomId, }
  });
  return response;
}

async function getRoom(roomId: string, userId: string) {
  const response = await axios.get<{ message: string, room: IRoom }>("/room", {
    params: { id: roomId, userId, }
  });
  return response;
}

async function checkRoom(roomId: string, userId: string) {
  const response = await axios.get<{ message: string, room: IRoom }>("/room/check", {
    params: { id: roomId, userId, }
  });
  return response;
}

async function refreshTokenInRoom(roomId: string, userId: string, token: string) {
  const body = { userId, token }
  const response = await axios.put<{ message: string, room: IRoom }>("/room/update-token", body, {
    params: { id: roomId }
  });
  return response;
}

async function goToTrack(roomId: string, userId: string, uri: string) {
  const body = { userId, uri }
  const response = await axios.put<{ message: string, room: IRoom }>("/room/go-to", body, {
    params: { id: roomId }
  });
  return response;
}

async function approveTrack(roomId: string, userId: string, uri: string) {
  const body = { userId, uri }
  const response = await axios.put<{ message: string, room: IRoom }>("/room/approve", body, {
    params: { id: roomId }
  });
  return response;
}

async function makeHost(roomId: string, hostId: string, userId: string) {
  const body = { userId, hostId }
  const response = await axios.put<{ message: string, room: IRoom }>("/room/make-host", body, {
    params: { id: roomId }
  });
  return response;
}

async function goToNextTrack(roomId: string, userId: string) {
  const response = await axios.get<{ message: string, room: IRoom }>("/room/next", {
    params: { id: roomId, userId }
  });
  return response;
}

async function removeTrack(roomId: string, userId: string, uri: string) {
  const response = await axios.delete<{ message: string, room: IRoom }>("/room/remove", {
    params: { id: roomId, userId, uri }
  });
  return response;
}

async function approveGuest(roomId: string, userId: string, guestId: string) {
  const response = await axios.get<{ message: string, room: IRoom }>("/room/approve-guest", {
    params: { id: roomId, userId, guestId }
  });
  return response;
}

async function playRoom(roomId: string, userId: string, deviceId: string) {
  const response = await axios.post<{ message: string, room: IRoom }>("/room/play", {}, {
    params: { id: roomId, userId, deviceId }
  });
  return response;
}

async function pauseRoom(roomId: string, userId: string, deviceId: string) {
  const response = await axios.post<{ message: string, room: IRoom }>("/room/pause", {}, {
    params: { id: roomId, userId, deviceId }
  });
  return response;
}


export default {
  joinRoom,
  getRoom,
  checkRoom,
  refreshTokenInRoom,
  goToTrack,
  approveTrack,
  goToNextTrack,
  removeTrack,
  approveGuest,
  playRoom,
  pauseRoom,
  makeHost,
}
