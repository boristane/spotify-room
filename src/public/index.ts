import axios from "axios";
import "babel-polyfill";
import { IRoom } from "../models/room";
import { ISpotifyTrack, ISpotifyUser } from "../typings/spotify";
import { userBuilder, hostBuilder, trackBuilder, searchResultBuilder, recommendationBuilder } from "./builders";
import { IUser } from "../models/user";

let token: string;
let user: IUser;
let roomId: string;
let deviceId: string;
let isHost: boolean = false;
let oldRoom: IRoom;
let isPlaying = false;
let isOnboarded = false;
let refreshRoomTimeoutId;
const browserNotSupportedHtml = "<p>whoops! rooom is not available on your browser. please try using the latest version of <a href='https://www.mozilla.org'>Mozilla Firefox</a> or <a href='https://www.google.com/chrome/'>Google Chrome</a>, preferably on desktop/laptop.</p>";

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

let w;

function startWorker() {
  if (typeof (Worker) !== "undefined") {
    if (typeof (w) == "undefined") {
      w = new Worker("worker.ts");
    }
    w.onmessage = function (event) {
      if (event.data.room) {
        return displayRoom(event.data.room);
      }
      if (event.data.message) {
        return displayMessage(event.data.message);
      }
    };
  } else {
    displayPermanentMessage(browserNotSupportedHtml);
  }
}

function stopWorker() {
  w.terminate();
  w = undefined;
}

startWorker();

async function getToken() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  let refreshToken = localStorage.getItem("refreshToken");
  let token;
  if (!refreshToken) {
    const { access_token, refresh_token } = (await axios.get(
      `/spotify/get-token/?code=${code}&state=${state}`
    )).data;
    localStorage.setItem("refreshToken", refreshToken);
    token = access_token;
    refreshToken = refresh_token;
  } else {
    const { access_token } = (await axios.get(
      `/spotify/refresh-token/?refresh_token=${refreshToken}`
    )).data;
    token = access_token;
  }
  w.postMessage({ refreshToken });
  return token;
}

async function refreshRoomToken() {
  token = await getToken();
  try {
    await axios.put(`/room/join/?id=${roomId}&token=${token}&userId=${user.id}&deviceId=${deviceId}`);
  } catch (error) {
    displayMessage("there was an error when refreshing the token of the rooom");
    return;
  }
}

export async function getRoom(roomId: string, userId: string): Promise<IRoom> {
  try {
    return (await axios.get(`/room/?id=${roomId}&userId=${userId}`)).data.room as IRoom;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return null;
    }
    displayMessage("there was a problem getting the rooom");
    console.log("there was a problem getting the room", err);
  }
}

export async function checkUsers(roomId: string, userId: string): Promise<IRoom> {
  try {
    return (await axios.get(`/room/check/?id=${roomId}&userId=${userId}`)).data.room as IRoom;
  } catch (err) {
    return null;
  }
}

document.querySelector("body").addEventListener("click", () => {
  document.querySelector("#search-results").innerHTML = "";
  (document.getElementById("search") as HTMLInputElement).value = "";
  (document.querySelector(".search-results-container") as HTMLDivElement).style.display = "none";
  (document.querySelector(".user-container") as HTMLDivElement).style.gridTemplateColumns = "calc(100% - 400px) 100px 300px";
  (document.querySelector(".user-container") as HTMLDivElement).style.right = "20px";
  (document.querySelector(".button-container") as HTMLDivElement).style.height = "0px";
  (document.querySelector(".button-container") as HTMLDivElement).style.padding = "0px";
  isSearchTrayOpened = false;
});

let isSearchTrayOpened = false;

