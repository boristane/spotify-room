import axios from "axios";
import 'babel-polyfill';
const sendMessage: any = self.postMessage;

let roomId;
let userId;
let deviceId;
let refreshRoomTimeoutId;
let code;
let state;

async function refreshRoomToken() {
  const token = await getToken();
  try {
    await axios.put(`/room/join/?id=${roomId}&token=${token}&userId=${userId}&deviceId=${deviceId}`);
  } catch (error) {
    sendMessage({ message: "There was an error when refreshing the token of the rooom" }, "");
    return;
  }
}

async function getToken() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const state = params.get("state");
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    const { access_token: token, refresh_token: refreshToken } = (await axios.get(
      `/spotify/get-token/?code=${code}&state=${state}`
    )).data;
    localStorage.setItem("refreshToken", refreshToken);
    return token;
  }
  const { access_token: token } = (await axios.get(
    `/spotify/refresh-token/?refresh_token=${refreshToken}`
  )).data;
  return token;
}

async function refreshRoom() {
  try {
    const room = (await axios.get(`/room/?id=${roomId}&userId=${userId}`)).data.room;
    sendMessage({ room });
  } catch (error) {
    console.log(error);
  }
  refreshRoomTimeoutId = setTimeout(refreshRoom, 10 * 1000);
}

onmessage = async function (e) {
  if(e.data.goToNextTrack && e.data.paused && e.data.isPlaying) {
    await goToNextTrack()
    return;
  }
  if (e.data.roomId && e.data.roomId) {
    roomId = e.data.roomId;
    userId = e.data.userId;
    if(refreshRoomTimeoutId) {
      this.clearTimeout(refreshRoomTimeoutId);
    }
    return refreshRoom();
  }
  if (e.data.code && e.data.state) {
    code = e.data.code;
    state = e.data.state;
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