import logger from "logger";
import { NextFunction, Response, Request } from "express";
import { getUser, spawnRoom, getRoom, addRoomMember, setRoomCurrentTrack } from "../services/database";
import { skipToNextTrack, skipToPreviousTrack, play, getCurrentlyPalyingTrack, addTrackToPlaybackQueue } from "../services/spotify";

export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { token, userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await addRoomMember(room, user, token);
    logger.info("User joined a room", { id, token, userId });
    res.status(200).json({ message: "All good" });
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
    const { userId, token } = req.query;
    const user = await getUser(userId);
    if (!user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const room = await spawnRoom(user, token);
    const id = room._id.toString();
    res.cookie("rooom_id", id);
    const response = {
      message: "Room succesfully created",
      id,
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

export async function skipNextTrack(req: Request, res: Response, next: NextFunction) {
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
    if (room.master.id !== userId) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    const tokens = [room.master.token, ...room.members.map((m) => m.token)];
    tokens.forEach((token) => {
      skipToNextTrack(token);
    });
    const response = { message: "Skipped to next track" };
    res.locals.body = response;
    res.status(200).json(response);
  } catch (error) {
    const message = "There was a problem skipping a track in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function skipPreviousTrack(req: Request, res: Response, next: NextFunction) {
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
    if (room.master.id !== userId) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    const tokens = [room.master.token, ...room.members.map((m) => m.token)];
    tokens.forEach((token) => {
      skipToPreviousTrack(token);
    });
    const response = { message: "Skipped to previous track" };
    res.locals.body = response;
    res.status(200).json(response);
  } catch (error) {
    const message = "There was a problem skipping a track in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function playRoom(req: Request, res: Response, next: NextFunction) {
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
    const networkDelay = 1000;

    if (room.master.id === userId) {
      const masterToken = room.master.token;
      const currentTrack = await getCurrentlyPalyingTrack(masterToken);
      await setRoomCurrentTrack(room, currentTrack.item.uri);
      room.members.map((m) => m.token).forEach((token) => {
        play(token, currentTrack.item.uri, currentTrack.progress_ms + networkDelay);
      });
      const response = { message: "Playing the track for all room members" };
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
    await play(roomMember.token, currentTrack.item.uri, currentTrack.progress_ms + networkDelay);
    const roomCurrentTrackIndex =  room.tracks.findIndex((t) => t.uri === currentTrack.item.uri);
    for(let i = 0; i < room.tracks.length; i +=1) {
      const track = room.tracks[i];
      await addTrackToPlaybackQueue(roomMember.token, track.uri);
    }

    const response = { message: "Playing the track for room member" };
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