document.getElementById("more").addEventListener("click", (e) => {
  e.stopPropagation();
  if (!isSearchTrayOpened) {
    (document.querySelector(".button-container") as HTMLDivElement).style.height = "50px";
    (document.querySelector(".button-container") as HTMLDivElement).style.padding = "10px";
  } else {
    (document.querySelector(".button-container") as HTMLDivElement).style.height = "0px";
    (document.querySelector(".button-container") as HTMLDivElement).style.padding = "0px";
  }
  isSearchTrayOpened = !isSearchTrayOpened;
});

let isUsersTrayOpened = false;

document.getElementById("show-users-button").addEventListener("click", (e) => {
  if (!isUsersTrayOpened) {
    // @ts-ignore
    e.target.style.left = "260px";
    (document.querySelector(".small-room") as HTMLDivElement).style.gridTemplateColumns = "100% 0";
    (document.querySelector(".left-panel") as HTMLDivElement).style.visibility = "visible";
    (document.querySelector(".right-panel") as HTMLDivElement).style.display = "none";
  } else {
    // @ts-ignore
    e.target.style.left = "10px";
    (document.querySelector(".small-room") as HTMLDivElement).style.gridTemplateColumns = "0px calc(100%)";
    (document.querySelector(".left-panel") as HTMLDivElement).style.visibility = "hidden";
    (document.querySelector(".right-panel") as HTMLDivElement).style.display = "block";

  }
  isUsersTrayOpened = !isUsersTrayOpened;
});

document.getElementById("yes-email").addEventListener("click", (e) => {
  e.stopPropagation();
  // @ts-ignore
  gtag('event', "accept-emails", {
    event_category: "user",
  });
  try {
    axios.put(`/user/email-subscription/?id=${user.id}`, { isEmailSubscriber: true });
    displayMessage("you have been added to the mailing list 📧")
  } catch (e) {
    displayMessage("there was a problem adding you to the mailing list, please try again");
  } finally {
    closeModals();
  }
});

document.getElementById("no-email").addEventListener("click", (e) => {
  e.stopPropagation();
  // @ts-ignore
  gtag('event', "reject-emails", {
    event_category: "user",
  });
  try {
    axios.put(`/user/email-subscription/?id=${user.id}`, { isEmailSubscriber: false });
  } catch (e) {
    return;
  } finally {
    closeModals();
  }
});

