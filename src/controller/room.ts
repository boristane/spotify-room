import logger from "logger";
import { NextFunction, Response, Request } from "express";
import {
  updateTokenInRoom,
  getUser,
  spawnRoom,
  getRoom,
  addRoomMember,
  getTrack,
  addTrackToRoomInDb,
  getNextTrack,
  approveTrack,
  setGuestCurrentTrack,
  approveGuest,
  removeRoomMember,
  removeTrack,
  getRoomsByUser,
  getUserCurrentTrack,
  setGuestIsPlaying,
} from "../services/database";
import { play, getCurrentlyPalyingTrack, pause, getPlaylistTracks } from "../services/spotify";
import * as _ from "lodash";
import { IRoom } from "../models/room";
import { sendEmail, emailType } from "../services/emails";
import { validateEmail } from "../utils";
import { send404, send401, send500, send400 } from "../helpers/httpResponses";
import { ISpotifyTrack } from "../typings/spotify";
import moment from "moment";

export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { token, userId, deviceId } = req.body;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
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
    send500(res, message);
    return next();
  }
}

export async function updateTokenRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { token, userId } = req.body;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    await updateTokenInRoom(room, user, token);
    res.status(200).json({
      message: "All good", room: prepareRoomForResponse(room),
    });
    return next();
  } catch (error) {
    const message = "There was a problem updating the token of a user in the room"
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export async function leaveRoom(req: Request, res: Response, next: NextFunction) {
  const { id, userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
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
    send500(res, message);
    return next();
  }
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, token, deviceId, name } = req.body;
    const user = await getUser(userId);
    if (!user) {
      send404(res, "We could not find any user matching your details...");
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
    send500(res, message);
    return next();
  }
}

