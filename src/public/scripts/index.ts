import axios from "axios";
import feather from "feather-icons";

import "babel-polyfill";
import { IRoom } from "../../models/room";
import { ISpotifyTrack, ISpotifyUser } from "../../typings/spotify";
import { userBuilder, hostBuilder, trackBuilder, searchResultBuilder, recommendationBuilder, guestBuilder } from "./builders";
import { IUser } from "../../models/user";
import {
  shareOnFacebook,
  tweetIt,
  isIOS,
  debounce,
  closeModals,
  getCookies,
  hideLoader,
  displayLoader,
} from "../utils/utils";
import { setBackground } from "./colors";
import roomApi from "./apis/room";
import userApi from "./apis/user";
import spotifyApi from "./apis/spotify";
import messages from "./messages";

let token: string;
let user: IUser;
let roomId: string;
let deviceId: string;
let isHost: boolean = false;
let oldRoom: IRoom;
let isPlaying = false;
let isOnboarded = false;
let refreshRoomTimeoutId;
let playlistSelectPage = 0;

let w;

function startWorker() {
  if (typeof (Worker) !== "undefined") {
    if (typeof (w) == "undefined") {
      w = new Worker("../workers/worker.ts");
    }
    w.onmessage = function (event) {
      if (event.data.room) {
        return displayRoom(event.data.room);
      }
      if (event.data.message) {
        if (event.data.permanent) {
          return displayPermanentMessage(event.data.message);
        }
        return displayMessage(event.data.message);
      }
      if (event.data.isPlaying) {
        isPlaying = event.data.isPlaying === "true";
        document.querySelectorAll(".play").forEach(elt => elt.innerHTML = isPlaying ? feather.icons["pause"].toSvg() : feather.icons["play"].toSvg());
        return;
      }
    };
  } else {
    displayPermanentMessage(messages.permanent.browserNotSupported);
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
  if (!refreshToken || refreshToken === "null") {
    const { access_token, refresh_token } = (await spotifyApi.getToken(code, state)).data;
    token = access_token;
    refreshToken = refresh_token;
    localStorage.setItem("refreshToken", refreshToken);
  } else {
    const { access_token } = (await spotifyApi.refreshToken(refreshToken)).data;
    token = access_token;
  }
  w.postMessage({ refreshToken });
  return token;
}

async function refreshRoomToken() {
  token = await getToken();
  try {
    await roomApi.refreshTokenInRoom(roomId, user.id, token);
  } catch (error) {
    handleApiException(error, messages.errors.refreshToken);
    return;
  }
}

export async function getRoom(roomId: string, userId: string): Promise<IRoom> {
  try {
    return (await roomApi.getRoom(roomId, userId)).data.room as IRoom;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return null;
    }
    handleApiException(err, messages.errors.gettingTheRoom);
  }
}

export async function checkUsers(roomId: string, userId: string): Promise<IRoom> {
  try {
    return (await roomApi.checkRoom(roomId, userId)).data.room as IRoom;
  } catch (err) {
    return null;
  }
}

document.querySelector("body").addEventListener("click", () => {
  document.querySelector("#search-results").innerHTML = "";
  (document.getElementById("search") as HTMLInputElement).value = "";
  (document.querySelector(".search-results-container") as HTMLDivElement).style.display = "none";
  (document.querySelector(".user-container") as HTMLDivElement).style.right = "0px";
  (document.querySelector(".button-container") as HTMLDivElement).style.height = "0px";
  (document.querySelector(".button-container") as HTMLDivElement).style.padding = "0px";
  isSearchTrayOpened = false;
});

let isSearchTrayOpened = false;

document.getElementById("more").addEventListener("click", (e) => {
  e.stopPropagation();
  if (!isSearchTrayOpened) {
    (document.querySelector(".button-container") as HTMLDivElement).style.height = "100px";
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
    (document.querySelector(".user-container") as HTMLDivElement).style.display = "none";
  } else {
    // @ts-ignore
    e.target.style.left = "10px";
    (document.querySelector(".small-room") as HTMLDivElement).style.gridTemplateColumns = "0px calc(100%)";
    (document.querySelector(".left-panel") as HTMLDivElement).style.visibility = "hidden";
    (document.querySelector(".right-panel") as HTMLDivElement).style.display = "block";
    (document.querySelector(".user-container") as HTMLDivElement).style.display = "flex";
  }
  isUsersTrayOpened = !isUsersTrayOpened;
});

