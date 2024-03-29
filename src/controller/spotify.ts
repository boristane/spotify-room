
import { Request, Response, NextFunction } from "express";
import { sendEmail, emailType } from "../services/emails";

import axios from "axios";
import { generateRandomString } from "../utils";
import { createPlaylist, addTracksToPlaylist, getUserProfile, search, getRecommendations, getTopTracks, getCurrentlyPalyingTrack, getPlaylists, play, getCurrentlyPlayback } from "../services/spotify";
import { saveUser } from "../services/database";
import qs from "qs";
import logger from "logger";
import * as _ from "lodash";
import { send500 } from "../helpers/httpResponses";

require("dotenv").config();

const clientId = process.env["SPOTIFY_CLIENT_ID"];
const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
const redirectUri = process.env["SPOTIFY_REDIRECT_URI"];
const dialog = process.env["SPOTIFY_DIALOG"] === "true" ? true : false;

const stateKey = "spotify_auth_state";

export function login(req: Request, res: Response) {
  const state = generateRandomString(16);
  const { id } = req.query;
  res.cookie(stateKey, state);
  if (id) {
    res.cookie("rooom_id", id);
  }
  const scope = "user-read-private user-top-read user-read-email user-modify-playback-state user-read-currently-playing user-read-playback-state streaming playlist-modify-public playlist-read-private";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
    qs.stringify({
      response_type: "code",
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state,
      show_dialog: false,
    })
  );
}

export async function getToken(req: Request, res: Response, next: NextFunction) {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies[stateKey] : undefined;

  if (state === undefined || state !== storedState) {
    const message = "The state of your application does not match our records, please refresh the page.";
    logger.error(message, { state, storedState });
    send500(res, message);
    return next();
  }

  res.clearCookie(stateKey);
  const auth = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const data = {
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  };
  const dataString = qs.stringify(data);
  const axiosConfig = {
    headers: {
      Authorization: auth,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  };
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      dataString,
      axiosConfig
    );
    res.status(200).json(response.data);
    return next();
  } catch (err) {
    const message = "The authentication token is invalid. Please refresh the page.";
    logger.error(message, { error: err });
    send500(res, message);
    return next();
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  const token = req.query.refresh_token;
  const auth = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const data = {
    grant_type: "refresh_token",
    refresh_token: token
  };
  const dataString = qs.stringify(data);
  const axiosConfig = {
    headers: {
      Authorization: auth,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  };
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      dataString,
      axiosConfig
    );
    res.locals.body = response.data;
    res.status(200).json(response.data);
    return next();
  } catch (error) {
    const message = "The refresh authentication token is invalid. Please refresh the page.";
    logger.error(message, { error });
    send500(res, message);
    return next();
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  const { token } = req.query;
  try {
    const user = await getUserProfile(token);
    const isNewUser = await saveUser(user);
    if (isNewUser) {
      sendEmail({ name: user.display_name, email: user.email }, emailType.createAccount);
    }
    res.locals.body = _.omit(user, ["email", "birthdate"]);
    res.status(200).json({ user: _.omit(user, ["email", "birthdate"]) });
    return next();
  } catch (err) {
    const message = "The authentication token is invalid. Please refresh the page.";
    logger.error(message, { error: err });
    send500(res, message);
    return next();
  }
}

export async function getCurrentTrack(req: Request, res: Response, next: NextFunction) {
  const { token, userId }: { token: string, userId: string } = req.query;
  try {
    const track = await getCurrentlyPalyingTrack(token);
    res.locals.body = { message: "Got the current track" };
    res.status(200).json({ track });
    return next();
  } catch (err) {
    const message = "There was a problem getting your current track from Spotify.";
    logger.error(message, { error: err });
    send500(res, message);
    return next();
  }
}

export async function getCurrentPlayback(req: Request, res: Response, next: NextFunction) {
  const { token, userId }: { token: string, userId: string } = req.query;
  try {
    const playback = await getCurrentlyPlayback(token);
    res.locals.body = { message: "Got the current playback status of the user." };
    res.status(200).json({ playback });
    return next();
  } catch (err) {
    const message = "There was a problem getting your current playback status from Spotify.";
    logger.error(message, { error: err });
    send500(res, message);
    return next();
  }
}

export async function searchTrack(req: Request, res: Response, next: NextFunction) {
  const { token, query } = req.query;
  try {
    const response = await search(token, query);
    res.locals.body = response;
    res.status(200).json(response);
    return next();
  } catch (err) {
    const message = "We could not find that track. Please try again.";
    logger.error(message, { error: err });
    send500(res, message);
  }
}

export async function generatePlaylist(req: Request, res: Response, next: NextFunction) {
  const { uris, userId, name } = req.body;
  const { token } = req.query;
  try {
    const playlistId = await createPlaylist(token, userId, name);
    const playlistSnapshot = await addTracksToPlaylist(token, playlistId, uris);
    res.status(200).json({ playlistId, playlistSnapshot });
  } catch (err) {
    const message = "We could notgenerate your playlist. Please try again.";
    logger.error(message, { error: err });
    send500(res, message);
  }
}

export async function getRecommendation(req: Request, res: Response) {
  const { uris } = req.body as { uris: string[] };
  const { token } = req.query;
  try {
    if (uris.length === 0) {
      const tracks = await getTopTracks(token, "short_term");
      return res.status(200).json(tracks.items.slice(0, 5));
    }
    const tracks = await getRecommendations(token, uris);
    res.status(200).json(tracks);
  } catch (err) {
    const message = "There was an issue getting your recommendations, do not worry we will try again.";
    logger.error(message, { error: err });
    send500(res, message);
  }
}

export async function getListPlaylists(req: Request, res: Response, next: NextFunction) {
  const { token, page, limit } = req.query;
  try {
    const playlists = await getPlaylists(token, limit, page);
    res.status(200).json(playlists);
    return next();
  } catch (error) {
    const message = "There was an issue getting your playlists from Spotify. Please try again.";
    logger.error(message, { error });
    send500(res, message);
  }
}
