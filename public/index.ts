import axios from "axios";
import "babel-polyfill";

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

let token: string;
let user;
let roomId: string;

document.getElementById("skip").addEventListener("click", async (e: MouseEvent) => {
  try {
    await axios.post(`/room/skip/${roomId}/?userId=${user.id}`);
  } catch (error) {
    console.log("There was problem skipping the track", error);
  }
});

document.getElementById("play").addEventListener("click", async (e: MouseEvent) => {
  try {
    await axios.post(`/spotify/play/?token=${token}`);
  } catch (error) {
    console.log("There was problem playing the track", error);
  }
});

document.getElementById("create").addEventListener("click", async (e: MouseEvent) => {
  try {
    await axios.post(`/room/create/?token=${token}&userId=${user.id}`);
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

  try {
    user = (await axios.get(`/spotify/me/?token=${token}`)).data;
  } catch {
    return window.location.replace("/");
  }

  roomId = getCookies()["rooom_id"];
  if(roomId && roomId !== "null") {
    try {
      await axios.put(`/room/join/${roomId}?token=${token}&userId=${user.id}`);
    } catch (error) {
      console.log("There was an error when joining a rooom", error);
    }
  } else {
    document.getElementById("create").style.display = "block";
  }


  const username = user.display_name ? user.display_name.split(" ")[0] : "there";
  document.getElementById("user").textContent = username;

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

main();
