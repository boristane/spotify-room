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

async function refreshRoomToken() {
  token = await getToken();
  try {
    await axios.put(`/room/join/${roomId}?token=${token}&userId=${user.id}&deviceId=${deviceId}`);
  } catch (error) {
    displayMessage("There was an error when refreshing the token of the rooom");
    return;
  }
}

export async function getRoom(roomId: string, userId: string): Promise<IRoom> {
  try {
    return (await axios.get(`/room/${roomId}/?userId=${userId}`)).data.room as IRoom;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return null;
    }
    displayMessage("There was a problem getting the rooom");
    console.log("There was a problem getting the room", err);
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
  const trackElts = room.tracks.map((track) => trackBuilder(track, isMaster));
  (document.getElementById("add-songs") as HTMLDivElement).style.display = "none";
  tracklistElt.innerHTML = trackElts.join("");
  if (tracklistElt.innerHTML === "") {
    (document.getElementById("add-songs") as HTMLDivElement).style.display = "block";
  }

  const currentEltIndex = room.tracks.findIndex(t => t.current);
  tracklistElt.scrollTo({ top: 79 * currentEltIndex, behavior: 'smooth' });

  const membersListElt = document.querySelector(".members") as HTMLDivElement;
  const membersToAppoveListElt = document.querySelector(".members-to-approve") as HTMLDivElement;
  const memberElts = room.members.filter(m => m.isActive && m.isApproved).map((member) => `<li class="member">${member.name}</li>`);
  const memberToApproveElts = room.members.filter(m => !m.isApproved).map((member) => `<li class="member member-to-approve" data-id="${member.id}" data-name="${member.name}">${member.name}</li>`);
  const masterElt = masterBuilder(room.master);
  membersListElt.innerHTML = masterElt + memberElts.join("");
  membersToAppoveListElt.innerHTML = isMaster ? memberToApproveElts.join("") : "";
  document.getElementById("room-name").textContent = room.name;
  const numTracks = room.tracks.filter(t => t.approved).length;
  document.getElementById("mastered-by").innerHTML = `<span>created by ${room.master.name} - ${numTracks} track${numTracks > 1 ? "s" : ""}</span>`;
  document.getElementById("room-id").textContent = `https://rooom.click/?id=${room.id}`;
  document.getElementById("room-id").addEventListener("click", () => {
    const inputElt = document.getElementById("text-to-copy") as HTMLInputElement;
    inputElt.value = document.getElementById("room-id").textContent;
    inputElt.select();
    inputElt.setSelectionRange(0, 99999);
    document.execCommand("copy");
    displayMessage("Room url copied to clipboard");
  });

  document.querySelectorAll(".track").forEach((elt) => {
    elt.addEventListener("click", async function (e) {
      if (!isMaster) {
        displayMessage("Only the rooom master can skip tracks 😅");
        return;
      };
      const { uri, approved } = this.dataset;
      if (approved === "true") {
        let success = false;
        const maxNumAttempts = 5;
        let numAttempts = 0;
        while (!success && numAttempts < maxNumAttempts) {
          try {
            const room = (await axios.get(`/room/go-to/${roomId}?userId=${user.id}&uri=${uri}`)).data.room;
            isPlaying = true;
            document.getElementById("play").textContent = "pause";
            displayRoom(room);
            success = true;
          } catch (error) {
            console.log("There was an error going to a track");
            await refreshRoomToken();
          }
          numAttempts += 1;
        }
        if (!success) {
          displayMessage("There was an error going to this track");
        }
      } else {
        try {
          const room = (await axios.get(`/room/approve/${roomId}?userId=${user.id}&uri=${uri}`)).data.room;
          displayMessage("This track has been approved in the rooom");
          displayRoom(room);
        } catch (err) {
          displayMessage("There was an error approving to this track");
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
        displayMessage("This track has been removed from the rooom");
        displayRoom(room);
      } catch (error) {
        displayMessage("There was an error removing this track");
        console.log("There was an error removing a track");
      }
    });
  })

  document.querySelectorAll(".member-to-approve").forEach((elt) => {
    elt.addEventListener("click", async function (e) {
      if (!isMaster) return;
      const { id, name } = this.dataset;
      try {
        const room = (await axios.get(`/room/approve-member/${roomId}?userId=${user.id}&memberId=${id}`)).data.room;
        displayMessage(`Lest's welcome ${name} to the rooom! 🎉`);
        displayRoom(room);
      } catch (err) {
        displayMessage("There was an error approving this member");
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

  if (isMaster && room.members.filter(m => !m.isApproved).length > 0) {
    displayMessage("There are members in the queue waiting for your approval");
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
let oldRoom: IRoom;
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
    displayMessage("There was problem playing the track");
    console.log("There was problem playing the track", error);
  }
});

document.getElementById("playlist").addEventListener("click", async (e: MouseEvent) => {
  try {
    const room = await getRoom(roomId, user.id);
    const uris = room.tracks.filter(t => t.approved).map(t => t.uri);
    const name = room.name;
    await axios.post(`/spotify/generate-playlist/?token=${token}`, { uris, userId: user.id, name });
    displayMessage("Playlist succesfully created 🥳 ! Check your Spotify account !");
    displayRoom(room);
  } catch (error) {
    displayMessage("There was problem creating the playlist");
    console.log("There was problem creating the playlist", error);
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
        const uris = oldRoom.tracks.map(t => t.uri);
        if (uris.indexOf(uri) >= 0) {
          displayMessage("This track is already in the rooom");
          return;
        }
        try {
          const room = (await axios.post(`/room/add-track/${roomId}`, {
            uri, name, artists: artists.split(","), image, userId: user.id,
          })).data.room;
          displayMessage("Track added to the room!");
          displayRoom(room);
        } catch (err) {
          displayMessage("There was a problem adding a song to the room");
          console.log("There was a problem adding a song to the room");
        }
      });
    });
  } catch (err) {
    displayMessage("There was a problem getting your search results");
    console.log("There was an error getting the search result from spotify", err);
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
    displayMessage("There was a problem creating the rooom 😥");
    console.log("There was problem creating the room", error);
  }
});

document.getElementById("leave").addEventListener("click", async (e: MouseEvent) => {
  await leaveRoom();
});

async function leaveRoom() {
  try {
    await axios.put(`/room/leave/${roomId}?&userId=${user.id}`);
    window.location.reload();
  } catch (error) {
    displayMessage("There was problem leaving the room");
    console.log("There was problem leaving the room", error);
  }
}

async function main() {
  try {
    token = await getToken();
  } catch {
    return window.location.replace("/");
  }
}

function getCookies(): Record<string, string> {
  const pairs = document.cookie.split(";");
  const cookies = {};
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split("=");
    cookies[(pair[0] + '').trim()] = unescape(pair.slice(1).join('='));
  }
  return cookies;
}

