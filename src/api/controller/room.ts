import logger from "logger";
import { NextFunction, Response, Request } from "express";
import { getUser, spawnRoom } from "../services/database";

export function joinRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { token, userId } = req.query;
  logger.info("User joined a room", { id, token, userId });
  res.status(200).json({ message: "All good" });
  return next();
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.query;
    const user = await getUser(userId);
    if (!user) {
      const response = { message: "User not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const room = await spawnRoom(user);
    const id = room._id;
    res.cookie("rooom_id", id);
    const response = {
      message: "Room succesfully created",
      id,
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem creating a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}