import { ISpotifyUser } from "../typings/spotify";

export function userBuilder(user: ISpotifyUser): string {
  const username = user.display_name ?? "You";
  const imageUrl = user.images[0]?.url ?? "https://boristane-arts-data.s3.eu-west-2.amazonaws.com/a.png";
  return `<div>
            <img src="${imageUrl}" alt="your avatar" id="user-photo"/>
          </div>
          <div style="padding-left: 6px; padding-top: 8px;">
            ${username}
          </div>`;
}

export function masterBuilder(master): string {
  return `<li class="master member">
                ${master.name} <spam style="font-size: 8px;">MASTER</span>     
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
}, isMaster: boolean): string {
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
              <button class="noselect red-button remove-track" style="display: ${isMaster && !track.current? "block" : "none"}; width: 40px; font-size: 20px;" data-uri="${track.uri}">-</button>
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