document.getElementById("yes-email").addEventListener("click", async (e) => {
  e.stopPropagation();
  // @ts-ignore
  gtag('event', "accept-emails", {
    event_category: "user",
  });
  try {
    await userApi.addToMailingList(user.id, true);
    displayMessage(messages.infos.addedToTheMailingList);
  } catch (e) {
    handleApiException(e, messages.errors.addedToMailingList);
  } finally {
    closeModals();
  }
});

document.getElementById("no-email").addEventListener("click", async (e) => {
  e.stopPropagation();
  // @ts-ignore
  gtag('event', "reject-emails", {
    event_category: "user",
  });
  try {
    await userApi.addToMailingList(user.id, false);
  } catch (e) {
    return;
  } finally {
    closeModals();
  }
});

document.getElementById("spotify-playlist-next").addEventListener("click", async () => {
  try {
    playlistSelectPage += 1;
    const playlists = (await spotifyApi.getPlaylists(token, user.id, 10, playlistSelectPage)).data;
    document.getElementById("display-playlists").style.display = "flex";
    displayPlaylists(playlists.items);
  } catch (err) {
    handleApiException(err, "There was an error getting your playlists from Spotify, please try again.")
  }
});

document.getElementById("spotify-playlist-previous").addEventListener("click", async () => {
  try {
    playlistSelectPage -= 1;
    if (playlistSelectPage < 0) return;
    const playlists = (await spotifyApi.getPlaylists(token, user.id, 10, playlistSelectPage)).data;
    document.getElementById("display-playlists").style.display = "flex";
    displayPlaylists(playlists.items);
  } catch (err) {
    handleApiException(err, "There was an error getting your playlists from Spotify, please try again.")
  }
});

function displayPlaylists(playlists: any[]) {
  const listContainer = document.getElementById("playlists-list");
  const elts = playlists.map(playlist => `<li data-id="${playlist.id}" class="playlist-item">${playlist.name} - <span style="color: grey">${playlist.tracks.total} track(s)</span></li>`);
  listContainer.innerHTML = elts.join("");
  document.querySelectorAll(".playlist-item").forEach(elt => {
    elt.addEventListener("click", async () => {
      // @ts-ignore
      gtag('event', "import-playlist", {
        event_category: "room",
      });
      const { id: playlistId } = (elt as HTMLLIElement).dataset;
      try {
        displayLoader();
        const room = (await roomApi.addPlaylistToRoom(roomId, user.id, playlistId, token)).data.room;
        if (room.guests.length < 5) {
          setTimeout(() => {
            displayModalRoomIsBetter(room);
          }, 0.5 * 60 * 1000);
        }
        hideLoader();
        displayRoom(room);
        closeModals();
      } catch (err) {
        handleApiException(err, "There was an issue importing the playlist. Please try again.")
      }
    });
  })
}

