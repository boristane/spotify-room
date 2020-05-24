import mongoose from "mongoose";
import { ISpotifyUser, ISpotifyTrack } from "../typings/spotify";
import User, { IUser } from "../models/user";
import Room, { IRoom } from "../models/room";
import { generateCoverUrl } from "./cover";
import logger from "logger";

export async function saveUser(spotifyUser: ISpotifyUser) {
  const user = await User.findOne({ id: spotifyUser.id });
  if (!user) {
    const user = new User({
      _id: mongoose.Types.ObjectId(),
      ...spotifyUser,
      isEmailSubscriber: true,
    });
    return await user.save();
  }
  let shouldSave = false;
  Object.keys(spotifyUser).forEach((key, i) => {
    if (key === "followers" || key === "images" || key === "external_urls" || key === "explicit_content") return;
    if (spotifyUser[key] !== user[key]) {
      user[key] = spotifyUser[key];
      shouldSave = true;
    }
  });
  if (!shouldSave) {
    return false;
  }
  await user.save();
  return true;
}

export async function updateUserEmailSubscription(user: IUser, value: boolean): Promise<boolean> {
  user.isEmailSubscriber = value;
  await user.save();
  return true;
}

export async function getUser(id: string): Promise<IUser> {
  return await User.findOne({ id });
}

export async function getRoom(id: string): Promise<IRoom> {
  return await Room.findOne({ _id: id });
}

export async function getRoomsByUser(id: string): Promise<IRoom[]> {
  return await Room.find().or([
    { guests: { $elemMatch: { id: id } }, isActive: true },
    { "host.id": id },
  ]);
}

export async function spawnRoom(name: string, host: IUser, token: string, deviceId: string): Promise<IRoom> {
  const cover = await generateCoverUrl();
  const room: IRoom = new Room({
    _id: mongoose.Types.ObjectId(),
    host: { id: host.id, token, name: host.display_name, deviceId },
    guests: [],
    songs: [],
    sessions: [{
      startDate: new Date(),
      endDate: undefined,
    }],
    name,
    cover,
    isActive: true,
  });

  return await room.save();
}

export async function updateTokenInRoom(room: IRoom, user: IUser, token: string) {
  const { guests, host } = room;
  if (host.id === user.id) {
    if (host.token === token) return;
    host.token = token;
    room.isActive = true;
    await room.save();
    return;
  }
  const guest = guests.find((m) => m.id === user.id);
  if (guest.token === token) return;
  guest.token = token;
  guest.isActive = true;
  await room.save();
  await room.save();
}

export async function addRoomMember(room: IRoom, user: IUser, token: string, deviceId: string): Promise<boolean> {
  let isNewUser = false;
  const { guests, host } = room;
  if (host.id === user.id) {
    if (host.token === token && host.deviceId === deviceId) return;
    host.deviceId = deviceId;
    host.token = token;
    room.isActive = true;
    const previousSession = room.sessions[room.sessions.length - 1];
    if(previousSession && !previousSession.endDate) {
      previousSession.endDate = new Date();
    }
    room.sessions.push({
      startDate: new Date(),
      endDate: undefined,
    });
    await room.save();
    return isNewUser;
  }
  const guest = guests.find((m) => m.id === user.id);
  if (guest) {
    const currentTrack = room.tracks.find(t => t.current);
    if (guest.token === token && guest.deviceId === deviceId && guest.currentTrack === currentTrack.uri) return;
    guest.token = token;
    guest.deviceId = deviceId;
    guest.currentTrack = currentTrack?.uri;
    guest.isActive = true;
    if(!guest.sessions) {
      guest.sessions = [];
    }
    const previousSession = guest.sessions[guest.sessions.length - 1];
    if(previousSession && !previousSession.endDate) {
      previousSession.endDate = new Date();
    }
    guest.sessions.push({
      startDate: new Date(),
      endDate: undefined,
    });
    await room.save();
    return isNewUser;
  }
  isNewUser = true;
  guests.push({
    id: user.id,
    token,
    name: user.display_name,
    deviceId,
    isActive: true,
    isApproved: true,
    currentTrack: "",
    isPlaying: false,
    createdAt: new Date(),
    sessions: [{
      startDate: new Date(),
      endDate: undefined,
    }],
  });
  await room.save();
  return isNewUser;
}

export async function removeRoomMember(room: IRoom, user: IUser): Promise<boolean> {
  const { guests, host } = room;
  if (host.id === user.id) {
    room.isActive = false;
    const session = room.sessions[room.sessions.length - 1];
    session.endDate = new Date();
    room.guests.forEach(g => {
      if(g.sessions.length >= 1) {
        const session = g.sessions[g.sessions.length - 1];
        session.endDate = new Date();
      }
    });
    await room.save();
    return true;
  }
  const guest = guests.find((m) => m.id === user.id);
  if (guest) {
    guest.isActive = false;
    guest.isPlaying = false;
    if(guest.sessions.length >= 1) {
      const session = guest.sessions[guest.sessions.length - 1];
      session.endDate = new Date();
    }
    await room.save();
    return true;
  }
  return false;
}

