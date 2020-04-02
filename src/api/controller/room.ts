import logger from "logger";
import { NextFunction, Response, Request } from "express";

export function joinRoom(req: Request, res: Response, next: NextFunction) {
  const {id} = req.params;
  const {token, userId} = req.query; 
  logger.info("User joined a room", {id, token, userId});
  res.status(200).json({message: "All good"});
  return next();
}