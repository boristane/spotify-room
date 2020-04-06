import { ISpotifyUser } from "../src/typings/spotify";

export function userBuilder(user: ISpotifyUser): string {
  const username = user.display_name ?? "You";
  const imageUrl = user.images[0]?.url ?? "https://boristane-arts-data.s3.eu-west-2.amazonaws.com/a.png";
  return `<div>
            <img src="${imageUrl}" alt="your avatar" id="user-photo"/>
          </div>
          <div style="padding-left: 10px; padding-top: 6px;">
            ${username}
          </div>`;
}

export function masterBuilder(master): string {
  return `<li class="master member">
                ${master.name} <spam style="font-size: 8px;">M</span>     
           </li>`
}

export function trackBuilder(track: {
  uri: string;
  completed: boolean;
  approved: boolean;
  current: boolean;
  name: string;
  artist: string;
  image: string;
}): string {
  const classes = ["track", track.current ? "current" : "", track.completed ? "completed" : "", track.approved ? "approved" : ""].join(" ");
  return `<li class="${classes}" data-uri="${track.uri}" data-name="${track.name}" data-artist="${track.artist}" data-image="${track.image}" data-approved="${track.approved}">
            <div>
              <img src="${track.image}" style="width: 60px"/>
            </div>
            <div style="padding-left: 10px;">

              <div class="track-name">${track.name}</div><div class="artist-name">${track.artist}</div>

            </div>
          </li>`
}

export function searchResultBuilder(track: {
  uri: string;
  name: string;
  artists: any[];
  image: string;
}): string {
  return `<li class="track-search-result-item" data-uri="${track.uri}" data-name="${track.name}" data-image="${track.image}">
            <div>
              <img src="${track.image}" style="width: 60px"/>
            </div>
            <div style="padding-left: 10px;">

              <div class="track-name">${track.name}</div><div class="artist-name">${track.artists.map(a => a.name).join(", ")}</div>

            </div>
          </li>`
}