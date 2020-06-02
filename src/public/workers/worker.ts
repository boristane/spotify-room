import axios from "axios";
import 'babel-polyfill';
import { ICurrentTrackResponse } from "../../typings/spotify";
import roomApi from "../scripts/apis/room";
import spotifyApi from "../scripts/apis/spotify";
const sendMessage: any = self.postMessage;

let roomId;
let userId;
let deviceId;
let getCurrentTrackTimeoutId;
let goToNextTrackTimeOutId;
let refreshToken;
let token;

async function refreshRoomToken() {
  token = await getToken();
  try {
    await roomApi.refreshTokenInRoom(roomId, userId, token);
  } catch (error) {
    sendMessage({ message: "There was an error when refreshing the token of the rooom" });
    return;
  }
}

async function getToken() {
  try {
    const { access_token: token } = (await spotifyApi.refreshToken(refreshToken)).data;
    return token;
  } catch(error) {
    return "";
  }
}

async function getCurrentLoop() {
  const loopTime = 10 * 1000;
  try {
    const { track } = (await axios.get<{ track: ICurrentTrackResponse }>(`/spotify/current-track/?token=${token}&userId=${userId}`)).data;
    sendMessage({ isPlaying: track.is_playing.toString() });
    if (track?.item?.duration_ms - track?.progress_ms <= loopTime) {
      goToNextTrackTimeOutId = setTimeout(() => {
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
    clearTimeOuts();
    getCurrentTrackTimeoutId = setTimeout(getCurrentLoop, 1000);
    const maxTime = 4 * 60 * 60 * 1000;
    setTimeout(function () {
      clearTimeout(getCurrentTrackTimeoutId);
    }, maxTime);
  }
  if (e.data.stopPlaying) {
    clearTimeOuts();
  }
};

function clearTimeOuts() {
  if (getCurrentTrackTimeoutId) {
    clearTimeout(getCurrentTrackTimeoutId);
  }
  if (goToNextTrackTimeOutId) {
    clearTimeout(goToNextTrackTimeOutId);
  }
}

async function goToNextTrack() {
  let success = false;
  let numAttempts = 0;
  const maxNumAttempts = 5;
  let errorMessage: string;
  while (!success && numAttempts < maxNumAttempts) {
    try {
      const room = (await roomApi.goToNextTrack(roomId, userId)).data.room;
      sendMessage({ room });
      success = true;
    } catch (error) {
      if (error.response && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      await refreshRoomToken();
    }
    numAttempts += 1;
  }
  if (!success) {
    sendMessage({ message: errorMessage ?? "There was a problem moving to the next track", permanent: true });
  }
}