async function getRecommendations(room: IRoom) {
  try {
    const tracks = (await axios.put(`/spotify/recommendations/?token=${token}`, { uris: room.tracks.slice(0, 5) })).data;
    console.log(tracks);
    return tracks;
  } catch (err) {
    console.log("Error getting the recommendations", err);
    displayMessage("There was an issue getting the track recommendations");
  }
}

function displayExistingRooms(rooms: IRoom[]) {
  const roomElts = rooms.slice(0, 5).map(room => {
    return `
    <div class="existing-room" data-id=${room.id}>
    <div class="room-image-container">
      <img class="room-image" src="https://boristane-projects-data.s3.eu-west-2.amazonaws.com/lyrically.png"/>
    </div>
      <div class="room-name">
        ${room.name}
      </div>
      <div class="room-details">
        <p>by ${room.master.name} - ${room.tracks.filter(track => track.approved && !track.removed).length} tracks(s)</p>
      </div>
    </div>
    `;
  }).join("");
  document.getElementById("existing-rooms").innerHTML = roomElts;
  document.querySelectorAll(".existing-room").forEach((elt => {
    elt.addEventListener("click", async function (e) {
      const { id } = this.dataset;
      roomId = id;
      document.cookie = `rooom_id=${id}`;
      await getInRoom(id);
    });
  }));
}

async function getInRoom(id: string) {
  try {
    await axios.put(`/room/join/${id}?token=${token}&userId=${user.id}&deviceId=${deviceId}`);
  } catch (error) {
    displayMessage("There was an error when joining the rooom");
    console.log("There was an error when joining a rooom", error);
    return;
  }
  const room = await getRoom(id, user.id);
  displayRoom(room);
  document.getElementById("get-in-room").style.display = "none";
  setInterval(async () => {
    const room = await getRoom(id, user.id);
    displayRoom(room);
  }, 10 * 1000);
}


export async function doIt() {
  try {
    user = (await axios.get(`/spotify/me/?token=${token}`)).data.user;
    if (user.product !== "premium") {
      displayMessage("unfortunately rooom is available only for premium users");
      setTimeout(() => {
        window.location.replace("/");
      }, 4000);
      return;
    }
  } catch {
    return window.location.replace("/");
  }

  roomId = getCookies()["rooom_id"];
  if (roomId && roomId !== "null") {
    await getInRoom(roomId);
  } else {
    let roomUser;
    try {
      roomUser = (await axios.get(`/room/user/${user.id}`)).data.user as { rooms: IRoom[] };
    } catch (error) {
      console.log("There was an issue loading your existing rooms");
    } finally {
      displayExistingRooms(roomUser.rooms);
      document.getElementById("get-in-room").style.display = "block";
      (document.querySelector(".loader") as HTMLDivElement).style.display = "none";
    }
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

  player.addListener('initialization_error', ({ message }) => { displayMessage("rooom is not available on your browser"); console.error(message); });
  player.addListener('authentication_error', ({ message }) => { console.error(message); });
  player.addListener('account_error', ({ message }) => { console.error(message); });
  player.addListener('playback_error', ({ message }) => { displayMessage("there was an error with the playback"); console.error(message); });

  player.addListener('player_state_changed', debounce(async (state: ISpotifyWebPlaybackState) => {
    if (state.paused && isPlaying) {
      let success = false;
      let numAttempts = 0;
      const maxNumAttempts = 5;
      while (!success && numAttempts < maxNumAttempts) {
        try {
          const room = (await axios.get(`/room/next/${roomId}/?userId=${user.id}`)).data.room;
          displayRoom(room);
          success = true;
        } catch (error) {
          console.log("There was a problem moving to the next track");
          await refreshRoomToken();
        }
        numAttempts += 1;
      }
      if (!success) {
        displayMessage("There was a problem moving to the next track");
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
  refreshRoomToken();
}, 30 * 60 * 1000);

let timeoutId;
function displayMessage(message: string) {
  const messageElt = document.getElementById("message") as HTMLDivElement;
  messageElt.textContent = message;
  messageElt.style.bottom = `100px`;
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    messageElt.style.bottom = `-300px`;
  }, 2000);
}
