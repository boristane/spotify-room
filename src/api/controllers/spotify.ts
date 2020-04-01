
import { Request, Response } from "express";

import axios from "axios";
import { generateRandomString } from "../utils";
import {createPlaylist, addTracksToPlaylist, getUserProfile, getTopArtists, getTopTracks} from "../services/spotify";
import qs from "qs";
import {clusterGenres, findConnections, getExplicit, clusterTracksAges, getScore, getPeriod} from "../helpers/spotify"
import { getScorePercentage, saveToDB } from "./users";
import { IServerResponse } from "../../typings/front";

require("dotenv").config();

const clientId = process.env["SPOTIFY_CLIENT_ID"];
const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
const redirectUri = process.env["SPOTIFY_REDIRECT_URI"];
const dialog = process.env["SPOTIFY_DIALOG"] === "true" ? true : false;

const stateKey = "spotify_auth_state";

export function login(req: Request, res: Response) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);
  var scope = "user-read-private user-read-email user-top-read playlist-modify-public";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      qs.stringify({
        response_type: "code",
        client_id: clientId,
        scope: scope,
        redirect_uri: redirectUri,
        state: state,
        show_dialog: dialog
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

export async function doIt(req: Request, res: Response) {
  const { token, term } = req.query;
  try {
    const user = await getUserProfile(token);
    const country = user.country;
    const topArtists = await getTopArtists(token, country, term);
    const genreClusters = clusterGenres(topArtists);
    const connections = await findConnections(token, topArtists);
    const topTracks = (await getTopTracks(token, term)).items;
    const explicit = getExplicit(topTracks);
    const tracksAgesClusters = clusterTracksAges(topTracks);
    const score = getScore(connections, genreClusters, tracksAgesClusters, topArtists);
    saveToDB(user.product, user.birthdate, user.country, user.followers.total, score, term);
    const eclectixPercentage = await getScorePercentage(score);

    const response: IServerResponse = {
      genreClusters,
      topArtists,
      connections,
      topTracks,
      explicit,
      user,
      tracksAgesClusters,
      period: getPeriod(term),
      score,
      eclectixPercentage
    };
    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Unexpected error.", err: err.stack });
  }
}

export async function getUser(req: Request, res: Response) {
  const { token } = req.query;
  try {
    const user = await getUserProfile(token);
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Unexpected error.", err: err.stack });
  }
}

export async function generatePlaylist(req: Request, res: Response) {
  const { uris, userId } = req.body;
  const { token } = req.query;
  try {
    const playlistId = await createPlaylist(token, userId);
    const playlistSnapshot = await addTracksToPlaylist(token, playlistId, uris);
    res.status(200).json({ playlistId, playlistSnapshot });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Unexpected error.", err: err.stack });
  }
}


