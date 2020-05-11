
import { Request, Response, NextFunction } from "express";

import axios from "axios";
import { generateRandomString } from "../utils";
import { createPlaylist, addTracksToPlaylist, getUserProfile, search, getRecommendations } from "../services/spotify";
import { saveUser } from "../services/database";
import qs from "qs";
import logger from "logger";
import * as _ from "lodash";

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
  res.cookie("rooom_id", id);
  const scope = "user-read-private user-read-email user-modify-playback-state user-read-currently-playing user-read-playback-state streaming playlist-modify-public";
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

export async function getToken(req: Request, res: Response) {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies[stateKey] : undefined;

  if (state === undefined || state !== storedState) {
    console.log({ error: "state_mismatch" });
    return res.status(500).json({ error: "state_mismatch" });
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
    logger.info("Token", response.data);
    res.status(200).json(response.data);
  } catch {
    console.log({ error: "invalid_token" });
    res.status(500).json({ error: "invalid_token" });
  }
}

export async function refreshToken(req: Request, res: Response) {
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
    res.status(200).json(response.data);
  } catch {
    console.log({ error: "invalid_token" });
    res.status(500).json({ error: "invalid_token" });
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  const { token } = req.query;
  try {
    const user = await getUserProfile(token);
    await saveUser(user);
    res.locals.body = user;
    res.status(200).json({ user: _.omit(user, ["email", "birthdate"]) });
    return next();
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Unexpected error.", err: err.stack });
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
    logger.error("There was an error searching fo a track");
    res.status(500).json({ error: "Unexpected error." });
    return next();
  }
}

export async function generatePlaylist(req: Request, res: Response) {
  const { uris, userId, name } = req.body;
  const { token } = req.query;
  try {
    const playlistId = await createPlaylist(token, userId, name);
    const playlistSnapshot = await addTracksToPlaylist(token, playlistId, uris);
    res.status(200).json({ playlistId, playlistSnapshot });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Unexpected error.", err: err.stack });
  }
}

export async function getRecommendation(req: Request, res: Response) {
  const { uris } = req.body;
  const { token } = req.query;
  try {
    const tracks = await getRecommendations(token, uris);
    res.status(200).json(tracks);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Unexpected error.", err: err.stack });
  }
}
