import * as d3 from "d3";

import colors from "./colors";

let isPlaying: boolean;
const audioElt = document.getElementById("player") as HTMLAudioElement;
const visualPlayer = document.getElementById("visual-player") as HTMLDivElement;
let animationRequestId = 0;

export function playOrPause(track, isPause: boolean) {
  d3.selectAll(".play-button").text("▶");
  d3.selectAll(".play-button").style("fill", colors.lightgray);
  d3.selectAll(".genres").attr("stroke", colors.lightgray);
  d3.selectAll(".genres").style("stroke", colors.lightgray);
  d3.selectAll(".genres").attr("fill", colors.lightgray);
  d3.selectAll(".genres").style("fill", colors.lightgray);
  d3.selectAll(".artists").style("stroke", colors.lightgray);
  if (!track.preview_url) {
    audioElt.pause();
    isPlaying = false;
    animationRequestId = animate();
    return updateVisualPlayerWithUnavailable();
  }
  audioElt.src = audioElt.src === track.preview_url ? audioElt.src : track.preview_url;
  if (isPause) {
    audioElt.pause();
    isPlaying = false;
  } else {
    audioElt.play();
    isPlaying = true;
  }
  animationRequestId = animate();
  updateVisualPlayer(track);
}

function animate() {
  const fps = 5;
  let now;
  let then = Date.now();
  const interval = 1000 / fps;
  let delta;
  function renderFrame() {
    if (!isPlaying) {
      return;
    }
    window.cancelAnimationFrame(animationRequestId);
    const anim = requestAnimationFrame(renderFrame);
    now = Date.now();
    delta = now - then;
    if (delta > interval) {
      then = now - (delta % interval);
      const bars = document.querySelectorAll(".visualasation-bar");
      bars.forEach((bar: HTMLDivElement) => {
        const h = Math.random() * 35;
        bar.style.height = `${h}px`;
        bar.style.marginTop = `${0.5 * (45 - h)}px`;
      });
    }
    return anim;
  }
  return renderFrame();
}

function updateVisualPlayer(track) {
  setTimeout(() => {
    visualPlayer.style.opacity = "0.5";
  }, 500);
  const image = document.getElementById("visual-player-photo") as HTMLImageElement;
  const title = document.getElementById("visual-player-title") as HTMLDivElement;
  const artist = document.getElementById("visual-player-artist") as HTMLDivElement;

  image.src = track.album.images[0].url;
  let t: string = track.name;
  let a: string = track.artists.map(artist => artist.name).join(", ");
  if (t.length > 20) t = t.substring(0, 20) + "...";
  if (a.length > 25) a = a.substring(0, 25) + "...";
  title.textContent = t;
  artist.textContent = a;
}

function updateVisualPlayerWithUnavailable() {
  setTimeout(() => {
    visualPlayer.style.opacity = "0.5";
  }, 500);
  const image = document.getElementById("visual-player-photo") as HTMLImageElement;
  const title = document.getElementById("visual-player-title") as HTMLDivElement;
  const artist = document.getElementById("visual-player-artist") as HTMLDivElement;

  image.src =
    "https://boristane-projects-data.s3.eu-west-2.amazonaws.com/eclectix/r_audio-cassette-cassette-tape-1626481.jpg";
  let t: string = "Unavailable Preview";
  let a: string = "Unavailable Preview";
  title.textContent = t;
  artist.textContent = a;
}

visualPlayer.addEventListener("click", e => {
  if (isPlaying) {
    audioElt.pause();
  } else {
    audioElt.play();
  }
  isPlaying = !isPlaying;
  animationRequestId = animate();
});
