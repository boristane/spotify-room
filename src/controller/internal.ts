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
    hosts.sort((a, b) => b.rooms.length - a.rooms.length);
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

export async function getGuests(req: Request, res: Response, next: NextFunction) {
  const { from, to } = req.query;
  try {
    const { fromDate, toDate } = getDate(from, to);
    const rooms = await Room.find({ createdAt: { $gte: fromDate, $lte: toDate } });
    const allUsers = await User.find();
    const guestIds = rooms.map(r => {
      return r.guests.map(g => {
        return {
          userId: g.id,
          hostId: r.host.id,
          roomId: r.id,
          roomName: r.name,
          numTracks: r.tracks.length,
          isActive: r.isActive,
        };
      });
    }).reduce((acc, val) => acc.concat(val), []);
    const guests = [];
    guestIds.forEach((h, index) => {
      const existingHost = guests.find(elt => elt.spotifyId === h.userId);
      if (!existingHost) {
        const u = allUsers.find(elt => elt.id === h.userId);
        return guests.push({
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
    guests.sort((a, b) => b.rooms.length - a.rooms.length);
    res.status(200).json({
      message: "Guests found",
      guests,
      numRooms: rooms.length,
    });
    return next();
  } catch (error) {
    const message = "There was a problem getting the guests"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}
