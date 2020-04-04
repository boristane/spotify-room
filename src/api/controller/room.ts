import logger from "logger";
import { NextFunction, Response, Request } from "express";
import { getUser, spawnRoom, getRoom, addRoomMember, getTrack, addTrackToRoomInDb, getNextTrack } from "../services/database";
import { play, getCurrentlyPalyingTrack } from "../services/spotify";
import * as _ from "lodash";
import { IRoom } from "../models/room";

export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { token, userId, deviceId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await addRoomMember(room, user, token, deviceId);
    logger.info("User joined a room", { id, token, userId });
    res.status(200).json({
      message: "All good", room: {
        master: _.omit(room.master, ["token"]),
        members: room.members.map((m) => _.omit(m, ["token"])),
        tracks: room.tracks,
      }
    });
    return next();
  } catch (error) {
    const message = "There was a problem joining a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, token, deviceId } = req.query;
    const user = await getUser(userId);
    if (!user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const room = await spawnRoom(user, token, deviceId);
    const id = room._id.toString();
    res.cookie("rooom_id", id);
    const response = {
      message: "Room succesfully created",
      room: {
        master: _.omit(room.master, ["token"]),
        members: room.members.map((m) => _.omit(m, ["token"])),
        tracks: room.tracks,
      }
    };
    res.locals.body = response;
    res.status(201).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem creating a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function goToNextTrack(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    let roomMember;
    const isMaster = room.master.id === userId
    if (isMaster ) roomMember = room.master;
    else roomMember = room.members.find(m => m.id === userId);
    if(!roomMember) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    const currentTrack = await getNextTrack(room, isMaster);
    if(!currentTrack) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await play(roomMember.token, currentTrack.uri, 0, roomMember.deviceId);
    const response = {
      message: "Went to next track", room: prepareRoomForResponse(room),
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem going to next track in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function masterGoToTrack(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { userId, uri } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    if (room.master.id !== userId) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    const currentTrack = await getTrack(room, uri, true);
    play(room.master.token, currentTrack.uri, 0, room.master.deviceId);
      for (let i = 0; i < room.members.length; i += 1) {
        const member = room.members[i];
        try {
          await play(member.token, currentTrack.uri, 0, member.deviceId);
        } catch (error) {
          logger.error("There was an error playing the track for a uuser", { error, member });
          continue;
        }
      }
    const response = {
      message: "Skipped to next track", room: prepareRoomForResponse(room),
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem skipping a track in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function getRooom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const response = {
      message: "Got the room track",
      room: {
        master: _.omit(room.master, ["token"]),
        members: room.members.map((m) => _.omit(m, ["token"])),
        tracks: room.tracks,
      }
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem getting in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function playRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { userId, deviceId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const networkDelay = 1000;
    if (room.master.id === userId) {
      let uri: string;
      let progress: number;
      const masterToken = room.master.token;
      const roomCurrentTrack = room.tracks.find((t) => t.current);
      if (roomCurrentTrack) {
        uri = roomCurrentTrack.uri;
        progress = 0;
      } else {
        const response = { message: "Not found" };
        res.locals.body = response;
        res.status(404).json(response);
        return next();
      }
      play(masterToken, uri, progress, deviceId);
      for (let i = 0; i < room.members.length; i += 1) {
        const member = room.members[i];
        try {
          await play(member.token, uri, progress, member.deviceId);
        } catch (error) {
          logger.error("There was an error playing the track for a uuser", { error, member });
          continue;
        }
      }
      const response = {
        message: "Playing the track for all room members", room: {
          master: _.omit(room.master, ["token"]),
          members: room.members.map((m) => _.omit(m, ["token"])),
          tracks: room.tracks,
        }
      };
      res.locals.body = response;
      res.status(200).json(response);
      return next();
    }

    const roomMember = room.members.find((m) => m.id === user.id);
    if (!roomMember) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const masterToken = room.master.token;
    const currentTrack = await getCurrentlyPalyingTrack(masterToken);
    if (currentTrack?.item?.uri !== room.tracks.find((t) => t.current).uri) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await play(roomMember.token, currentTrack.item.uri, currentTrack.progress_ms + networkDelay, roomMember.deviceId);

    const response = {
      message: "Playing the track for room member", room: prepareRoomForResponse(room)
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem playing a track in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function addTrackToRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { userId, uri, artist, name, image } = req.body;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const approved = room.master.id === userId;
    if (approved) {
      await addTrackToRoomInDb(room, uri, name, artist, image, approved);
      const response = { message: "Track added to room", room: prepareRoomForResponse(room) }
      res.locals.body = response;
      res.status(200).json(response);
      return next();
    }

    const roomMember = room.members.find((m) => m.id === user.id);
    if (!roomMember) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await addTrackToRoomInDb(room, uri, name, artist, image, approved);
    const response = { message: "Track added to room", room: prepareRoomForResponse(room) }
    res.locals.body = response;
    res.status(200).json(response);
    return next();

  } catch (error) {
    const message = "There was a problem adding a track in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export function prepareRoomForResponse(room: IRoom) {
  return {
    master: _.omit(room.master, ["token"]),
    members: room.members.map((m) => _.omit(m, ["token"])),
    tracks: room.tracks,
  }
}