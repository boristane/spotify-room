import express from "express";
import { login, getToken, refreshToken, getUser, generatePlaylist, searchTrack, getRecommendation, getCurrentTrack, getListPlaylists, getCurrentPlayback } from "../controller/spotify";

const router = express.Router();

router.get("/login", login);
router.get("/get-token", getToken);
router.get("/refresh-token", refreshToken);
router.get("/me", getUser);
router.get("/current-track", getCurrentTrack);
router.get("/current-playback", getCurrentPlayback);
router.get("/search", searchTrack);
router.get("/playlists", getListPlaylists);
router.post("/generate-playlist", generatePlaylist);
router.put("/recommendations", getRecommendation);


export default router;