export function displayRoom(room: IRoom): boolean {
  const waitingElt = document.getElementById("waiting");
  if (room === null) {
    displayPermanentMessage("<p>waiting to be added to the rooom by the host...</p>");
    document.querySelector("section").style.display = "none";
    return
  };
  if (JSON.stringify(room) === JSON.stringify(oldRoom)) {
    return false;
  }
  waitingElt.style.display = "none";
  (document.querySelector(".loader") as HTMLDivElement).style.display = "none";
  document.getElementById("room").style.display = "block";
  oldRoom = room;
  isHost = room.master.id === user.id;
  if (!isOnboarded && !isHost) {
    displayModalUnboardingMember(room);
    isOnboarded = true;
  }
  if (!isOnboarded && isHost) {
    displayModalUnboardingMaster(room);
    isOnboarded = true;
  }
  const tracklistElt = document.querySelector(".tracklist") as HTMLDivElement;
  const trackElts = room.tracks.map((track) => trackBuilder(track, isHost));
  (document.getElementById("add-songs") as HTMLDivElement).style.display = "none";
  tracklistElt.innerHTML = trackElts.join("");
  if (tracklistElt.innerHTML === "") {
    (document.getElementById("add-songs") as HTMLDivElement).style.display = "block";
  }

  const currentEltIndex = room.tracks.findIndex(t => t.current);
  tracklistElt.parentElement.scrollTo({ top: 79 * currentEltIndex, behavior: 'smooth' });

  const membersListElt = document.querySelector(".members") as HTMLDivElement;
  const membersToAppoveListElt = document.querySelector(".members-to-approve") as HTMLDivElement;
  const memberElts = room.members.filter(m => m.isApproved).map((member) => `<li class="member ${member.isActive ? "active" : "inactive"}">${member.name}</li>`);
  const memberToApproveElts = room.members.filter(m => !m.isApproved).map((member) => `<li class="member member-to-approve" data-id="${member.id}" data-name="${member.name}">${member.name}</li>`);
  const hostElt = hostBuilder(room.master);
  membersListElt.innerHTML = hostElt + memberElts.join("");
  membersToAppoveListElt.innerHTML = isHost ? memberToApproveElts.join("") : "";
  (document.getElementById("members-to-approve-header") as HTMLDivElement).style.display = (memberToApproveElts.length > 0 && isHost) ? "block" : "none";
  document.getElementById("room-name").textContent = room.name;
  const numTracks = room.tracks.filter(t => t.approved).length;
  document.getElementById("host").innerHTML = `<span>created by ${room.master.name} - ${numTracks} track${numTracks > 1 ? "s" : ""}</span>`;
  document.getElementById("room-id").textContent = `https://rooom.click/?id=${room.id}`;

  document.querySelectorAll(".copy-to-clipboard").forEach(elt => {
    elt.addEventListener("click", (e: MouseEvent) => {
      // @ts-ignore
      gtag('event', "invite-friends", {
        event_category: "copy",
      });
      const inputElt = document.getElementById("text-to-copy") as HTMLInputElement;
      inputElt.value = document.getElementById("room-id").textContent;
      inputElt.select();
      inputElt.setSelectionRange(0, 99999);
      document.execCommand("copy");
      inputElt.blur();
      displayMessage("rooom url copied to clipboard");
    });
  });
 
  document.querySelectorAll(".track").forEach((elt) => {
    elt.addEventListener("click", async function (e) {
      if (!isHost) {
        // @ts-ignore
        gtag('event', "play-track", {
          event_category: "track",
          event_label: "non-host"
        });
        displayMessage("Only the rooom host can skip tracks 😅");
        return;
      };
      const { uri, approved } = this.dataset;
      if (approved === "true") {
        // @ts-ignore
        gtag('event', "play-track", {
          event_category: "track",
          event_label: "host"
        });
        let success = false;
        const maxNumAttempts = 5;
        let numAttempts = 0;
        while (!success && numAttempts < maxNumAttempts) {
          try {
            const room = (await axios.get(`/room/go-to/?id=${roomId}&userId=${user.id}&uri=${uri}`)).data.room;
            isPlaying = true;
            w.postMessage({ startPlaying: true });
            document.querySelectorAll(".play").forEach(elt => elt.textContent = "pause");
            displayRoom(room);
            success = true;
          } catch (error) {
            console.log("there was an error going to a track");
            await refreshRoomToken();
          }
          numAttempts += 1;
        }
        if (!success) {
          displayMessage("there was an error going to this track");
        }
      } else {
        // @ts-ignore
        gtag('event', "approve-track", {
          event_category: "track",
        });
        try {
          const room = (await axios.get(`/room/approve/?id=${roomId}&userId=${user.id}&uri=${uri}`)).data.room;
          displayMessage("This track has been approved in the rooom");
          displayRoom(room);
          const recommendations = await getRecommendations(room);
          displayRecommendations(recommendations);
        } catch (err) {
          displayMessage("there was an error approving to this track");
          console.log("there was an error approving to a track");
        }
      }
    });
  });

  document.querySelectorAll(".remove-track").forEach((elt) => {
    elt.addEventListener("click", async function (e) {
      e.stopPropagation();
      // @ts-ignore
      gtag('event', "remove-track", {
        event_category: "track",
      });
      if (!isHost) return;
      try {
        const { uri } = this.dataset;
        const room = (await axios.delete(`/room/remove/?id=${roomId}&userId=${user.id}&uri=${uri}`)).data.room;
        displayMessage("This track has been removed from the rooom");
        displayRoom(room);
        const recommendations = await getRecommendations(room);
        displayRecommendations(recommendations);
      } catch (error) {
        displayMessage("there was an error removing this track");
        console.log("there was an error removing a track");
      }
    });
  })

  document.querySelectorAll(".member-to-approve").forEach((elt) => {
    elt.addEventListener("click", async function (e) {
      // @ts-ignore
      gtag('event', "approve", {
        event_category: "user",
        event_label: isHost ? "host" : "non-host",
      });
      if (!isHost) return;
      const { id, name } = this.dataset;
      try {
        const room = (await axios.get(`/room/approve-member/?id=${roomId}&userId=${user.id}&memberId=${id}`)).data.room;
        displayMessage(`Lest's welcome ${name} to the rooom! 🎉`);
        displayRoom(room);
      } catch (err) {
        if (err.response && err.response.status === 422) {
          displayMessage("Too many members in the rooom");
          return console.log("Too many members in the rooom");
        }
        displayMessage("there was an error approving this member");
        console.log("there was an error approving a member");
      }
    });
  });

  document.querySelectorAll(".room-block").forEach((elt: HTMLDivElement) => {
    elt.style.display = "block";
  });

  const currentTrack = room.tracks[currentEltIndex]
  if (currentTrack) {
    document.title = `${currentTrack.name} - ${currentTrack.artists.join(", ")} | ${room.name} `;
  }

  if (isHost && room.members.filter(m => !m.isApproved).length > 0) {
    displayMessage("there are members in the queue waiting for your approval");
  }

  setTimeout(() => {
    const userElt = (document.querySelector(".user-container") as HTMLDivElement);
    (document.querySelector("#show-users-button") as HTMLDivElement).style.visibility = "visible";
    userElt.style.visibility = "visible";
  }, 1000);

  return true;
}

