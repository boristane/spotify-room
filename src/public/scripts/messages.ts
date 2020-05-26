const messages = {
  errors: {
    refreshToken: "there was an error when refreshing the token of the rooom",
    gettingTheRoom: "there was a problem getting the rooom",
    addedToMailingList: "there was a problem adding you to the mailing list, please try again",
    masterSkipTrack: "there was an error going to this track",
    approvedTrack: "there was an error approving to this track",
    removedTrack: "there was an error removing this track",
    approvedGuest: "there was an error approving this guest",
    playedTrack: "there was problem playing the track",
    playlistCreated: "there was problem creating the playlist",
    searchResults: "there was a problem getting your search results",
    invalidRoomName: "please enter a valid rooom name",
    createRoom: "there was a problem creating the rooom 😥",
    leaveRoom: "there was problem leaving the room",
    getTrackRecommendations: "there was an issue getting the track recommendations",
    addTrack: "there was a problem adding a track to the rooom",
    joinRoom: "there was an error when joining the rooom",
    sendEmailInvites: "there was an error sending the email invite(s)",
    playback: "there was an error with the web player. please refresh the page.",
  },
  infos: {
    addedToTheMailingList: "you have been added to the mailing list 📧",
    urlCopied: "rooom url copied to clipboard",
    cannotSkipTracks: "Only the rooom host can skip tracks 😅",
    approvedTrack: "This track has been approved in the rooom",
    removedTrack: "This track has been removed from the rooom",
    tooManyGuestsInRoom: "Too many guests in the rooom",
    guestsAwaiting: "there are guests in the queue waiting for your approval",
    playlistCreated: "Playlist succesfully created 🥳 ! Check your Spotify account !",
    trackAlreadyInRoom: "This track is already in the rooom",
    addTrack: "track added to the rooom!",
    sendEmailInvites: "email invite(s) sent",
    approveGuest: (name: string) => `Lest's welcome ${name} to the rooom! 🎉`,
  },
  permanent: {
    joinRoomError: "<p>there was an error when joining the rooom. please retry.</p>",
    browserNotSupported: "<p>whoops! rooom is not available on your browser. please try using the latest version of <a href='https://www.mozilla.org'>Mozilla Firefox</a> or <a href='https://www.google.com/chrome/'>Google Chrome</a>, preferably on desktop/laptop.</p>",
    authTokenError: "<p>there was an issue getting your authentication token, please try again.</p>",
    notPremiumError: "<p>unfortunately rooom is available only for <a href='https://www.spotify.com/uk/premium/'>Spotify Premium</a> users</p>",
    spotifyProfileError: "<p>there was an issue getting your profile from Spotify, please try again.</p>",
    deviceNotSupported: "<p>whoops! rooom is not available on your device. please try using a laptop/desktop.</p>",
    accountError: `<p>there was an error with your account. please refresh the page.</p>`,
    offlineDevice: `<p>this device has gone offline. please refresh the page</p>`
  }
}

export default messages;