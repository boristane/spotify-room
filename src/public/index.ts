import axios from "axios";
import "babel-polyfill";
import { IRoom } from "../models/room";
import { ISpotifyTrack, ISpotifyWebPlaybackState } from "../typings/spotify";
import { userBuilder, masterBuilder, trackBuilder, searchResultBuilder } from "./builders";

const debounce = (func: Function, delay: number) => {
  let debounceTimer
  return function () {
    const context = this
    const args = arguments
    clearTimeout(debounceTimer)
    debounceTimer
      = setTimeout(() => func.apply(context, args), delay)
  }
}

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
  } catch (err) {
    console.log("There was a problem getting the room", err);
    if (err.response && err.response.status === 401) {
      return null;
    }
  }
}

document.querySelector("body").addEventListener("click", () => {
  document.querySelector("#search-results").innerHTML = "";
  (document.getElementById("search") as HTMLInputElement).value = "";
});

export async function displayRoom(room: IRoom) {
  if (room === null) {
    document.getElementById("waiting").style.display = "block";
    document.querySelector("section").style.display = "none";
    return
  };
  if (JSON.stringify(room) === JSON.stringify(oldRoom)) {
    return;
  }
  document.getElementById("waiting").style.display = "none";
  (document.querySelector(".loader") as HTMLDivElement).style.display = "none";
  document.getElementById("room").style.visibility = "visible";
  oldRoom = room;
  isMaster = room.master.id === user.id;
  const tracklistElt = document.querySelector(".tracklist") as HTMLDivElement;
  const trackElts = room.tracks.map((track) => trackBuilder(track));
  (document.getElementById("add-songs") as HTMLDivElement).style.display = "none";
  tracklistElt.innerHTML = trackElts.join("");
  if (tracklistElt.innerHTML === "") {
    (document.getElementById("add-songs") as HTMLDivElement).style.display = "block";
  }

  const currentEltIndex = room.tracks.findIndex(t => t.current);
  tracklistElt.scrollTo({ top: 79 * currentEltIndex - 2, behavior: 'smooth' });

  const membersListElt = document.querySelector(".members") as HTMLDivElement;
  const membersToAppoveListElt = document.querySelector(".members-to-approve") as HTMLDivElement;
  const memberElts = room.members.filter(m => m.isActive && m.isApproved).map((member) => `<li class="member">${member.name}</li>`);
  const memberToApproveElts = room.members.filter(m => !m.isApproved).map((member) => `<li class="member member-to-approve" data-id="${member.id}">${member.name}</li>`);
  const masterElt = masterBuilder(room.master);
  membersListElt.innerHTML = masterElt + memberElts.join("");
  membersToAppoveListElt.innerHTML = isMaster ? memberToApproveElts.join("") : "";
  document.getElementById("room-name").textContent = room.name;
  document.getElementById("room-id").textContent = `https://rooom.click/?id=${room.id}`;

  document.querySelectorAll(".track").forEach((elt) => {
    elt.addEventListener("click", async function (e) {
      if (!isMaster) return;
      const { uri, approved } = this.dataset;
      if (approved === "true") {
        try {
          const room = (await axios.get(`/room/go-to/${roomId}?userId=${user.id}&uri=${uri}`)).data.room;
          isPlaying = true;
          document.getElementById("play").textContent = "pause";
          displayRoom(room);
        } catch (error) {
          console.log("There was an error going to a track");
        }
      } else {
        try {
          const room = (await axios.get(`/room/approve/${roomId}?userId=${user.id}&uri=${uri}`)).data.room;
          displayRoom(room);
        } catch (err) {
          console.log("There was an error approving to a track");
        }
      }
    });
  });

  document.querySelectorAll(".remove-track").forEach((elt) => {
    elt.addEventListener("click", async function (e) {
      e.stopPropagation();
      if (!isMaster) return;
      try {
        const { uri } = this.dataset;
        const room = (await axios.delete(`/room/remove/${roomId}?userId=${user.id}&uri=${uri}`)).data.room;
        displayRoom(room);
      } catch (error) {
        console.log("There was an error removing a track");
      }
    });
  })

  document.querySelectorAll(".member-to-approve").forEach((elt) => {
    elt.addEventListener("click", async function (e) {
      if (!isMaster) return;
      const { id } = this.dataset;
      try {
        const room = (await axios.get(`/room/approve-member/${roomId}?userId=${user.id}&memberId=${id}`)).data.room;
        displayRoom(room);
      } catch (err) {
        console.log("There was an error approving a member");
      }
    });
  });

  document.querySelectorAll(".room-block").forEach((elt: HTMLDivElement) => {
    elt.style.display = "block";
  });

  const currentTrack = room.tracks[currentEltIndex]
  if (currentTrack) {
    document.title = `${room.name} | ${currentTrack.name} - ${currentTrack.artists.join(", ")}`;
  }

  setTimeout(() => {
    const userElt = (document.querySelector(".user-container") as HTMLDivElement);
    userElt.style.visibility = "visible";
  }, 1000);
}

