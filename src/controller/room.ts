import logger from "logger";
import { NextFunction, Response, Request } from "express";
import { getUser, spawnRoom, getRoom, addRoomMember, getTrack, addTrackToRoomInDb, getNextTrack, approveTrack, setMemberCurrentTrack, approveMember, removeRoomMember, removeTrack, getRoomsByUser } from "../services/database";
import { play, getCurrentlyPalyingTrack, pause } from "../services/spotify";
import * as _ from "lodash";
import { IRoom } from "../models/room";

export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  const { id, token, userId, deviceId } = req.query;
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
    await removeRoomMember(room, user);
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
    const isMaster = room.master.id === userId
    if (isMaster) roomMember = room.master;
    else roomMember = room.members.find(m => m.id === userId);
    if (!roomMember) {
      const response = { message: "Unauthorized" };
      res.locals.body = response;
      res.status(401).json(response);
      return next();
    }
    const currentTrack = await getNextTrack(room, roomMember.id, isMaster);
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

export async function masterGoToTrack(req: Request, res: Response, next: NextFunction) {
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
    if (room.master.id !== userId) {
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
    await play(room.master.token, currentTrack.uri, 0, room.master.deviceId);
    for (let i = 0; i < room.members.length; i += 1) {
      const member = room.members[i];
      if (!member.isActive || !member.isApproved) continue;
      try {
        await play(member.token, currentTrack.uri, 0, member.deviceId);
      } catch (error) {
        logger.error("There was an error playing the track for a user", { error, member });
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

export async function masterRemoveTrack(req: Request, res: Response, next: NextFunction) {
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
    if (room.master.id !== userId) {
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

export async function masterApproveTrack(req: Request, res: Response, next: NextFunction) {
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
    if (room.master.id !== userId) {
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

export async function masterApproveMember(req: Request, res: Response, next: NextFunction) {
  const { id, userId, memberId } = req.query;
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
    if (room.members.length >= 20) {
      const response = { message: "Too many members" };
      res.locals.body = response;
      res.status(422).json(response);
      return next();
    }
    await approveMember(room, memberId);
    const response = {
      message: "Approved track", room: prepareRoomForResponse(room),
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem approving a member in a room"
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
    const isMaster = room.master.id === user.id;
    let response;
    if (isMaster) {
      response = {
        message: "Got the room",
        room: prepareRoomForResponse(room),
      };
    } else {
      const member = room.members.find(m => m.id === userId);
      if (!member || !member.isApproved) {
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
    if (room.master.id === userId) {
      let uri: string;
      let progress: number;
      const masterToken = room.master.token;
      const roomCurrentTrack = room.tracks.find((t) => t.current);
      if (roomCurrentTrack) {
        uri = roomCurrentTrack.uri;
        progress = 0;
        room.members.forEach(m => m.currentTrack = roomCurrentTrack.uri);
        await room.save();
      } else {
        const response = { message: "Not found" };
        res.locals.body = response;
        res.status(404).json(response);
        return next();
      }
      play(masterToken, uri, progress, deviceId);
      for (let i = 0; i < room.members.length; i += 1) {
        const member = room.members[i];
        if (!member.isActive || !member.isApproved) continue;
        try {
          await play(member.token, uri, progress, member.deviceId);
        } catch (error) {
          logger.error("There was an error playing the track for a uuser", { error, member });
          continue;
        }
      }
      const response = {
        message: "Playing the track for all room members", room: prepareRoomForResponse(room)
      };
      res.locals.body = response;
      res.status(200).json(response);
      return next();
    }

    const roomMember = room.members.find((m) => m.id === user.id);
    if (!roomMember || !roomMember.isApproved || !roomMember.isActive) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    const masterToken = room.master.token;
    const currentTrack = await getCurrentlyPalyingTrack(masterToken);
    if (!currentTrack?.is_playing || currentTrack?.item?.uri !== room.tracks.find((t) => t.current).uri) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await play(roomMember.token, currentTrack.item.uri, currentTrack.progress_ms + networkDelay, roomMember.deviceId);
    await setMemberCurrentTrack(room, user.id, currentTrack.item.uri);
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
    if (room.master.id === userId) {
      const masterToken = room.master.token;
      const roomCurrentTrack = room.tracks.find((t) => t.current);
      if (!roomCurrentTrack) {
        const response = { message: "Not found" };
        res.locals.body = response;
        res.status(404).json(response);
        return next();
      }
      pause(masterToken, deviceId);
      for (let i = 0; i < room.members.length; i += 1) {
        const member = room.members[i];
        if (!member.isActive || !member.isApproved) continue;
        try {
          await pause(member.token, member.deviceId);
        } catch (error) {
          logger.error("There was an error pausing the track for a uuser", { error, member });
          continue;
        }
      }
      const response = {
        message: "Paused the track for all room members", room: prepareRoomForResponse(room)
      };
      res.locals.body = response;
      res.status(200).json(response);
      return next();
    }

    const roomMember = room.members.find((m) => m.id === user.id);
    if (!roomMember || !roomMember.isApproved || !roomMember.isActive) {
      const response = { message: "Not found" };
      res.locals.body = response;
      res.status(404).json(response);
      return next();
    }
    await pause(roomMember.token, roomMember.deviceId);
    const response = {
      message: "Pausing the track for room member", room: prepareRoomForResponse(room)
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
    const approved = room.master.id === userId;
    if (approved) {
      await addTrackToRoomInDb(room, uri, name, artists, image, approved, room.master.name);
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
    await addTrackToRoomInDb(room, uri, name, artists, image, approved, roomMember.name);
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
    tracks: room.tracks.filter(t => !t.removed),
    name: room.name,
    id: room.id,
    isActive: room.isActive,
  }
}