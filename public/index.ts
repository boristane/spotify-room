import axios from "axios";
import "babel-polyfill";
import ArtistList from "../src/front/artists-list";
import {
  IMargin,
  IArtistListDataItem,
  IArtistsListProps,
  ISpotifyTrack,
  IServerResponse
} from "../src/types";
import MainstreamMeter from "../src/front/mainstream-meter";
import Network from "../src/front/network";
import GenreChart from "../src/front/genres";
import AgesChart from "../src/front/age";
import moment from "moment";

const margin: IMargin = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10
};

const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

function displayTopArtists(data: IArtistListDataItem[]) {
  const mapProperties: IArtistsListProps = {
    width: 0.95 * document.body.clientWidth,
    height: 0.35 * h,
    margin,
    data
  };
  const chart = new ArtistList(mapProperties);
  const container = document.querySelector(".top-artists-list-container");
  if (!container) return;
  container.innerHTML = "";
  chart.make(".top-artists-list-container");
}

function displayMainstreamMeter(data: IArtistListDataItem[]) {
  const mapProperties: IArtistsListProps = {
    width: 0.95 * document.body.clientWidth,
    height: 0.65 * h,
    margin,
    data
  };
  const chart = new MainstreamMeter(mapProperties);
  const container = document.querySelector(".mainstream-meter-container");
  if (!container) return;
  container.innerHTML = "";
  chart.make(".mainstream-meter-container");
}

function displayNetwork(data) {
  const mapProperties = {
    width: 0.95 * document.body.clientWidth,
    height: h,
    margin,
    data
  };
  const chart = new Network(mapProperties);
  const container = document.querySelector(".network-container");
  if (!container) return;
  container.innerHTML = "";
  chart.make(".network-container");
}

function displayAgesClusters(data) {
  const mapProperties = {
    width: 0.95 * document.body.clientWidth,
    height: h,
    margin,
    data
  };
  const chart = new AgesChart(mapProperties);
  const container = document.querySelector(".ages-container");
  if (!container) return;
  container.innerHTML = "";
  chart.make(".ages-container");
}

function displayGenres(data) {
  const duration = 10000;
  const mapProperties = {
    width: 0.95 * document.body.clientWidth,
    height: h,
    margin,
    data,
    duration
  };
  const chart = new GenreChart(mapProperties);
  const container = document.querySelector(".genres-container");
  if (!container) return;
  container.innerHTML = "";
  chart.make(".genres-container");
  setInterval(() => {
    chart.update(data);
  }, duration);
}

function average(arr: number[]) {
  return arr.reduce((p, c) => p + c, 0) / arr.length;
}

function getCategory(popularity) {
  const categories = ["obscure", "unorthodox", "hipster", "cultured", "universal", "mainstream"];
  if (popularity > 90) return categories[5];
  if (popularity > 70) return categories[4];
  if (popularity > 50) return categories[3];
  if (popularity > 30) return categories[2];
  if (popularity > 10) return categories[1];
  return categories[0];
}

function getNetworkCenter(network) {
  const maxConnections = Math.max(...network.nodes.map(node => node.numLinks));
  const center = network.nodes.find(node => node.numLinks === maxConnections);
  return center;
}

function getTracksWithDate(data) {
  let d: { track: ISpotifyTrack; year: number; date: string; age: number }[] = [];
  data.forEach(a => {
    a.tracks.forEach(track => {
      d.push({
        track,
        year: a.year,
        date: track.album.release_date,
        // @ts-ignore
        age: millisecondsToYears(moment.now() - moment(track.album.release_date, "YYYY-MM-DD"))
      });
    });
  });

  d = d.sort(
    (a, b) =>
      // @ts-ignore
      moment(a.date, "YYYY-MM-DD") -
      // @ts-ignore
      moment(b.date, "YYYY-MM-DD")
  );
  return d;
}

function millisecondsToYears(milliseconds: number) {
  return milliseconds / 1000 / 60 / 60 / 24 / 365;
}

