import express from "express";
import { joinRoom, createRoom, goToNextTrack, playRoom, getRooom, addTrackToRoom } from "../controller/room";

const router = express.Router();

router.put("/join/:id", joinRoom);
router.post("/create", createRoom);
router.post("/play/:id", playRoom);
router.get("/next/:id", goToNextTrack);
router.get("/:id", getRooom);
router.post("/add-track/:id", addTrackToRoom);

export default router;
