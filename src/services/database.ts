import mongoose from "mongoose";
import { ISpotifyUser, ISpotifyTrack } from "../typings/spotify";
import User, { IUser } from "../models/user";
import Room, { IRoom } from "../models/room";

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

export async function getUser(id: string): Promise<IUser> {
  return await User.findOne({ id });
}

export async function getRoom(id: string): Promise<IRoom> {
  return await Room.findOne({ _id: id });
}

export async function getRoomsByUser(id: string): Promise<IRoom[]> {
  return await Room.find().or([
    { members: { $elemMatch: { id: id } }, isActive: true },
    { "master.id": id },
  ]);
}

export async function spawnRoom(name: string, master: IUser, token: string, deviceId: string): Promise<IRoom> {
  const room = new Room({
    _id: mongoose.Types.ObjectId(),
    master: { id: master.id, token, name: master.display_name, deviceId },
    members: [],
    songs: [],
    name,
    isActive: true,
  });

  return await room.save();
}

export async function addRoomMember(room: IRoom, user: IUser, token: string, deviceId: string): Promise<boolean> {
  let isNewUser = false;
  const { members, master } = room;
  if (master.id === user.id) {
    if (master.token === token && master.deviceId === deviceId) return;
    master.deviceId = deviceId;
    master.token = token;
    room.isActive = true;
    await room.save();
    return isNewUser;
  }
  const member = members.find((m) => m.id === user.id);
  if (member) {
    const currentTrack = room.tracks.find(t => t.current);
    if (member.token === token && member.deviceId === deviceId && member.currentTrack === currentTrack.uri) return;
    member.token = token;
    member.deviceId = deviceId;
    member.currentTrack = currentTrack?.uri;
    member.isActive = true;
    await room.save();
    return isNewUser;
  }
  isNewUser = true;
  members.push({ id: user.id, token, name: user.display_name, deviceId, isActive: false, isApproved: false, currentTrack: "" });
  await room.save();
  return isNewUser;
}

export async function removeRoomMember(room: IRoom, user: IUser): Promise<boolean> {
  const { members, master } = room;
  if (master.id === user.id) {
    room.isActive = false;
    await room.save();
    return true;
  }
  const member = members.find((m) => m.id === user.id);
  if (member) {
    member.isActive = false;
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
      addedBy: room.master.name,
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

export async function getNextTrack(room: IRoom, userId: string, isMaster: boolean): Promise<{
  uri: string;
  completed: boolean;
  approved: boolean;
  current: boolean;
  name: string; artists: string[]; image: string;
} | undefined> {
  if (isMaster) {
    const currentTrack = room.tracks.find(t => t.current);
    const index = room.tracks.findIndex(t => t.current);
    currentTrack.completed = true;
    currentTrack.current = false;
    if (index >= room.tracks.length - 1) {
      await room.save();
      return;
    }
    const newCurrentTrack = room.tracks.find((t, i) => t.approved && !t.removed && !t.completed && i > index);
    if (!newCurrentTrack) return;
    newCurrentTrack.current = true;
    newCurrentTrack.completed = false;
    await room.save();
    return newCurrentTrack;
  }
  const member = room.members.find(m => m.id === userId);
  if (!member) return;
  const currentTrackUri = member.currentTrack;
  const currentTrackIndex = room.tracks.findIndex(t => t.uri === currentTrackUri);
  if (currentTrackIndex < 0) return;
  const nextTrack = room.tracks.find((t, i) => i > currentTrackIndex && t.approved && !t.removed && !t.completed);
  if (!nextTrack) return;
  member.currentTrack = nextTrack.uri;
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
  room.members.forEach(m => m.currentTrack = track.uri);
  if (shoudlSave) {
    await room.save();
  }
  return room.tracks[trackIndex];
}

export function getUserCurrentTrack(room: IRoom, user: IUser): {uri: string, index: number} | undefined {
  const roomUser = room.members.find((member) => member.id === user.id);
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

export async function approveMember(room: IRoom, memberId: string) {
  const member = room.members.find(member => member.id === memberId);
  if (!member) return;
  member.isApproved = true;
  member.isActive = true;
  await room.save();
}

export async function setMemberCurrentTrack(room: IRoom, userId: string, uri: string) {
  const member = room.members.find(m => m.id === userId);
  if (!member) return;
  member.currentTrack = uri;
  await room.save();
}