function displayRecommendations(recommendations: ISpotifyTrack[]) {
  const tracklistElt = document.querySelector(".recommendations") as HTMLDivElement;
  const trackElts = recommendations.map((track) => recommendationBuilder(track));
  tracklistElt.innerHTML = trackElts.join("");
  addEventsToRecommendations();
}

function addEventsToRecommendations() {
  document.querySelectorAll(".add-track").forEach((elt, index) => {
    elt.addEventListener("click", async function (e: MouseEvent) {
      e.stopPropagation();
      // @ts-ignore
      gtag('event', "add-track", {
        event_category: "track",
        event_label: "recommendations",
      });
      const room = await addTrackToRoom(this);
      const recommendations = await getRecommendations(room);
      const li = this.parentElement.parentElement;
      const parent = li.parentElement
      parent.removeChild(parent.childNodes[index]);
      parent.innerHTML += recommendationBuilder(recommendations[0]);
      addEventsToRecommendations();
    });
  });
}

document.querySelectorAll(".play").forEach(elt => elt.addEventListener("click", async (e: MouseEvent) => {
  const analyticsLabel = isPlaying ? "pause-button" : "play-button"
  // @ts-ignore
  gtag('event', analyticsLabel, {
    event_category: "player",
    value: isPlaying ? 1 : 0,
  });

  try {
    let r: IRoom;
    if (isPlaying) {
      r = (await axios.post(`/room/pause/?id=${roomId}&userId=${user.id}&deviceId=${deviceId}`)).data.room;
      document.querySelectorAll(".play").forEach(elt => elt.innerHTML = "play");
      w.postMessage({ stopPlaying: true });
    } else {
      r = (await axios.post(`/room/play/?id=${roomId}&userId=${user.id}&deviceId=${deviceId}`)).data.room;
      document.querySelectorAll(".play").forEach(elt => elt.innerHTML = "pause");
      w.postMessage({ startPlaying: true });
    }
    isPlaying = !isPlaying;
    displayRoom(r);
  } catch (error) {
    displayMessage("there was problem playing the track");
    console.log("there was problem playing the track", error);
  }
}));