let token: string;
let user;
let roomId: string;
let deviceId: string;
let isMaster: boolean = false;
let oldRoom;
let isPlaying = false;

document.getElementById("play").addEventListener("click", async (e: MouseEvent) => {
  try {
    let r;
    if (isPlaying) {
      r = (await axios.post(`/room/pause/${roomId}/?userId=${user.id}&deviceId=${deviceId}`)).data.room;
      //@ts-ignore
      e.target.innerHTML = "play";
    } else {
      r = (await axios.post(`/room/play/${roomId}/?userId=${user.id}&deviceId=${deviceId}`)).data.room;
      //@ts-ignore
      e.target.innerHTML = "pause";
    }
    isPlaying = !isPlaying;
    displayRoom(r);
  } catch (error) {
    console.log("There was problem playing the track", error);
  }
});

document.getElementById("playlist").addEventListener("click", async (e: MouseEvent) => {
  try {
    const room = await getRoom(roomId, user.id);
    const uris = room.tracks.filter(t => t.approved).map(t => t.uri);
    const name = room.name;
    await axios.post(`/spotify/generate-playlist/?token=${token}`, { uris, userId: user.id, name });

    displayRoom(room);
  } catch (error) {
    console.log("There was problemcreating the playlist", error);
  }
});

document.getElementById("search").addEventListener("click", (e: MouseEvent) => {
  e.stopPropagation();
});

document.getElementById("search").addEventListener('keyup', debounce(async (e: KeyboardEvent) => {
  //@ts-ignore
  const q = e.target.value;
  const searchResultElt = document.getElementById("search-results");
  if (!q) {
    return searchResultElt.innerHTML = "";
  }
  try {
    const result = (await axios.get(`/spotify/search?token=${token}&query=${q}`)).data as { tracks: { href: string; items: ISpotifyTrack[] } };
    const resultElts = result.tracks.items.sort((a, b) => b.popularity - a.popularity).map((track) => {
      return searchResultBuilder({
        uri: track.uri,
        name: track.name,
        artists: track.artists,
        image: track.album.images[0].url
      });
    });
    searchResultElt.innerHTML = resultElts.join("");
    document.querySelectorAll(".track-search-result-item").forEach((elt) => {
      elt.addEventListener("click", async function (e: MouseEvent) {
        e.stopPropagation();
        const { uri, name, artists, image } = this.dataset;
        try {
          const room = (await axios.post(`/room/add-track/${roomId}`, {
            uri, name, artists: artists.split(","), image, userId: user.id,
          })).data.room;
          displayRoom(room);
        } catch (err) {
          console.log("There was a problem adding a song to the room");
        }
      });
    });
  } catch (err) {
    console.log(err);
    console.log("There was an error getting the search result from spotify");
  }
}, 500));

document.querySelectorAll(".track-search-result-item").forEach((elt) => {
  elt.addEventListener
});

document.getElementById("create").addEventListener("click", async (e: MouseEvent) => {
  try {
    const roomName = (document.getElementById("create-room-name") as HTMLInputElement).value;
    await axios.post(`/room/create/`, {
      token,
      userId: user.id,
      deviceId,
      name: roomName,
    });
    window.location.reload();
  } catch (error) {
    console.log("There was problem creating the room", error);
  }
});

document.getElementById("leave").addEventListener("click", async (e: MouseEvent) => {
  try {
    await axios.put(`/room/leave/${roomId}?&userId=${user.id}`);
    window.location.reload();
  } catch (error) {
    console.log("There was problem leaving the room", error);
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
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split("=");
    cookies[(pair[0] + '').trim()] = unescape(pair.slice(1).join('='));
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
  if (roomId && roomId !== "null") {
    try {
      await axios.put(`/room/join/${roomId}?token=${token}&userId=${user.id}&deviceId=${deviceId}`);
    } catch (error) {
      console.log("There was an error when joining a rooom", error);
      return;
    }
    const room = await getRoom(roomId, user.id);
    displayRoom(room);
    document.getElementById("get-in-room").style.display = "none";
    setInterval(async () => {
      const room = await getRoom(roomId, user.id);
      displayRoom(room);
    }, 10 * 1000);
  } else {
    document.getElementById("get-in-room").style.display = "block";
    (document.querySelector(".loader") as HTMLDivElement).style.display = "none";
  }
  document.getElementById("user").innerHTML = userBuilder(user);
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

  player.addListener('player_state_changed', debounce(async (state: ISpotifyWebPlaybackState) => {
    if (state.paused && isPlaying) {
      try {
        const room = (await axios.get(`/room/next/${roomId}/?userId=${user.id}`)).data.room;
        displayRoom(room);
      } catch (error) {
        console.log("There was a problem moving to the next track");
      }
    }
    console.log(state);
  }, 2000));

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

setInterval(() => {
  main();
}, 30 * 60 * 1000);
