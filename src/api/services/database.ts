import mongoose from "mongoose";
import { ISpotifyUser, ISpotifyTrack } from "../../typings/spotify";
import User, { IUser } from "../models/user";
import Room, { IRoom } from "../models/room";

export async function saveUser(spotifyUser: ISpotifyUser) {
  const user = await User.findOne({ id: spotifyUser.id });
  if (!user) {
    const user = new User({
      _id: mongoose.Types.ObjectId(),
      ...spotifyUser
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
    return;
  }
  await user.save();
}

export async function getUser(id: string): Promise<IUser> {
  return await User.findOne({ id });
}

export async function getRoom(id: string): Promise<IRoom> {
  return await Room.findOne({ _id: id });
}

export async function spawnRoom(master: IUser, token: string, deviceId: string): Promise<IRoom> {
  const room = new Room({
    _id: mongoose.Types.ObjectId(),
    master: { id: master.id, token, name: master.display_name, deviceId },
    members: [],
    songs: [],
  });

  return await room.save();
}

export async function addRoomMember(room: IRoom, user: IUser, token: string, deviceId: string): Promise<boolean> {
  let isNewUser = false;
  const { members, master } = room;
  if (master.id === user.id) {
    if (master.token === token) return;
    master.token = token;
    await room.save();
    return isNewUser;
  }
  const member = members.find((m) => m.id === user.id);
  if (member) {
    if (member.token === token) return;
    member.token = token;
    await room.save();
    return isNewUser;
  }
  isNewUser = true;
  members.push({ id: user.id, token, name: user.display_name, deviceId });
  await room.save();
  return isNewUser;
}

export async function setRoomCurrentTrack(room: IRoom, track: ISpotifyTrack) {
  const { tracks } = room;
  const trackIndex = tracks.findIndex((t) => t.uri === track.uri);
  if (trackIndex === -1) {
    tracks.forEach((t) => { t.completed = true; t.current = false; });
    tracks.push({
      uri: track.uri,
      name: track.name,
      artist: track.artists[0].name,
      image: track.album.images[0].url,
      completed: false,
      current: true,
      approved: true,
    });
    return await room.save();
  }
  tracks.forEach((t, i) => {
    if (i < trackIndex) {
      t.completed = true;
      t.current = false;
      return;
    }
    if(i === trackIndex) {
      t.completed = false;
      t.current = true;
      return;
    }
    t.completed = false;
    t.current = false;
  });
  return await room.save();
}