document.getElementById("playlist").addEventListener("click", async (e: MouseEvent) => {
  // @ts-ignore
  gtag('event', "create-playlist", {
    event_category: "player",
    value: 1,
  });
  try {
    const room = await getRoom(roomId, user.id);
    const uris = room.tracks.filter(t => t.approved).map(t => t.uri);
    const name = room.name;
    await axios.post(`/spotify/generate-playlist/?token=${token}`, { uris, userId: user.id, name });
    displayMessage("Playlist succesfully created 🥳 ! Check your Spotify account !");
    displayRoom(room);
  } catch (error) {
    displayMessage("there was problem creating the playlist");
    console.log("there was problem creating the playlist", error);
  }
});

document.getElementById("search").addEventListener("click", (e: MouseEvent) => {
  e.stopPropagation();
  (document.querySelector(".user-container") as HTMLDivElement).style.gridTemplateColumns = "calc(100% - 420px) 100px 320px";
});

document.getElementById("search").addEventListener('keyup', debounce(async (e: KeyboardEvent) => {
  //@ts-ignore
  const q = e.target.value;
  const searchResultContainer = document.querySelector(".search-results-container") as HTMLDivElement;
  const searchResultElt = document.getElementById("search-results");
  if (!q) {
    searchResultElt.innerHTML = "";
    return (document.querySelector(".search-results-container") as HTMLDivElement).style.display = "none";
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
    searchResultContainer.style.display = "block";
    document.querySelectorAll(".track-search-result-item").forEach((elt) => {
      elt.addEventListener("click", async function (e: MouseEvent) {
        e.stopPropagation();
        // @ts-ignore
        gtag('event', "add-track", {
          event_category: "track",
          event_label: "search",
        });
        const room = await addTrackToRoom(this);
        const recommendations = await getRecommendations(room);
        displayRecommendations(recommendations);
      });
    });
  } catch (err) {
    displayMessage("there was a problem getting your search results");
    console.log("there was an error getting the search result from spotify", err);
  }
}, 500));

document.querySelectorAll(".track-search-result-item").forEach((elt) => {
  elt.addEventListener
});

document.getElementById("create").addEventListener("click", async (e: MouseEvent) => {
  // @ts-ignore
  gtag('event', "create-room", {
    event_category: "room",
  });
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
    displayMessage("there was a problem creating the rooom 😥");
    console.log("there was problem creating the room", error);
  }
});

document.getElementById("leave").addEventListener("click", async (e: MouseEvent) => {
  // @ts-ignore
  gtag('event', "logout", {
    event_category: "user",
  });
  await leaveRoom();
});

async function leaveRoom() {
  w.postMessage({ stopPlaying: true });
  stopWorker();
  try {
    await axios.put(`/room/leave/?id=${roomId}&userId=${user.id}`);
    window.location.reload();
  } catch (error) {
    displayMessage("there was problem leaving the room");
    console.log("there was problem leaving the room", error);
  }
}

async function main() {
  document.querySelectorAll("input").forEach(elt => {
    elt.value = ""
  });
  try {
    token = await getToken();
  } catch {
    displayPermanentMessage("<p>there was an issue getting your authentication token, please try again.</p>");
    return;
    // return window.location.replace("/");
  }

  document.querySelector("body").addEventListener("click", (e) => {
    closeModals();
  });

  document.querySelectorAll(".modal-content").forEach(elt => {
    (elt as HTMLDivElement).addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });

  document.querySelectorAll(".modal .close").forEach(elt => {
    elt.addEventListener("click", (e) => {
      e.stopPropagation();
      closeModals();
    });
  });
}

