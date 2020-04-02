import logger from "logger";
import { NextFunction, Response, Request } from "express";
import { getUser, spawnRoom, getRoom, addRoomMember } from "../services/database";
import { skipToNextTrack } from "../services/spotify";

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

export async function skipTrack(req: Request, res: Response, next: NextFunction) {
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
    const response = { message: "Skipped songs" };
    res.locals.body = response;
    res.status(200).json(response);
  } catch (error) {
    const message = "There was a problem skipping a track in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}