function populateReport(data) {
  (document.getElementById("user-photo") as HTMLImageElement).src = data.user.images[0]
    ? data.user.images[0].url
    : "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
  document.getElementById("username").textContent = data.user.display_name;
  document.getElementById("score").textContent = data.score.toFixed(1);
  document.getElementById("period").textContent = data.period;
  document.getElementById("name").textContent = data.user.display_name.split(" ")[0];
  document.getElementById("eclectix-score").textContent = data.score.toFixed(1);
  const isBottomPercentage = data.eclectixPercentage >= 50;
  const displayPercentage = isBottomPercentage
    ? 100 - data.eclectixPercentage
    : data.eclectixPercentage;
  document.getElementById("eclectix-top").textContent = isBottomPercentage ? "bottom" : "top";
  document.getElementById("eclectix-percentage").textContent = displayPercentage.toFixed(0);

  const meanPopularity = average(data.topArtists.map(artist => artist.popularity)).toFixed(0);
  const category = getCategory(meanPopularity);
  document.getElementById("music-taste-category").textContent = category;
  document.getElementById("popularity").textContent = String(meanPopularity);

  const networkCenter = getNetworkCenter(data.connections);
  document.getElementById("network-center").textContent = networkCenter.id;
  document.getElementById("max-connections").textContent = networkCenter.numLinks;

  const loneNodes = data.connections.nodes.filter(node => node.numLinks === 0);
  let loneNodesString = "";
  loneNodes.forEach((node, index) => {
    if (index === loneNodes.length - 1) {
      const verb = loneNodes.length >= 2 ? " are" : " is";
      loneNodesString = `${loneNodesString} and ${node.id} ${verb}`;
      return;
    }
    loneNodesString = `${loneNodesString} ${node.id}, `;
  });
  document.getElementById("lone-nodes").textContent = loneNodesString;
  const meanConnections = average(data.connections.nodes.map(node => node.numLinks)).toFixed(2);
  document.getElementById("average-connections").textContent = String(meanConnections);
  const numGenres = data.genreClusters.length;
  document.getElementById("favourite-genre").textContent = data.genreClusters[numGenres - 1].genre;
  document.getElementById("second-favourite-genre").textContent = data.genreClusters[numGenres - 2]
    ? data.genreClusters[numGenres - 2].genre
    : "undefined";
  document.getElementById("third-favourite-genre").textContent = data.genreClusters[numGenres - 3]
    ? data.genreClusters[numGenres - 3].genre
    : "undefined";
  document.getElementById("total-number-genres").textContent = numGenres;

  const tracks = getTracksWithDate(data.tracksAgesClusters);
  document.getElementById("average-track-age").textContent = String(
    average(tracks.map(track => track.age)).toFixed(2)
  );
  document.getElementById("oldest-track-title").textContent = tracks[0].track.name;
  document.getElementById("oldest-track-artist").textContent = tracks[0].track.artists[0].name;

  document.getElementById("newest-track-title").textContent = tracks[tracks.length - 1].track.name;
  document.getElementById("newest-track-artist").textContent =
    tracks[tracks.length - 1].track.artists[0].name;
}

async function getToken() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    const { access_token: token, refresh_token: refreshToken } = (await axios.get(
      `/get-token/?code=${code}&state=${state}`
    )).data;
    localStorage.setItem("refreshToken", refreshToken);
    return token;
  }
  const { access_token: token } = (await axios.get(
    `/refresh-token/?refresh_token=${refreshToken}`
  )).data;
  return token;
}

function getTerm(index: number) {
  if (index === 0) return "long_term";
  if (index === 1) return "medium_term";
  if (index === 2) return "short_term";
}