export async function displayRoom(room: IRoom): Promise<boolean> {
  const waitingElt = document.getElementById("waiting");
  if (room === null) {
    return;
  };
  if (JSON.stringify(room) === JSON.stringify(oldRoom)) {
    return false;
  }
  waitingElt.style.display = "none";
  hideLoader();
  document.getElementById("room").style.display = "block";
  oldRoom = room;
  isHost = room.host.id === user.id;
  if (!isOnboarded && !isHost) {
    displayModalUnboardingGuest(room);
    isOnboarded = true;
  }
  if (!isOnboarded && isHost) {
    displayModalUnboardingHost(room);
    isOnboarded = true;
  }
  const tracklistElt = document.querySelector(".tracklist") as HTMLDivElement;
  const currentTrack = isHost ? room.tracks.find(t => t.current) : room.tracks.find(t => t.uri === room.guests.find(g => g.id === user.id).currentTrack);
  const trackElts = room.tracks.map((track) => trackBuilder(track, isHost, currentTrack?.uri));
  tracklistElt.innerHTML = trackElts.join("");
  if (trackElts.length === 0) {
    const importPlaylistButtonHtml = `<button style="padding-top: 5px; margin: 15px auto;" class="room-flex noselect grey-button get-playlist">${feather.icons["music"].toSvg({ width: 20 })}<span style="padding-left: 5px; display: block; padding-top: 2px;">Import playlist</span></button>`;
    tracklistElt.innerHTML = `<div style='text-align: center; padding: 30px;'><h1 style='margin-bottom: 15px;'>it feels a bit empty...</h1><p>Let's start by adding songs!</p><p margin-top: 10px;>You can use the search bar on the top-right, or start with one of your playlists!</p>${importPlaylistButtonHtml}</div>`;
  }

  const currentEltIndex = room.tracks.findIndex(t => t.uri === currentTrack?.uri);
  tracklistElt.parentElement.scrollTo({ top: 79 * currentEltIndex, behavior: 'smooth' });
  if (currentEltIndex > -1) {
    await setBackground("#cont", room.tracks[currentEltIndex].image);
  }

  const guestsListElt = document.querySelector(".guests") as HTMLDivElement;
  const guestsToAppoveListElt = document.querySelector(".guests-to-approve") as HTMLDivElement;
  const guestElts = room.guests.filter(g => g.isApproved && g.id !== room.host.id).map((g) => guestBuilder(g, isHost));
  const guestToApproveElts = room.guests.filter(g => !g.isApproved).map((guest) => `<li class="member guest-to-approve" data-id="${guest.id}" data-name="${guest.name}">${guest.name}</li>`);
  const hostElt = hostBuilder(room.host);
  guestsListElt.innerHTML = hostElt + guestElts.join("");
  guestsToAppoveListElt.innerHTML = isHost ? guestToApproveElts.join("") : "";
  (document.getElementById("guests-to-approve-header") as HTMLDivElement).style.display = (guestToApproveElts.length > 0 && isHost) ? "block" : "none";
  document.getElementById("room-name").textContent = room.name;
  const numTracks = room.tracks.filter(t => t.approved).length;
  document.getElementById("host").innerHTML = `<span>hosted by ${room.host.name} - ${numTracks} track${numTracks > 1 ? "s" : ""}</span>`;
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
      displayMessage(messages.infos.urlCopied);
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
        displayMessage(messages.infos.cannotSkipTracks);
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
        let e;
        while (!success && numAttempts < maxNumAttempts) {
          try {
            const room = (await roomApi.goToTrack(roomId, user.id, uri)).data.room;
            isPlaying = true;
            w.postMessage({ startPlaying: true });
            document.querySelectorAll(".play").forEach(elt => elt.innerHTML = feather.icons["pause"].toSvg());
            displayRoom(room);
            success = true;
          } catch (error) {
            e = error;
            await refreshRoomToken();
          }
          numAttempts += 1;
        }
        if (!success) {
          handleApiException(e, messages.errors.masterSkipTrack);
        }
      } else {
        // @ts-ignore
        gtag('event', "approve-track", {
          event_category: "track",
        });
        try {
          const room = (await roomApi.approveTrack(roomId, user.id, uri)).data.room;
          displayMessage(messages.infos.approvedTrack);
          displayRoom(room);
          const recommendations = await getRecommendations(room);
          displayRecommendations(recommendations);
        } catch (err) {
          handleApiException(err, messages.errors.approvedTrack);
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
        const room = (await roomApi.removeTrack(roomId, user.id, uri)).data.room;
        displayMessage(messages.infos.removedTrack);
        displayRoom(room);
        const recommendations = await getRecommendations(room);
        displayRecommendations(recommendations);
      } catch (error) {
        handleApiException(error, messages.errors.removedTrack);
      }
    });
  });

  document.querySelectorAll(".make-host").forEach((elt) => {

    elt.addEventListener("click", async function (e) {
      e.stopPropagation();
      // @ts-ignore
      gtag('event', "make-host", {
        event_category: "room",
      });
      const { userid, username } = this.dataset;
      document.getElementById("confirm-make-host").style.display = "flex";
      document.querySelector(".new-host-name").textContent = username;
      const OldButton = document.getElementById("yes-make-host");
      const cloneButton = OldButton.cloneNode(true);
      OldButton.parentNode.replaceChild(cloneButton, OldButton);
      cloneButton.addEventListener("click", async () => {
        try {
          const room = (await roomApi.makeHost(roomId, user.id, userid)).data.room;
          displayMessage(messages.infos.makeHost);
          displayRoom(room);
        } catch (error) {
          handleApiException(error, messages.errors.makeHost);
        } finally {
          closeModals();
        }
      });

      document.getElementById("no-make-host").addEventListener("click", () => {
        closeModals();
      });
    });
  });

  document.querySelectorAll(".guest-to-approve").forEach((elt) => {
    elt.addEventListener("click", async function (e) {
      // @ts-ignore
      gtag('event', "approve", {
        event_category: "user",
        event_label: isHost ? "host" : "non-host",
      });
      if (!isHost) return;
      const { id, name } = this.dataset;
      try {
        const room = (await roomApi.approveGuest(roomId, user.id, id)).data.room;
        displayMessage(messages.infos.approveGuest(name));
        displayRoom(room);
      } catch (err) {
        handleApiException(err, messages.errors.approvedGuest);
      }
    });
  });

  document.querySelectorAll(".get-playlist").forEach(elt => {
    elt.addEventListener("click", async () => {
      // @ts-ignore
      gtag('event', "list-playlists", {
        event_category: "room",
      });
      try {
        playlistSelectPage = 0;
        const playlists = (await spotifyApi.getPlaylists(token, user.id, 10, playlistSelectPage)).data;
        document.getElementById("display-playlists").style.display = "flex";
        displayPlaylists(playlists.items);
      } catch (err) {
        handleApiException(err, "There was an error getting your playlists from Spotify, please try again.")
      }
    });
  });

  document.querySelectorAll(".room-block").forEach((elt: HTMLDivElement) => {
    elt.style.display = "block";
  });

  document.querySelectorAll(".room-flex").forEach((elt: HTMLDivElement) => {
    elt.style.display = "flex";
  });

  if (currentTrack) {
    document.title = `${currentTrack.name} - ${currentTrack.artists.join(", ")} | ${room.name} `;
  }

  if (isHost && room.guests.filter(m => !m.isApproved).length > 0) {
    displayMessage(messages.infos.guestsAwaiting);
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
  const analyticsLabel = isPlaying ? "pause-button" : "play-button";
  // @ts-ignore
  gtag('event', analyticsLabel, {
    event_category: "player",
    value: isPlaying ? 1 : 0,
  });

  try {
    let r;
    if (!isPlaying) {
      r = (await roomApi.playRoom(roomId, user.id, deviceId)).data.room;
      document.querySelectorAll(".play").forEach(elt => elt.innerHTML = feather.icons["pause"].toSvg());
      w.postMessage({ startPlaying: true });
    } else {
      r = (await roomApi.pauseRoom(roomId, user.id, deviceId)).data.room;
      document.querySelectorAll(".play").forEach(elt => elt.innerHTML = feather.icons["play"].toSvg());
      w.postMessage({ stopPlaying: true });
    }
    isPlaying = !isPlaying;
    displayRoom(r);
  } catch (error) {
    handleApiException(error, messages.errors.masterSkipTrack);
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
    await spotifyApi.generatePlaylist(token, uris, user.id, name);
    displayMessage(messages.infos.playlistCreated);
    displayRoom(room);
  } catch (error) {
    handleApiException(error, messages.errors.playlistCreated);
  }
});