export async function addTrackToRoomInDb(room: IRoom, uri: string, name: string, artists: string[], image: string, approved: boolean, addedBy: string) {
  const { tracks } = room;
  const current = room.tracks.length === 0;
  tracks.push({
    uri: uri,
    name: name,
    artists: artists,
    image: image,
    completed: false,
    current: current,
    approved: approved,
    removed: false,
    addedBy,
  });
  return await room.save();
}

export async function setRoomCurrentTrack(room: IRoom, track: ISpotifyTrack) {
  const { tracks } = room;
  const trackIndex = tracks.findIndex((t) => t.uri === track.uri);
  if (trackIndex === -1) {
    tracks.forEach((t) => { t.completed = true; t.current = false; });
    tracks.push({
      uri: track.uri,
      name: track.name,
      artists: track.artists.map(a => a.name),
      image: track.album.images[0].url,
      completed: false,
      current: true,
      approved: true,
      removed: false,
      addedBy: room.host.name,
    });
    return await room.save();
  }
  tracks.forEach((t, i) => {
    if (i < trackIndex) {
      t.completed = true;
      t.current = false;
      return;
    }
    if (i === trackIndex) {
      t.completed = false;
      t.current = true;
      return;
    }
    t.completed = false;
    t.current = false;
  });
  return await room.save();
}

export async function getNextTrack(room: IRoom, userId: string, isHost: boolean): Promise<{
  uri: string;
  completed: boolean;
  approved: boolean;
  current: boolean;
  name: string; artists: string[]; image: string;
} | undefined> {
  const validTracks = room.tracks.filter((t, i) => t.approved && !t.removed && !t.completed);
  if (isHost) {
    const currentTrack = room.tracks.find(t => t.current);
    const index = validTracks.findIndex(t => t.current);
    currentTrack.completed = true;
    currentTrack.current = false;
    if (index >= validTracks.length - 1) {
      room.tracks.forEach(t => t.completed = false);
      room.tracks.filter((t, i) => t.approved && !t.removed)[0].current = true;
      await room.save();
      return room.tracks.filter((t, i) => t.approved && !t.removed)[0];
    }
    const newCurrentTrack = validTracks.find((t, i) => i > index);
    if (!newCurrentTrack) return;
    newCurrentTrack.current = true;
    newCurrentTrack.completed = false;
    await room.save();
    return newCurrentTrack;
  }
  const guest = room.guests.find(m => m.id === userId);
  if (!guest) return;
  const currentTrackUri = guest.currentTrack;
  const currentTrackIndex = validTracks.findIndex(t => t.uri === currentTrackUri);
  if (currentTrackIndex < 0) return;
  let nextTrack;
  if (currentTrackIndex >= validTracks.length - 1) {
    nextTrack = room.tracks.filter((t, i) => t.approved && !t.removed)[0];
  } else {
    nextTrack = validTracks.find((t, i) => i > currentTrackIndex);
  }
  if (!nextTrack) return;
  guest.currentTrack = nextTrack.uri;
  await room.save();
  return nextTrack;
}

export async function getTrack(room: IRoom, uri: string, shoudlSave: boolean): Promise<{
  uri: string;
  completed: boolean;
  approved: boolean;
  current: boolean;
  name: string; artists: string[]; image: string;
} | undefined> {
  const trackIndex = room.tracks.findIndex((track) => track.uri === uri && track.approved && !track.removed);
  if (trackIndex < 0) return undefined;
  room.tracks.forEach((track, i) => {
    track.completed = i < trackIndex;
    track.current = i === trackIndex;
  });
  const track = room.tracks[trackIndex];
  room.guests.forEach(m => m.currentTrack = track.uri);
  if (shoudlSave) {
    await room.save();
  }
  return room.tracks[trackIndex];
}

export function getUserCurrentTrack(room: IRoom, user: IUser): { uri: string, index: number } | undefined {
  const roomUser = room.guests.find((guest) => guest.id === user.id);
  if (!roomUser) return undefined;
  const uri = roomUser.currentTrack;
  const index = room.tracks.findIndex(t => t.uri === uri);
  return {
    uri, index
  }
}

export async function removeTrack(room: IRoom, uri: string): Promise<boolean> {
  const track = room.tracks.find(a => a.uri === uri);
  if (!track) return false;
  track.removed = true;
  await room.save();
  return true;
}

export async function approveTrack(room: IRoom, uri: string) {
  const track = room.tracks.find(track => track.uri === uri);
  if (!track) return;
  track.approved = true;
  await room.save();
}

export async function approveGuest(room: IRoom, guestId: string) {
  const guest = room.guests.find(guest => guest.id === guestId);
  if (!guest) return;
  guest.isApproved = true;
  guest.isActive = true;
  await room.save();
}

export async function setGuestCurrentTrack(room: IRoom, userId: string, uri: string) {
  const guest = room.guests.find(g => g.id === userId);
  if (!guest) return;
  guest.currentTrack = uri;
  await room.save();
}

export async function setGuestIsPlaying(room: IRoom, userId: string, isPlaying: boolean) {
  const guest = room.guests.find(g => g.id === userId);
  if (!guest) return;
  guest.isPlaying = isPlaying;
  await room.save();
}

