import axios from "axios";
import 'babel-polyfill';
import { ICurrentTrackResponse } from "../../typings/spotify";
import api from "../scripts/api";
const sendMessage: any = self.postMessage;

let roomId;
let userId;
let deviceId;
let getCurrentTrackTimeoutId;
let refreshToken;
let token;

async function refreshRoomToken() {
  token = await getToken();
  try {
    if (!deviceId) throw new Error();
    await api.joinRoom(roomId, token, userId, deviceId);
  } catch (error) {
    sendMessage({ message: "There was an error when refreshing the token of the rooom" }, "");
    return;
  }
}

async function getToken() {
  const { access_token: token } = (await api.refreshToken(refreshToken)).data;
  return token;
}


async function getCurrentLoop() {
  const loopTime = 10 * 1000;
  try {
    const { track } = (await axios.get<{ track: ICurrentTrackResponse }>(`/spotify/current-track/?token=${token}&userId=${userId}`)).data;
    sendMessage({ isPlaying: track.is_playing });
    if (track?.item?.duration_ms - track?.progress_ms <= loopTime) {
      setTimeout(() => {
        goToNextTrack();
      }, track.item.duration_ms - track.progress_ms);
    }
  } catch (error) {
    await refreshRoomToken();
  }
  getCurrentTrackTimeoutId = setTimeout(getCurrentLoop, loopTime);
}

onmessage = async function (e) {
  if (e.data.roomId && e.data.userId) {
    roomId = e.data.roomId;
    userId = e.data.userId;
    token = await getToken();
  }
  if (e.data.refreshToken) {
    refreshToken = e.data.refreshToken;
  }
  if (e.data.deviceId) {
    deviceId = e.data.deviceId;
  }
  if (e.data.startPlaying) {
    if (getCurrentTrackTimeoutId) {
      this.clearTimeout(getCurrentTrackTimeoutId);
    }
    getCurrentLoop();
  }
  if (e.data.stopPlaying) {
    if (getCurrentTrackTimeoutId) {
      this.clearTimeout(getCurrentTrackTimeoutId);
    }
  }
};

async function goToNextTrack() {
  let success = false;
  let numAttempts = 0;
  const maxNumAttempts = 5;
  while (!success && numAttempts < maxNumAttempts) {
    try {
      const room = (await axios.get(`/room/next/?id=${roomId}&userId=${userId}`)).data.room;
      sendMessage({ room });
      success = true;
    } catch (error) {
      console.log("There was a problem moving to the next track");
      await refreshRoomToken();
    }
    numAttempts += 1;
  }
  if (!success) {
    sendMessage({ message: "There was a problem moving to the next track" });
  }
}