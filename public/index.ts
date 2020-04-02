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
let id: string;

document.getElementById("skip").addEventListener("click", async (e: MouseEvent) => {
  try {
    await axios.post(`/spotify/skip/?token=${token}`);
  } catch (error) {
    console.log("There was problem skipping the track", error);
  }
});

document.getElementById("play").addEventListener("click", async (e: MouseEvent) => {
  try {
    await axios.post(`/spotify/play/?token=${token}`);
  } catch (error) {
    console.log("There was problem skipping the track", error);
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

  try {
    id = getCookies()["rooom_id"];
    console.log(id);
    await axios.put(`/room/join/${id}?token=${token}&userId=${user.id}`);
  } catch (error) {
    console.log("There was an error when joining a rooom", error);
  }

  const username = user.display_name ? user.display_name.split(" ")[0] : "there";
  document.getElementById("user").textContent = username;

}

function getCookies(): Record<string, string> {
  const pairs = document.cookie.split(";");
  const cookies = {};
  for (let i=0; i<pairs.length; i++){
    const pair = pairs[i].split("=");
    cookies[(pair[0]+'').trim()] = unescape(pair.slice(1).join('='));
  }
  return cookies;
}

main();
