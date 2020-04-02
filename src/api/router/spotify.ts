import express from "express";
import { login, getToken, refreshToken, getUser, skipTrack, generatePlaylist } from "../controller/spotify";

const router = express.Router();

router.get("/login", login);
router.get("/get-token", getToken);
router.get("/refresh-token", refreshToken);
router.get("/me", getUser);
router.post("/skip", skipTrack);
router.post("/generate-playlist", generatePlaylist);


export default router;