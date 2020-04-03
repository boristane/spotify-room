import express from "express";
import { joinRoom, createRoom, skipNextTrack, playRoom, skipPreviousTrack } from "../controller/room";

const router = express.Router();

router.put("/join/:id", joinRoom);
router.post("/create", createRoom);
router.post("/play/:id", playRoom);
router.post("/next/:id", skipNextTrack);
router.post("/previous/:id", skipPreviousTrack);

export default router;
