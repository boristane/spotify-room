import express from "express";
import { joinRoom, createRoom, goToNextTrack, playRoom, getRooom, addTrackToRoom, masterGoToTrack, masterApproveTrack, masterApproveMember } from "../controller/room";

const router = express.Router();

router.put("/join/:id", joinRoom);
router.post("/create", createRoom);
router.post("/play/:id", playRoom);
router.get("/next/:id", goToNextTrack);
router.get("/go-to/:id", masterGoToTrack);
router.get("/approve/:id", masterApproveTrack);
router.get("/approve-member/:id", masterApproveMember);
router.get("/:id", getRooom);
router.post("/add-track/:id", addTrackToRoom);

export default router;