document.getElementById("search").addEventListener("click", (e: MouseEvent) => {
  e.stopPropagation();
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
    const result = (await spotifyApi.searchForSongs(token, q, user.id)).data;
    const resultElts = result.tracks.items.sort((a, b) => b.popularity - a.popularity).map((track) => {
      return searchResultBuilder({
        uri: track.uri,
        name: track.name,
        artists: track.artists,
        image: track.album.images[0].url
      });
    });
    searchResultElt.innerHTML = resultElts.join("") || `<p style="padding: 15px">No results found for "${q}"</p>`;
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
    displayMessage(messages.errors.searchResults);
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
    if (roomName === "" || roomName.includes("<") || roomName.includes(">")) {
      return displayMessage(messages.errors.invalidRoomName);
    }
    await axios.post(`/room/create/`, {
      token,
      userId: user.id,
      deviceId,
      name: roomName,
    });
    window.location.reload();
  } catch (error) {
    displayMessage(messages.errors.createRoom);
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
    displayMessage(messages.errors.leaveRoom);
  }
}

async function main() {
  document.querySelectorAll("input").forEach(elt => {
    elt.value = ""
  });
  try {
    token = await getToken();
  } catch {
    displayPermanentMessage(messages.permanent.authTokenError);
    return;
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

async function getRecommendations(room: IRoom): Promise<ISpotifyTrack[]> {
  if (!room) return [];
  try {
    const indices = [0, 1, 2, 3, 4].map((_) => Math.floor(Math.random() * room.tracks.length));
    const uris = room.tracks.filter((a, index, arr) => indices.indexOf(index) > -1).map(t => t.uri);
    const tracks = (await axios.put(`/spotify/recommendations/?token=${token}`, { uris })).data;
    return tracks;
  } catch (err) {
    displayMessage(messages.errors.getTrackRecommendations);
  }
}

async function addTrackToRoom(elt: HTMLElement): Promise<IRoom> {
  const { uri, name, artists, image } = elt.dataset;
  const uris = oldRoom.tracks.map(t => t.uri);
  if (uris.indexOf(uri) >= 0) {
    displayMessage(messages.infos.trackAlreadyInRoom);
    return;
  }
  try {
    const room = (await roomApi.addTrackToRoom(roomId, user.id, uri, name, artists, image)).data.room;
    displayMessage(messages.infos.addTrack);
    displayRoom(room);
    if (room.tracks.filter((track) => track.addedBy === user.display_name).length === 1) {
      setTimeout(() => {
        displayModalRoomIsBetter(room);
      }, 0.5 * 60 * 1000);
    }
    return room;
  } catch (err) {
    handleApiException(err, messages.errors.addTrack);
  }
}

function displayExistingRooms(rooms: IRoom[]) {
  const roomElts = rooms.slice(0, 5).map(room => {
    return `
    <div class="existing-room" data-id=${room.id}>
    <div class="room-image-container">
      <img class="room-image" src=${room.cover ?? "https://d1apvrodb6vxub.cloudfront.net/covers/default-cover.png"}>
    </div>
      <div class="room-name" style="white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;">
        ${room.name}
      </div>
      <div class="room-details">
        <p>by ${room.host.name} - ${room.tracks.filter(track => track.approved && !track.removed).length} track(s)</p>
      </div>
    </div>
    `;
  }).join("");
  if (rooms.length === 0) {
    document.getElementById("existing-rooms").textContent = "Pretty emty here... Let's start with creating a rooom!";
    document.getElementById("existing-rooms").style.textAlign = "center";
    document.getElementById("existing-rooms").style.display = "block";
  } else {
    document.getElementById("existing-rooms").innerHTML = roomElts;
  }
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

  const maxTime = 4 * 60 * 60 * 1000;
  setTimeout(function () {
    this.clearTimeout(refreshRoomTimeoutId);
  }, maxTime);

  document.getElementById("get-in-room").style.display = "none";
  displayLoader();
  (document.querySelector("body")).style.overflow = "hidden";
  try {
    await roomApi.joinRoom(id, token, user.id, deviceId);
  } catch (error) {
    displayMessage(messages.errors.joinRoom);
    displayPermanentMessage(messages.permanent.joinRoomError);
    return;
  }
  const room = await getRoom(id, user.id);
  await displayRoom(room);
  const recommendations = await getRecommendations(room);
  displayRecommendations(recommendations);
  document.getElementById("get-in-room").style.display = "none";
  hideLoader();
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

function displayModalUnboardingGuest(room: IRoom) {
  const modal = document.getElementById("onboarding-guest") as HTMLDivElement;
  document.querySelectorAll(".modal-room-host").forEach((elt) => {
    elt.textContent = room.host.name;
  });
  document.querySelectorAll(".modal-room-name").forEach((elt) => {
    elt.textContent = room.name;
  });
  document.querySelectorAll(".modal-user-name").forEach((elt) => {
    elt.textContent = user.display_name;
  });
  modal.style.display = "flex";
}

function displayModalUnboardingHost(room: IRoom) {
  const modal = document.getElementById("onboarding-host") as HTMLDivElement;
  document.querySelectorAll(".modal-room-host").forEach((elt) => {
    elt.textContent = room.host.name;
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
      displayMessage(messages.infos.sendEmailInvites);
    } catch (err) {
      displayMessage(messages.errors.sendEmailInvites);
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
      displayMessage(messages.infos.sendEmailInvites);
    } catch (err) {
      displayMessage(messages.errors.sendEmailInvites);
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

  document.getElementById("twitter-share").addEventListener("click", async (e) => {
    e.preventDefault();
    // @ts-ignore
    gtag('event', "share-twitter", {
      event_category: "room",
      event_label: "twitter",
    });
    const tweet = "Join my remote music listening session on @rooomclick!";
    tweetIt(tweet, `https://rooom.click?id=${id}`);
  });

  document.getElementById("facebook-share").addEventListener("click", async (e) => {
    e.preventDefault();
    // @ts-ignore
    gtag('event', "share-facebook", {
      event_category: "room",
      event_label: "facebook",
    });
    shareOnFacebook(`https://rooom.click?id=${id}`);
  });
}

document.getElementById("refresh-recommendations").addEventListener("click", async () => {
  // @ts-ignore
  gtag('event', "refresh-recommendations", {
    event_category: "room",
    event_label: "recommendations",
  });
  const room = await getRoom(roomId, user.id);
  const recommendations = await getRecommendations(room);
  displayRecommendations(recommendations);
});

export async function doIt() {
  let id;
  try {
    const spotifyUser = (await axios.get(`/spotify/me/?token=${token}`)).data.user as ISpotifyUser;
    if (spotifyUser.product !== "premium") {
      displayPermanentMessage(messages.permanent.notPremiumError);
      return;
    }
    id = spotifyUser.id;
  } catch {
    displayPermanentMessage(messages.permanent.spotifyProfileError);
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
      hideLoader();
    }
  }
  document.getElementById("user").innerHTML = userBuilder(user);
}

//@ts-ignore
window.onSpotifyWebPlaybackSDKReady = () => {
  const ios = isIOS();
  if (ios) {
    return displayPermanentMessage(messages.permanent.deviceNotSupported);
  }

  setTimeout(() => {
    //@ts-ignore
    const player = new Spotify.Player({
      name: 'rooom',
      getOAuthToken: cb => { cb(token); }
    });

    player.addListener('initialization_error', ({ message }) => {
      displayPermanentMessage(messages.permanent.browserNotSupported);
      return;
    });
    player.addListener('authentication_error', ({ message }) => {
      displayPermanentMessage(messages.permanent.authTokenError);
      return;
    });
    player.addListener('account_error', ({ message }) => {
      displayPermanentMessage(messages.permanent.accountError);
      console.error(message);
    });
    player.addListener('playback_error', ({ message }) => { displayMessage(messages.errors.playback); console.error(message); })

    player.addListener('ready', ({ device_id }) => {
      deviceId = device_id;
      w.postMessage({ deviceId });
      doIt();
    });

    player.addListener('not_ready', ({ device_id }) => {
      displayPermanentMessage(messages.permanent.offlineDevice);
    });

    player.connect();
  }, 500);
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
  }, 4000);
}

function displayPermanentMessage(innerHtml: string) {
  const waitingElt = document.getElementById("waiting");
  waitingElt.innerHTML = innerHtml;
  waitingElt.style.display = "block";
  (document.getElementById("room") as HTMLDivElement).style.display = "none";
  hideLoader();
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

function handleApiException(error: any, defaultMessage: string, permanent: boolean = false) {
  const message = error?.response?.data?.message ?? defaultMessage
  if (permanent) {
    return displayPermanentMessage(message);
  }
  return displayMessage(message);
}
