import Vibrant from "node-vibrant";

export async function getPalette(cover: string) {
  const palette = await Vibrant.from(cover).getPalette();
  const colorPair = [palette.LightVibrant.getHex(), palette.DarkVibrant.getHex()];
  return colorPair;
}

export async function setBackground(selector: string, cover: string) {
  const colorPair = await getPalette(cover);
  const domElement = document.querySelector(selector) as HTMLDivElement;
  const s = `linear-gradient(180deg, ${colorPair[1]} 0%, #000 100%)`;
  domElement.style.background = s;
  domElement.style.color = "white";
}
