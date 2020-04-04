import axios from "axios";
import "babel-polyfill";
import { IRoom } from "../src/api/models/room";
import { domainToASCII } from "url";

async function getToken() {
  const params = new URLSearchParams(window.location.search);
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

export async function getRoom(roomId: string, userId: string): Promise<IRoom> {
  try {
    return (await axios.get(`/room/${roomId}/?userId=${userId}`)).data.room as IRoom;
  } catch(err) {
    console.log("There was a problem getting the room", err);
  }
}

export async function displayRoom(room: IRoom) {
  const tracklistElt = document.querySelector(".tracklist");
  const trackElts = room.tracks.map((track) => `<li>${track.artist} - ${track.name}</li>`);
  tracklistElt.innerHTML = trackElts.join("");

  const membersListElt = document.querySelector(".members");
  const memberElts = room.members.map((member) => `<li>${member.name}</li>`);
  const masterElt = `<li style="font-weight: bold">${room.master.name}</li>`;
  membersListElt.innerHTML = masterElt + memberElts.join();
}

let token: string;
let user;
let roomId: string;
let deviceId: string;

document.getElementById("next").addEventListener("click", async (e: MouseEvent) => {
  try {
    const room = (await axios.post(`/room/next/${roomId}/?userId=${user.id}&deviceId=${deviceId}`)).data.room;
    displayRoom(room);
  } catch (error) {
    console.log("There was problem skipping to the next the track", error);
  }
});

document.getElementById("previous").addEventListener("click", async (e: MouseEvent) => {
  try {
    const room = (await axios.post(`/room/previous/${roomId}/?userId=${user.id}&deviceId=${deviceId}`)).data.room;
    displayRoom(room);
  } catch (error) {
    console.log("There was problem skipping to the previous track", error);
  }
});

document.getElementById("play").addEventListener("click", async (e: MouseEvent) => {
  try {
    const room = (await axios.post(`/room/play/${roomId}/?userId=${user.id}&deviceId=${deviceId}`)).data.room;
    displayRoom(room);
  } catch (error) {
    console.log("There was problem playing the track", error);
  }
});

document.getElementById("create").addEventListener("click", async (e: MouseEvent) => {
  try {
    await axios.post(`/room/create/?token=${token}&userId=${user.id}&deviceId=${deviceId}`);
    window.location.reload();
  } catch (error) {
    console.log("There was problem creating the room", error);
  }
});

async function main() {
  try {
    token = await getToken();
  } catch {
    return window.location.replace("/");
  }
}

function getCookies(): Record<string, string> {
  const pairs = document.cookie.split(";");
  console.log(pairs);
  const cookies = {};
  for (let i=0; i<pairs.length; i++){
    const pair = pairs[i].split("=");
    cookies[(pair[0]+'').trim()] = unescape(pair.slice(1).join('='));
  }
  return cookies;
}

export async function doIt() {
  try {
    user = (await axios.get(`/spotify/me/?token=${token}`)).data;
  } catch {
    return window.location.replace("/");
  }

  roomId = getCookies()["rooom_id"];
  if(roomId && roomId !== "null") {
    try {
      await axios.put(`/room/join/${roomId}?token=${token}&userId=${user.id}&deviceId=${deviceId}`);
    } catch (error) {
      console.log("There was an error when joining a rooom", error);
    }
    const room = await getRoom(roomId, user.id);
    displayRoom(room);
  } else {
    document.getElementById("create").style.display = "block";
  }
  const username = user.display_name ? user.display_name.split(" ")[0] : "there";
  document.getElementById("user").textContent = username;
}

//@ts-ignore
window.onSpotifyWebPlaybackSDKReady = () => {
  //@ts-ignore
  const player = new Spotify.Player({
    name: 'Rooom',
    getOAuthToken: cb => { cb(token); }
  });
  
  player.addListener('initialization_error', ({ message }) => { console.error(message); });
  player.addListener('authentication_error', ({ message }) => { console.error(message); });
  player.addListener('account_error', ({ message }) => { console.error(message); });
  player.addListener('playback_error', ({ message }) => { console.error(message); });
  
  player.addListener('player_state_changed', state => { console.log(state); });
  
  player.addListener('ready', ({ device_id }) => {
    deviceId = device_id;
    console.log('Ready with Device ID', device_id);
    doIt();
  });
  
  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
  });
  
  player.connect();
};


main();
