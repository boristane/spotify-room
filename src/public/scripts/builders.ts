import { ISpotifyUser, ISpotifyTrack } from "../../typings/spotify";

export function userBuilder(user: ISpotifyUser): string {
  const username = user.display_name ?? "You";
  const imageUrl = user.images[0]?.url ?? "https://boristane-arts-data.s3.eu-west-2.amazonaws.com/a.png";
  return `<div>
            <img src="${imageUrl}" alt="your avatar" id="user-photo"/>
          </div>
          <div id="username">
            ${username}
          </div>`;
}

export function hostBuilder(host): string {
  return `<li class="host member">
                ${host.name} <spam style="font-size: 8px;">HOST</span>     
           </li>`
}

export function trackBuilder(track: {
  uri: string;
  completed: boolean;
  approved: boolean;
  current: boolean;
  name: string;
  artists: string[];
  image: string;
  addedBy: string;
}, isHost: boolean): string {
  const classes = ["track", track.current ? "current" : "", track.completed ? "completed" : "", track.approved ? "approved" : ""].join(" ");
  return `<li class="${classes}" data-uri="${track.uri}" data-name="${track.name}" data-artist="${track.artists}" data-image="${track.image}" data-approved="${track.approved}">
            <div>
              <img src="${track.image}" style="width: ${track.current ? "148px" : "60px"}"/>
            </div>
            <div style="padding-left: 10px;">

              <div class="track-name">${track.name}</div>
              <div class="artist-name">${track.artists.join(", ")}</div>
              <div class="added-by">added by ${track.addedBy || "*****"}</div>

            </div>
            <div>
              <button class="noselect red-button remove-track" style="display: ${isHost && !track.current? "block" : "none"}; font-size: 10px;" data-uri="${track.uri}">remove</button>
            </div>
          </li>`
}

export function recommendationBuilder(track: ISpotifyTrack): string {
  const classes = ["recommendation"].join(" ");
  const artistNames = track.artists.map(a => a.name);
  return `<li class="${classes}">
            <div style="padding-left: 10px;">

              <div class="track-name">${track.name}</div>
              <div class="artist-name">${track.artists.map(a => a.name).join(", ")}</div>

            </div>
            <div>
              <button class="noselect green-button add-track" style="width: 40px; font-size: 10px;" data-uri="${track.uri}" data-name="${track.name}" data-image="${track.album.images[0].url}" data-artists="${artistNames}">add</button>
            </div>
          </li>`
}

export function searchResultBuilder(track: {
  uri: string;
  name: string;
  artists: any[];
  image: string;
}): string {
  const artistNames = track.artists.map(a => a.name);
  return `<li class="track-search-result-item" data-uri="${track.uri}" data-name="${track.name}" data-image="${track.image}" data-artists="${artistNames}">
            <div>
              <img src="${track.image}" style="width: 60px"/>
            </div>
            <div style="padding-left: 10px;">

              <div class="track-name">${track.name}</div><div class="artist-name">${artistNames.join(", ")}</div>

            </div>
          </li>`
}