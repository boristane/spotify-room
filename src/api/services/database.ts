import mongoose from "mongoose";
import { ISpotifyUser } from "../../typings/spotify";
import User, { IUser } from "../models/user";
import Room, { IRoom }  from "../models/room";

export async function saveUser(spotifyUser: ISpotifyUser) {
  const user = await User.findOne({id: spotifyUser.id});
  if (!user) {
    const user = new User({
      _id: mongoose.Types.ObjectId(),
      ...spotifyUser
    });
    return await user.save();
  }
  let shouldSave = false;
  Object.keys(spotifyUser).forEach((key, i) => {
    if(key === "followers" || key === "images" || key === "external_urls" || key === "explicit_content") return;
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
  return await User.findOne({id});
}

export async function spawnRoom(master: IUser): Promise<IRoom> {
  const room = new Room({
    _id: mongoose.Types.ObjectId(),
    master: master.id,
    members: [],
    songs: [],
  });

  return await room.save();
}