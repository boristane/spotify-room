import express from "express";
import { joinRoom, createRoom, skipTrack } from "../controller/room";

const router = express.Router();

router.put("/join/:id", joinRoom);
router.post("/create", createRoom);
router.post("/skip/:id", skipTrack);

export default router;