export async function goToNextTrack(req: Request, res: Response, next: NextFunction) {
  const { id, userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    let roomMember;
    const isHost = room.host.id === userId;
    if (isHost) roomMember = room.host;
    else roomMember = room.guests.find(m => m.id === userId);
    if (!roomMember) {
      send401(res, "You are not a member of this rooom, please refresh the page to join the rooom");
      return next();
    }
    let nextTrack;
    try {
      nextTrack = await getNextTrack(room, roomMember.id, isHost);
    } catch (error) {
      send404(res, error.message);
      return next();
    }
    await play(roomMember.token, nextTrack.uri, 0, roomMember.deviceId);
    const response = {
      message: "Went to next track", room: prepareRoomForResponse(room),
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem going to next track in a room"
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export async function inviteViaEmail(req: Request, res: Response, next: NextFunction) {
  const { id, userId } = req.query;
  const { emails } = req.body as { emails: string[] };
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }

    if (emails?.length === 0) {
      send400(res, "Please provide emails for the invitiations.")
      return next();
    }

    emails.forEach((email) => {
      if (!validateEmail(email)) return;
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
    send500(res, message);
    return next();
  }
}

export async function hostGoToTrack(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { userId, uri } = req.body;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    if (room.host.id !== userId) {
      send401(res, "You cannot perform this task because you are not the rooom host.");
      return next();
    }
    const currentTrack = await getTrack(room, uri, true);
    if (!currentTrack) {
      send401(res, "We could not find the track you are trying to go to. Please try again.");
      return next();
    }
    play(room.host.token, currentTrack.uri, 0, room.host.deviceId);
    for (let i = 0; i < room.guests.length; i += 1) {
      const guest = room.guests[i];
      if (!guest.isActive || !guest.isApproved || !guest.isPlaying) continue;
      try {
        play(guest.token, currentTrack.uri, 0, guest.deviceId);
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
    send500(res, message);
    return next();
  }
}

export async function hostMakeHost(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { hostId, userId } = req.body;
  try {
    const host = await getUser(hostId);
    const room = await getRoom(id);
    const guest = await getUser(userId);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!host) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    if (!guest) {
      send404(res, `We could not find any user matching the details of the guest...`);
      return next();
    }
    if (room.host.id !== hostId) {
      send401(res, "You cannot perform this task because you are not the rooom host.");
      return next();
    }
    const guestInRoom = room.guests.find(g => g.id === guest.id);
    if (!guestInRoom) {
      send404(res, "We could not find the guest to be promoted to host in the rooom...");
      return next();
    }
    if (!guestInRoom.isActive || !guestInRoom.isApproved) {
      send404(res, "The guest to be promoted to host is not currently active in the rooom...");
      return next();
    }
    // TODO all ths should be moved to the db service
    const hostInGuests = room.guests.find(g => g.id === host.id);
    if (!hostInGuests) {
      room.guests.push({
        id: host.id,
        token: room.host.token,
        name: host.display_name,
        deviceId: room.host.deviceId,
        isActive: true,
        isApproved: true,
        currentTrack: room.tracks.find(t => t.current).uri,
        isPlaying: false,
        createdAt: new Date(),
        sessions: [{
          startDate: new Date(),
          endDate: undefined,
        }],
      });
    } else {
      hostInGuests.token = room.host.token;
      hostInGuests.deviceId = room.host.deviceId;
      hostInGuests.isActive = true;
      if (hostInGuests.sessions.length >= 1 && !hostInGuests.sessions[hostInGuests.sessions.length - 1].endDate) {
        hostInGuests.sessions[hostInGuests.sessions.length - 1].endDate = new Date();
      }
      hostInGuests.sessions.push({
        startDate: new Date(),
        endDate: undefined,
      })
    }
    room.host.id = guest.id;
    room.host.token = guestInRoom.token;
    room.host.deviceId = guestInRoom.deviceId;
    room.host.name = guestInRoom.name;

    guestInRoom.isActive = false;
    if (guestInRoom.sessions.length >= 1 && !guestInRoom.sessions[guestInRoom.sessions.length - 1].endDate) {
      guestInRoom.sessions[guestInRoom.sessions.length - 1].endDate = new Date();
    }
    await room.save();
    const response = {
      message: "Promoted guest to host", room: prepareRoomForResponse(room),
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem promoting  a user to host"
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export async function hostCheckUsers(req: Request, res: Response, next: NextFunction) {
  const { id, userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    if (room.host.id !== userId) {
      send401(res, "You cannot perform this task because you are not the rooom host.");
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
          await removeRoomMember(room, u);
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
    send500(res, message);
    return next();
  }
}

export async function hostRemoveTrack(req: Request, res: Response, next: NextFunction) {
  const { id, userId, uri } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    if (room.host.id !== userId) {
      send401(res, "You cannot perform this task because you are not the rooom host.");
      return next();
    }
    const removed = await removeTrack(room, uri);
    if (!removed) {
      send404(res, "We could not find the track to remove from the rooom. Please try again.");
      return next();
    }
    const response = {
      message: "removed selected track", room: prepareRoomForResponse(room),
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem skipping a track in a room";
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export async function hostApproveTrack(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { userId, uri } = req.body;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    if (room.host.id !== userId) {
      send401(res, "You cannot perform this task because you are not the rooom host.");
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
    send500(res, message);
    return next();
  }
}

export async function hostApproveGuest(req: Request, res: Response, next: NextFunction) {
  const { id, userId, guestId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    if (room.host.id !== userId) {
      send401(res, "You cannot perform this task because you are not the rooom host.");
      return next();
    }
    if (room.guests.length >= 20) {
      const response = { message: "There are too many guests in the rooom." };
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
    send500(res, message);
    return next();
  }
}


export async function getRooom(req: Request, res: Response, next: NextFunction) {
  const { id, userId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
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
        send401(res, "You cannot perform this task because you are not an approved guest of this rooom.");
        return next();
      } else {
        response = {
          message: "Got the room",
          room: prepareRoomForResponse(room),
        };
      }
    }
    res.locals.body = { message: response.message };
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem getting in a room"
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export async function getRoomUser(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  try {
    const user = await getUser(id);
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    const rooms = (await getRoomsByUser(id)).sort((a, b) => moment(b.updatedAt).unix() - moment(a.updatedAt).unix());
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
  } catch (error) {
    const message = "There was a problem getting a room user";
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export async function playRoom(req: Request, res: Response, next: NextFunction) {
  const { id, userId, deviceId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    const networkDelay = 1000;
    if (room.host.id === userId) {
      if (!room.isActive) {
        send404(res, "The rooom is not active, please refresh the browser.");
        return next();
      }
      let uri: string;
      let progress = 0;
      const hostToken = room.host.token;
      const roomCurrentTrack = room.tracks.find((t) => t.current);
      if (room.tracks.length <= 0) {
        send404(res, "Please start by adding tracks to the rooom.");
        return next();
      }
      if (roomCurrentTrack) {
        const currentTrack = await getCurrentlyPalyingTrack(hostToken);
        if (roomCurrentTrack.uri === currentTrack?.item?.uri) {
          progress = currentTrack.progress_ms;
        }
        uri = roomCurrentTrack.uri;
        room.guests.forEach(m => m.currentTrack = roomCurrentTrack.uri);
        await room.save();
      } else {
        send404(res, "The rooom does not have a current track, Please contact support.");
        return next();
      }
      play(hostToken, uri, progress, deviceId);
      for (let i = 0; i < room.guests.length; i += 1) {
        const guest = room.guests[i];
        if (!guest.isActive || !guest.isApproved || !guest.isPlaying) continue;
        try {
          play(guest.token, uri, progress, guest.deviceId);
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

    if (!room.isActive) {
      send404(res, "The host has left the listening session...");
      return next();
    }
    const guest = room.guests.find((m) => m.id === user.id);
    if (!guest || !guest.isApproved || !guest.isActive) {
      send404(res, "We could not find you in this rooom. Please make sure you have joined and you are approved.");
      return next();
    }
    const hostToken = room.host.token;
    const currentTrack = await getCurrentlyPalyingTrack(hostToken);
    if (!currentTrack?.is_playing) {
      send404(res, "The host is currently not playing any music, please wait until they start the session");
      return next();
    }
    if (currentTrack?.item?.uri !== room.tracks.find((t) => t.current)?.uri) {
      send404(res, "The host has left the rooom, the session is over...");
      return next();
    }
    await play(guest.token, currentTrack.item.uri, currentTrack.progress_ms + networkDelay, guest.deviceId);
    await setGuestCurrentTrack(room, user.id, currentTrack.item.uri);
    await setGuestIsPlaying(room, guest.id, true);
    const response = {
      message: "Playing the track for room guest", room: prepareRoomForResponse(room)
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem playing a track in a room";
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export async function pauseRoom(req: Request, res: Response, next: NextFunction) {
  const { id, userId, deviceId } = req.query;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    if (room.host.id === userId) {
      const hostToken = room.host.token;
      const roomCurrentTrack = room.tracks.find((t) => t.current);
      if (!roomCurrentTrack) {
        send404(res, "This rooom does not have a current track. Please contact support.");
        return next();
      }
      pause(hostToken, deviceId);
      for (let i = 0; i < room.guests.length; i += 1) {
        const guest = room.guests[i];
        if (!guest.isActive || !guest.isApproved || !guest.isPlaying) continue;
        try {
          pause(guest.token, guest.deviceId);
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
      send404(res, "We could not find you in this rooom. Please make sure you have joined and you are approved.");
      return next();
    }
    await pause(guest.token, guest.deviceId);
    await setGuestIsPlaying(room, guest.id, false);
    const response = {
      message: "Pausing the track for room guest", room: prepareRoomForResponse(room)
    };
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (error) {
    const message = "There was a problem pausing a track in a room"
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export async function addTrackToRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { userId, uri, artists, name, image } = req.body;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
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
      send404(res, "We could not find you in this rooom. Please make sure you have joined and you are approved.");
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
    send500(res, message);
    return next();
  }
}

export async function addPlaylistToRoom(req: Request, res: Response, next: NextFunction) {
  const { id } = req.query;
  const { userId, playlistId, token } = req.body;
  try {
    const user = await getUser(userId);
    const room = await getRoom(id);
    if (!room) {
      send404(res, "We could not find this rooom...");
      return next();
    }
    if (!user) {
      send404(res, "We could not find any user matching your details...");
      return next();
    }
    const isHost = room.host.id === userId;
    const guest = room.guests.find((m) => m.id === user.id);
    if (!guest && !isHost) {
      send404(res, "We could not find you in this rooom. Please make sure you have joined and you are approved.");
      return next();
    }
    const addedBy = isHost ? room.host.name : guest.name;
    const tracks = (await getPlaylistTracks(token, playlistId)).tracks.items as any[];
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i].track as ISpotifyTrack;
      const isAlreadyInRoom = room.tracks.map(t => t.uri).includes(track.uri);
      if (isAlreadyInRoom) continue;
      if (track.is_local) continue;
      if (!track.available_markets.includes(user.country)) continue;
      const artists = track.artists.map(a => a.name);
      const image = track.album.images[0]?.url;
      await addTrackToRoomInDb(room, track.uri, track.name, artists, image, true, addedBy);
    }
    const response = { message: "Playlist added to room", room: prepareRoomForResponse(room) }
    res.locals.body = response;
    res.status(200).json(response);
    return next();

  } catch (error) {
    const message = "There was a problem adding a playlist in a room"
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export function prepareRoomForResponse(room: IRoom) {
  return {
    host: _.omit(room.host, ["token"]),
    guests: room.guests.map((m) => _.omit(m, ["token"])),
    tracks: room.tracks.filter(t => !t.removed),
    cover: room.cover,
    name: room.name,
    id: room.id,
    isActive: room.isActive,
  }
}