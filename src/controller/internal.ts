import logger from "logger";
import { NextFunction, Response, Request } from "express";
import * as _ from "lodash";
import Room from "../models/room";
import { getDate } from "../utils";
import User from "../models/user";

export async function getHosts(req: Request, res: Response, next: NextFunction) {
  const { from, to } = req.query;
  try {
    const { fromDate, toDate } = getDate(from, to);
    const rooms = await Room.find({ createdAt: { $gte: fromDate, $lte: toDate } });
    const allUsers = await User.find();
    const hostIds = rooms.map(r => {
      return {
        userId: r.host.id,
        roomId: r.id,
        roomName: r.name,
        guests: r.guests.map(g => g.id),
        numTracks: r.tracks.length,
        isActive: r.isActive,
      }
    });
    const hosts = [];
    hostIds.forEach((h, index) => {
      const existingHost = hosts.find(elt => elt.spotifyId === h.userId);
      if (!existingHost) {
        const u = allUsers.find(elt => elt.id === h.userId);
        return hosts.push({
          spotifyId: h.userId,
          id: u._id,
          name: u.display_name,
          isEmailSubscriber: u.isEmailSubscriber ? true : false,
          email: u.email,
          country: u.country,
          createdAt: u["createdAt"],
          updatedAt: u["updatedAt"],
          rooms: [h]
        });
      }
      existingHost.rooms.push(h);
    });
    res.status(200).json({
      message: "Hosts found",
      hosts,
      numRooms: rooms.length,
    });
    return next();
  } catch (error) {
    const message = "There was a problem getting the hosts"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}
