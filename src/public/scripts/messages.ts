const messages = {
  errors: {
    refreshToken: "There was an error when refreshing the token of the rooom",
    gettingTheRoom: "There was a problem getting the rooom",
    addedToMailingList: "There was a problem adding you to the mailing list, please try again",
    masterSkipTrack: "There was an error going to this track",
    approvedTrack: "There was an error approving to this track",
    removedTrack: "There was an error removing this track",
    approvedGuest: "There was an error approving this guest",
    playedTrack: "There was problem playing the track",
    playlistCreated: "There was problem creating the playlist",
    searchResults: "There was a problem getting your search results",
    invalidRoomName: "Please enter a valid rooom name",
    createRoom: "There was a problem creating the rooom 😥",
    leaveRoom: "There was problem leaving the room",
    getTrackRecommendations: "There was an issue getting the track recommendations",
    addTrack: "There was a problem adding a track to the rooom",
    joinRoom: "There was an error when joining the rooom",
    sendEmailInvites: "There was an error sending the email invite(s)",
    playback: "There was an error with the web player. Please refresh the page.",
  },
  infos: {
    addedToTheMailingList: "You have been added to the mailing list 📧",
    urlCopied: "rooom url copied to clipboard",
    cannotSkipTracks: "Only the rooom host can skip tracks 😅",
    approvedTrack: "You approved this track in the rooom",
    removedTrack: "You removed this track from the rooom",
    tooManyGuestsInRoom: "Too many guests in the rooom",
    guestsAwaiting: "There are guests in the queue waiting for your approval",
    playlistCreated: "We created a playlist from this rooom for you 🥳 ! Check your Spotify account !",
    trackAlreadyInRoom: "This track is already in the rooom",
    addTrack: "You added a track to the rooom!",
    sendEmailInvites: "We sent your rmail invite(s)!",
    approveGuest: (name: string) => `Lest's welcome ${name} to the rooom! 🎉`,
  },
  permanent: {
    joinRoomError: "<p>There was an error when joining the rooom. Please retry.</p>",
    browserNotSupported: "<p>Whoops! rooom is not available on your browser. Please try using the latest version of <a href='https://www.mozilla.org'>Mozilla Firefox</a> or <a href='https://www.google.com/chrome/'>Google Chrome</a>, preferably on desktop/laptop.</p>",
    authTokenError: "<p>There was an issue getting your authentication token, please try again.</p>",
    notPremiumError: "<p>Unfortunately rooom is available only for <a href='https://www.spotify.com/uk/premium/'>Spotify Premium</a> users</p>",
    spotifyProfileError: "<p>There was an issue getting your profile from Spotify, please try again.</p>",
    deviceNotSupported: "<p>Whoops! rooom is not available on your device. Please try using a laptop/desktop.</p>",
    accountError: `<p>There was an error with your account. Please refresh the page.</p>`,
    offlineDevice: `<p>This device has gone offline. Please refresh the page</p>`
  }
}

export default messages;