function randomiseStringInDOMElt(elt) {
  const chars = ["$", "%", "#", "@", "&", "(", ")", ",", "=", "*", "/"];
  const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const letters = elt.textContent.split("");
  let displayString = "";

  // Randomising times in milliseconds
  const randomisingTime = 40;
  const randomisingTime2 = 60;
  const randomisingTime3 = 30;

  letters.forEach((char, index) => {
    const delay1 = index * randomisingTime;
    setTimeout(() => {
      displayString += Math.random() < 0.5 ? chars[getRandomInt(0, chars.length - 1)] : char;
      elt.textContent = displayString;
    }, delay1);

    const delay2 = letters.length * randomisingTime + index * randomisingTime2;
    setTimeout(() => {
      const arr = displayString.split("");
      arr[index] = char;
      elt.textContent = arr.join("");
    }, delay2);

    const delay3 =
      letters.length * randomisingTime +
      letters.length * randomisingTime2 +
      index * randomisingTime3;
    setTimeout(() => {
      const arr = displayString.split("");
      arr[index] = char;
      displayString = arr.join("");
      elt.textContent = displayString;
    }, delay3);
  });
}

function displayLoadingText() {
  const texts = ["Hold tight !", "Your music...", "Your taste...", "From Spotify !"];
  const container = document.getElementById("loading-text");
  container.style.opacity = "1";
  let count = 0;
  container.textContent = texts[count];
  randomiseStringInDOMElt(container);
  count += 1;
  const interval = setInterval(() => {
    container.textContent = texts[count];
    randomiseStringInDOMElt(container);

    count += 1;
    if (count >= texts.length) count = 0;
  }, 3000);
  return interval;
}

function hideLoadingTexts(interval) {
  clearInterval(interval);
  const container = document.getElementById("loading-text");
  container.style.opacity = "0";
}
let inter;
async function handleClick(index: number) {
  const loader = document.getElementById("inner-loader") as HTMLDivElement;
  const instructions = document.getElementById("instructions") as HTMLDivElement;
  loader.style.display = "block";
  inter = displayLoadingText();
  const term = getTerm(index);
  let data: IServerResponse;
  try {
    data = (await axios.get(`/top-artists/?token=${token}&term=${term}`)).data;
  } catch (e) {
    return window.location.replace("/");
  }
  displayTopArtists(data.topArtists.filter(artist => artist.rank <= 10));
  displayMainstreamMeter(data.topArtists.filter(artist => artist.rank <= 20));
  displayNetwork(data.connections);
  displayGenres(data.genreClusters);
  displayAgesClusters(data.tracksAgesClusters);
  populateReport(data);
  loader.style.display = "none";
  instructions.style.opacity = "100";
  setTimeout(() => {
    instructions.style.opacity = "0";
    document.querySelector("#section1").scrollIntoView({
      behavior: "smooth"
    });
  }, 4000);

  const generatePlaylistButton = document.getElementById("generate-playlist");
  generatePlaylistButton.addEventListener("click", async () => {
    try {
      document.getElementById("generate-playlist-loader").style.display = "inline-block";
      const playlistData = (await axios.post(`/generate-playlist/?token=${token}`, {
        uris: data.topTracks.map(track => track.uri),
        userId: data.user.id
      })).data;
      document.getElementById("generate-playlist-loader").style.display = "none";
      alert("The playlist was succesfully generated ! Check your spotify account :)");
    } catch (err) {
      document.getElementById("generate-playlist-loader").style.display = "none";
      alert("There was an error generating the playlist, please try again.");
    }
  });
}
let token: string;
let user;
async function main() {
  try {
    token = await getToken();
  } catch {
    return window.location.replace("/");
  }

  try {
    user = (await axios.get(`/me/?token=${token}`)).data;
  } catch {
    return window.location.replace("/");
  }
  const username = user.display_name ? user.display_name.split(" ")[0] : "there";
  document.getElementById("user").textContent = username;
  document.querySelector<HTMLDivElement>(".intro-container").style.opacity = "100";
  document.querySelector<HTMLDivElement>(".loader").style.display = "none";
  const buttons = document.querySelectorAll(".term-buttons");
  buttons.forEach((button, index) => {
    button.addEventListener("click", async () => {
      await handleClick(index);
      document
        .querySelectorAll<HTMLDivElement>(".scroll")
        .forEach(scroller => (scroller.style.display = "block"));
      hideLoadingTexts(inter);
      document.querySelector<HTMLDivElement>(".report-container").style.display = "flex";
    });
  });
}

main();