function closeModals() {
  document.querySelectorAll(".modal").forEach(elt => {
    (elt as HTMLDivElement).style.display = "none";
  });
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

async function getRecommendations(room: IRoom): Promise<ISpotifyTrack[]> {
  if (!room) return [];
  try {
    const indices = [0, 1, 2, 3, 4].map((_) => Math.floor(Math.random() * room.tracks.length));
    const uris = room.tracks.filter((a, index, arr) => indices.indexOf(index) > -1).map(t => t.uri);
    const tracks = (await axios.put(`/spotify/recommendations/?token=${token}`, { uris })).data;
    return tracks;
  } catch (err) {
    console.log("Error getting the recommendations", err);
    displayMessage("there was an issue getting the track recommendations");
  }
}

async function addTrackToRoom(elt: HTMLElement): Promise<IRoom> {
  const { uri, name, artists, image } = elt.dataset;
  const uris = oldRoom.tracks.map(t => t.uri);
  if (uris.indexOf(uri) >= 0) {
    displayMessage("This track is already in the rooom");
    return;
  }
  try {
    const room = (await axios.post(`/room/add-track/?id=${roomId}`, {
      uri, name, artists: artists.split(","), image, userId: user.id,
    })).data.room as IRoom;
    displayMessage("track added to the room!");
    displayRoom(room);
    if (room.tracks.filter((track) => track.addedBy === user.display_name).length === 1) {
      setTimeout(() => {
        displayModalRoomIsBetter(room);
      }, 0.5 * 60 * 1000);
    }
    return room;
  } catch (err) {
    displayMessage("there was a problem adding a track to the room");
  }
}

function displayExistingRooms(rooms: IRoom[]) {
  const roomElts = rooms.length > 0 ? rooms.slice(0, 5).map(room => {
    return `
    <div class="existing-room" data-id=${room.id}>
    <div class="room-image-container">
      <img class="room-image" src="https://d1apvrodb6vxub.cloudfront.net/rooom.png"/>
    </div>
      <div class="room-name">
        ${room.name}
      </div>
      <div class="room-details">
        <p>by ${room.master.name} - ${room.tracks.filter(track => track.approved && !track.removed).length} track(s)</p>
      </div>
    </div>
    `;
  }).join("") : "<div></div><div></div><div style='text-aling: center'>none found</div><div></div><div></div>";
  document.getElementById("existing-rooms").innerHTML = roomElts;
  document.querySelectorAll(".existing-room").forEach((elt => {
    elt.addEventListener("click", async function (e) {
      // @ts-ignore
      gtag('event', "join-existing-room", {
        event_category: "room",
        event_label: "menu"
      });
      const { id } = this.dataset;
      roomId = id;
      document.cookie = `rooom_id=${id}`;
      await getInRoom(id);
    });
  }));
}

async function getInRoom(id: string) {
  w.postMessage({ roomId: id, userId: user.id });
  if (refreshRoomTimeoutId) {
    this.clearTimeout(refreshRoomTimeoutId);
  }
  refreshRoomLoop();

  document.getElementById("get-in-room").style.display = "none";
  (document.querySelector(".loader") as HTMLDivElement).style.display = "block";
  (document.querySelector("body")).style.overflow = "hidden";
  try {
    await axios.put(`/room/join/?id=${id}&token=${token}&userId=${user.id}&deviceId=${deviceId}`);
  } catch (error) {
    displayMessage("there was an error when joining the rooom");
    displayPermanentMessage("<p>there was an error when joining the rooom. please retry.</p>")
    return;
  }
  const room = await getRoom(id, user.id);
  displayRoom(room);
  const recommendations = await getRecommendations(room);
  displayRecommendations(recommendations);
  document.getElementById("get-in-room").style.display = "none";
  (document.querySelector(".loader") as HTMLDivElement).style.display = "none";
  addEventListeners(id);

  setTimeout(() => {
    if (isHost) {
      setInterval(async () => {
        const room = await checkUsers(id, user.id);
        displayRoom(room);
      }, 5 * 60 * 1000);
    }
  }, 10 * 1000);

  setInterval(() => {
    refreshRoomToken();
  }, 30 * 60 * 1000);

  window.addEventListener('beforeunload', async (event) => {
    leaveRoom();
    event.returnValue = '';
    return "";
  });
}

function displayModalUnboardingMember(room: IRoom) {
  const modal = document.getElementById("onboarding-member") as HTMLDivElement;
  document.querySelectorAll(".modal-room-host").forEach((elt) => {
    elt.textContent = room.master.name;
  });
  document.querySelectorAll(".modal-room-name").forEach((elt) => {
    elt.textContent = room.name;
  });
  document.querySelectorAll(".modal-user-name").forEach((elt) => {
    elt.textContent = user.display_name;
  });
  modal.style.display = "flex";
}

function displayModalUnboardingMaster(room: IRoom) {
  const modal = document.getElementById("onboarding-host") as HTMLDivElement;
  document.querySelectorAll(".modal-room-host").forEach((elt) => {
    elt.textContent = room.master.name;
  });
  document.querySelectorAll(".modal-room-name").forEach((elt) => {
    elt.textContent = room.name;
  });
  document.querySelectorAll(".modal-user-name").forEach((elt) => {
    elt.textContent = user.display_name;
  });
  modal.style.display = "flex";
}

function displayModalRoomIsBetter(room: IRoom) {
  const modal = document.getElementById("room-is-better-with-friends") as HTMLDivElement;
  document.querySelectorAll(".modal-room-name").forEach((elt) => {
    elt.textContent = room.name;
  });
  const inputElt = document.getElementById("text-to-copy-3") as HTMLInputElement;
  inputElt.value = document.getElementById("room-id").textContent;
  modal.style.display = "flex";
}

function addEventListeners(id: string) {
  document.getElementById("send-email-invites-1").addEventListener("click", async (e: MouseEvent) => {
    // @ts-ignore
    gtag('event', "invite-friends", {
      event_category: "email",
      event_label: "invinte-friends-button"
    });
    const inputElt = document.getElementById("email-invites-1") as HTMLInputElement;
    const data = (inputElt.value.split(",").map(elt => elt.split(" "))).reduce((acc, val) => acc.concat(val), []).filter(elt => elt !== "");
    try {
      await axios.post(`/room/email-invite/?id=${id}&userId=${user.id}`, { emails: data });
      inputElt.value = "";
      closeModals();
      displayMessage("email invite(s) sent");
    } catch (err) {
      displayMessage("there was an error sending the email invite(s)");
    }
  });

  document.getElementById("send-email-invites-2").addEventListener("click", async (e: MouseEvent) => {
    // @ts-ignore
    gtag('event', "invite-friends", {
      event_category: "email",
      event_label: "room-is-better-with-friends"
    });
    const inputElt = document.getElementById("email-invites-2") as HTMLInputElement;
    const data = (inputElt.value.split(",").map(elt => elt.split(" "))).reduce((acc, val) => acc.concat(val), []).filter(elt => elt !== "");
    try {
      await axios.post(`/room/email-invite/?id=${id}&userId=${user.id}`, { emails: data });
      inputElt.value = "";
      closeModals();
      displayMessage("email invite(s) sent");
    } catch (err) {
      displayMessage("there was an error sending the email invite(s)");
    }
  });

  document.getElementById("invite-friends").addEventListener("click", (e) => {
    e.stopPropagation();
    // @ts-ignore
    gtag('event', "share-room", {
      event_category: "room",
      event_label: "invite"
    });
    const inputElt = document.getElementById("text-to-copy-2") as HTMLInputElement;
    inputElt.value = document.getElementById("room-id").textContent;
    const modal = document.getElementById("invite-friends-modal");
    modal.style.display = "flex";
  });

  document.getElementById("refresh-recommendations").addEventListener("click", async () => {
    // @ts-ignore
    gtag('event', "refresh-recommendations", {
      event_category: "room",
      event_label: "recommendations",
    });
    const room = await getRoom(id, user.id);
    const recommendations = await getRecommendations(room);
    displayRecommendations(recommendations);
  });

  document.getElementById("twitter-share").addEventListener("click", async(e) => {
    e.preventDefault();
		const tweet = "Join my remote music listening session!";
    tweetIt(tweet, `https://rooom.click?id=${id}`);
  });

  document.getElementById("facebook-share").addEventListener("click", async(e) => {
    e.preventDefault();
    shareOnFacebook(`https://rooom.click?id=${id}`);
  });
}

export async function doIt() {
  let id;
  try {
    const spotifyUser = (await axios.get(`/spotify/me/?token=${token}`)).data.user as ISpotifyUser;
    if (spotifyUser.product !== "premium") {
      displayPermanentMessage("<p>unfortunately rooom is available only for <a href='https://www.spotify.com/uk/premium/'>Spotify Premium</a> users</p>");
      return;
    }
    id = spotifyUser.id;
  } catch {
    displayPermanentMessage("<p>there was an issue getting your profile from Spotify, please try again.</p>");
    return;
  }

  user = (await axios.get(`/user/me/?id=${id}`)).data.user as IUser;
  if (user.isEmailSubscriber === undefined) {
    setTimeout(() => {
      const elt = document.getElementById("ask-for-email") as HTMLDivElement;
      elt.style.display = "flex";
    }, 1 * 60 * 1000);
  }

  roomId = getCookies()["rooom_id"];
  if (roomId && roomId !== "null") {
    // @ts-ignore
    gtag('event', "join-existing-room", {
      event_category: "room",
      event_label: "cookie"
    });
    await getInRoom(roomId);
  } else {
    let roomUser = { rooms: [] };
    try {
      roomUser = (await axios.get(`/room/user/?id=${user.id}`)).data.user as { rooms: IRoom[] };
    } catch (error) {
      console.log("there was an issue loading your existing rooms");
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
    name: 'rooom',
    getOAuthToken: cb => { cb(token); }
  });

  player.addListener('initialization_error', ({ message }) => {
    displayPermanentMessage(browserNotSupportedHtml);
    return;
  });
  player.addListener('authentication_error', ({ message }) => {
    displayPermanentMessage(`<p>whoops! we could not authenticate you from spotify. please refresh the page and retry again.</p>`);
    return;
  });
  player.addListener('account_error', ({ message }) => {
    displayPermanentMessage(`<p>there was an error with your account. please refresh the page.</p>`);
    console.error(message);
  });
  player.addListener('playback_error', ({ message }) => { displayMessage("there was an error with the web player. please refresh the page."); console.error(message); })

  player.addListener('ready', ({ device_id }) => {
    deviceId = device_id;
    w.postMessage({ deviceId });
    doIt();
  });

  player.addListener('not_ready', ({ device_id }) => {
    displayPermanentMessage(`<p>the device with device id ${deviceId} has gone offline. please refresh the page</p>`);
  });

  player.connect();
};


main();

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

function displayPermanentMessage(innerHtml: string) {
  const waitingElt = document.getElementById("waiting");
  waitingElt.innerHTML = innerHtml;
  waitingElt.style.display = "block";
  (document.getElementById("room") as HTMLDivElement).style.display = "none";
  (document.querySelector(".loader") as HTMLDivElement).style.display = "none";
}

async function refreshRoomLoop() {
  try {
    const room = (await axios.get(`/room/?id=${roomId}&userId=${user.id}`)).data.room;
    displayRoom(room);
  } catch (error) {
    console.log(error);
  }
  refreshRoomTimeoutId = setTimeout(refreshRoomLoop, 10 * 1000);
}

function tweetIt(text: string, url:string="", hashtag:string=""){
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  const h = encodeURIComponent(hashtag);
  const tweetUrl = `https://twitter.com/share?text=${t}&url=${u}&hashtags=${h}`;
  window.open(tweetUrl);
}

function shareOnFacebook(url: string) {
  const u = encodeURIComponent(url);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, 'facebook-share-dialog','width=626,height=436');
}