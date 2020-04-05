import { ISpotifyUser } from "../src/typings/spotify";

export function userBuilder(user: ISpotifyUser): string {
  const username = user.display_name ?? "You";
  const imageUrl = user.images[0]?.url ?? "https://boristane-arts-data.s3.eu-west-2.amazonaws.com/a.png";
  return `<div>
            <img src="${imageUrl}" alt="your avatar" id="user-photo"/>
          </div>
          <div style="padding-left: 5px; padding-top: 6px;">
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
            <div style="padding-top: 20px; padding-left: 10px;">

              <span style="font-weight: bold">${track.name}</span> - <span>${track.artist}</span>

            </div>
          </li>`
}