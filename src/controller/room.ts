import logger from "logger";
import { NextFunction, Response, Request } from "express";
import { getUser, spawnRoom, getRoom, addRoomMember, getTrack, addTrackToRoomInDb, getNextTrack, approveTrack, setGuestCurrentTrack, approveGuest, removeRoomGuest, removeTrack, getRoomsByUser, getUserCurrentTrack } from "../services/database";
import { play, getCurrentlyPalyingTrack, pause } from "../services/spotify";
import * as _ from "lodash";
import { IRoom } from "../models/room";
import { sendEmail, emailType } from "../services/emails";
import { validateEmail } from "../utils";

export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  const { id, token, userId, deviceId } = req.query;
  try {
    if (!id || !userId) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
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
      message: "All good", room: prepareRoomForResponse(room),
    });
    return next();
  } catch (error) {
    const message = "There was a problem joining a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function leaveRoom(req: Request, res: Response, next: NextFunction) {
  const { id, userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await removeRoomGuest(room, user);
    logger.info("User left a room", { id, userId });
    res.clearCookie("rooom_id");
    res.status(200).json({
      message: "All good",
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
    const { userId, token, deviceId, name } = req.body;
    const user = await getUser(userId);
    if (!user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const room = await spawnRoom(name, user, token, deviceId);
    const id = room._id.toString();
    res.cookie("rooom_id", id);
    if (user.isEmailSubscriber) {
      sendEmail({
        email: user.email,
        name: user.display_name,
        roomName: room.name,
        roomId: room.id,
      }, emailType.createRoom);
    }
    const response = {
      message: "Room succesfully created",
      room: prepareRoomForResponse(room),
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
  const { id, userId } = req.query;
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
    const isHost = room.host.id === userId
    if (isHost) roomMember = room.host;
    else roomMember = room.guests.find(m => m.id === userId);
    if (!roomMember) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    const currentTrack = await getNextTrack(room, roomMember.id, isHost);
    if (!currentTrack) {
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

export async function inviteViaEmail(req: Request, res: Response, next: NextFunction) {
  const { id, userId } = req.query;
  const { emails } = req.body as { emails: string[] };
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }

    if (emails?.length === 0) {
      const response = { message: "Bad request" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }

    emails.forEach((email) => {
      if(!validateEmail(email)) return;
      const emailData = {
        email,
        name: user.display_name,
        roomName: room.name,
        roomId: room.id,
      }
      sendEmail(emailData, emailType.inviteToRoom);
    });


    const response = {
      message: "Sent email invites", room: prepareRoomForResponse(room),
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

export async function hostGoToTrack(req: Request, res: Response, next: NextFunction) {
  const { id, userId, uri } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    if (room.host.id !== userId) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    const currentTrack = await getTrack(room, uri, true);
    if (!currentTrack) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await play(room.host.token, currentTrack.uri, 0, room.host.deviceId);
    for (let i = 0; i < room.guests.length; i += 1) {
      const guest = room.guests[i];
      if (!guest.isActive || !guest.isApproved) continue;
      try {
        await play(guest.token, currentTrack.uri, 0, guest.deviceId);
      } catch (error) {
        logger.error("There was an error playing the track for a user", { error, guest });
        continue;
      }
    }
    const response = {
      message: "went to selected track", room: prepareRoomForResponse(room),
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

export async function hostCheckUsers(req: Request, res: Response, next: NextFunction) {
  const { id, userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    if (room.host.id !== userId) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    const roomCurrentTrackIndex = room.tracks.findIndex((track) => track.current);
    for (let i = 0; i < room.guests.length; i += 1) {
      const guest = room.guests[i];
      if (!guest.isActive || !guest.isApproved) continue;
      const u = await getUser(guest.id);
      const { index } = getUserCurrentTrack(room, u);
      if (index < roomCurrentTrackIndex - 2) {
        try {
          await removeRoomGuest(room, u);
        } catch (error) {
          logger.error("There was an error making a user inactive", { error, guest });
          continue;
        }
      }
    }
    const response = {
      message: "checked all users", room: prepareRoomForResponse(room),
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem checking the users in the room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function hostRemoveTrack(req: Request, res: Response, next: NextFunction) {
  const { id, userId, uri } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    if (room.host.id !== userId) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    const removed = await removeTrack(room, uri);
    if (!removed) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const response = {
      message: "removed selected track", room: prepareRoomForResponse(room),
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

export async function hostApproveTrack(req: Request, res: Response, next: NextFunction) {
  const { id, userId, uri } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    if (room.host.id !== userId) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    await approveTrack(room, uri);
    const response = {
      message: "Approved track", room: prepareRoomForResponse(room),
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem approving a track in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function hostApproveGuest(req: Request, res: Response, next: NextFunction) {
  const { id, userId, guestId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    if (room.host.id !== userId) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    if (room.guests.length >= 20) {
      const response = { message: "Too many guests" };
      res.locals.body = response;
      res.status(422).json(response);
      return next();
    }
    await approveGuest(room, guestId);
    const response = {
      message: "Approved track", room: prepareRoomForResponse(room),
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem approving a guest in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}


export async function getRooom(req: Request, res: Response, next: NextFunction) {
  const { id, userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const isHost = room.host.id === user.id;
    let response;
    if (isHost) {
      response = {
        message: "Got the room",
        room: prepareRoomForResponse(room),
      };
    } else {
      const guest = room.guests.find(m => m.id === userId);
      if (!guest || !guest.isApproved) {
        response = { message: "Unauthorised" }
        res.locals.body = response;
        res.status(401).json(response);
        return next();
      } else {
        response = {
          message: "Got the room",
          room: prepareRoomForResponse(room),
        };
      }
    }
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

export async function getRoomUser(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const user = await getUser(id);
  if (!user) {
    const response = { message: "Not found" };
    res.locals.body = response;
    res.status(404).json(response);
    return next();
  }
  const rooms = (await getRoomsByUser(id)).reverse();
  const response = {
    message: "User found",
    user: {
      rooms: rooms.map(prepareRoomForResponse),
      info: user.id,
    }
  };

  res.locals.body = response;
  res.status(200).json(response);
  return next();
}

export async function playRoom(req: Request, res: Response, next: NextFunction) {
  const { id, userId, deviceId } = req.query;
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
    if (room.host.id === userId) {
      let uri: string;
      let progress: number;
      const hostToken = room.host.token;
      const roomCurrentTrack = room.tracks.find((t) => t.current);
      if (roomCurrentTrack) {
        uri = roomCurrentTrack.uri;
        progress = 0;
        room.guests.forEach(m => m.currentTrack = roomCurrentTrack.uri);
        await room.save();
      } else {
        const response = { message: "Not found" };
        res.locals.body = response;
        res.status(404).json(response);
        return next();
      }
      play(hostToken, uri, progress, deviceId);
      for (let i = 0; i < room.guests.length; i += 1) {
        const guest = room.guests[i];
        if (!guest.isActive || !guest.isApproved) continue;
        try {
          await play(guest.token, uri, progress, guest.deviceId);
        } catch (error) {
          logger.error("There was an error playing the track for a user", { error, guest });
          continue;
        }
      }
      const response = {
        message: "Playing the track for all room guests", room: prepareRoomForResponse(room)
      };
      res.locals.body = response;
      res.status(200).json(response);
      return next();
    }

    const guest = room.guests.find((m) => m.id === user.id);
    if (!guest || !guest.isApproved || !guest.isActive) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const hostToken = room.host.token;
    const currentTrack = await getCurrentlyPalyingTrack(hostToken);
    if (!currentTrack?.is_playing || currentTrack?.item?.uri !== room.tracks.find((t) => t.current)?.uri) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await play(guest.token, currentTrack.item.uri, currentTrack.progress_ms + networkDelay, guest.deviceId);
    await setGuestCurrentTrack(room, user.id, currentTrack.item.uri);
    const response = {
      message: "Playing the track for room guest", room: prepareRoomForResponse(room)
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

export async function pauseRoom(req: Request, res: Response, next: NextFunction) {
  const { id, userId, deviceId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    if (room.host.id === userId) {
      const hostToken = room.host.token;
      const roomCurrentTrack = room.tracks.find((t) => t.current);
      if (!roomCurrentTrack) {
        const response = { message: "Not found" };
        res.locals.body = response;
        res.status(404).json(response);
        return next();
      }
      pause(hostToken, deviceId);
      for (let i = 0; i < room.guests.length; i += 1) {
        const guest = room.guests[i];
        if (!guest.isActive || !guest.isApproved) continue;
        try {
          await pause(guest.token, guest.deviceId);
        } catch (error) {
          logger.error("There was an error pausing the track for a uuser", { error, guest });
          continue;
        }
      }
      const response = {
        message: "Paused the track for all room guests", room: prepareRoomForResponse(room)
      };
      res.locals.body = response;
      res.status(200).json(response);
      return next();
    }

    const guest = room.guests.find((m) => m.id === user.id);
    if (!guest || !guest.isApproved || !guest.isActive) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await pause(guest.token, guest.deviceId);
    const response = {
      message: "Pausing the track for room guest", room: prepareRoomForResponse(room)
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem pausing a track in a room"
    logger.error(message, { error });
    res.status(500).json({ message });
    return next();
  }
}

export async function addTrackToRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { userId, uri, artists, name, image } = req.body;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room || !user) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const isHost = room.host.id === userId;
    if (isHost) {
      await addTrackToRoomInDb(room, uri, name, artists, image, isHost, room.host.name);
      const response = { message: "Track added to room", room: prepareRoomForResponse(room) }
      res.locals.body = response;
      res.status(200).json(response);
      return next();
    }

    const guest = room.guests.find((m) => m.id === user.id);
    if (!guest) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await addTrackToRoomInDb(room, uri, name, artists, image, true, guest.name);
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
    host: _.omit(room.host, ["token"]),
    guests: room.guests.map((m) => _.omit(m, ["token"])),
    tracks: room.tracks.filter(t => !t.removed),
    name: room.name,
    id: room.id,
    isActive: room.isActive,
  }
}