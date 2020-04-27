import express from "express";
import { login, getToken, refreshToken, getUser, generatePlaylist, searchTrack, getRecommendation } from "../controller/spotify";

const router = express.Router();

router.get("/login", login);
router.get("/get-token", getToken);
router.get("/refresh-token", refreshToken);
router.get("/me", getUser);
router.get("/search", searchTrack);
router.post("/generate-playlist", generatePlaylist);
router.put("/recommendations", getRecommendation);


export default router;