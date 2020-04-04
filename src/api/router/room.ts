import express from "express";
import { joinRoom, createRoom, skipNextTrack, playRoom, skipPreviousTrack, getRooom, addTrackToRoom } from "../controller/room";

const router = express.Router();

router.put("/join/:id", joinRoom);
router.post("/create", createRoom);
router.post("/play/:id", playRoom);
router.post("/next/:id", skipNextTrack);
router.get("/:id", getRooom);
router.post("/add-track/:id", addTrackToRoom);
router.post("/previous/:id", skipPreviousTrack);

export default router;
