import express from "express";
import { 
  joinRoom,
  createRoom,
  goToNextTrack,
  playRoom,
  getRooom,
  addTrackToRoom,
  masterGoToTrack,
  masterApproveTrack,
  masterApproveMember,
  leaveRoom,
  pauseRoom,
  masterRemoveTrack,
} from "../controller/room";

const router = express.Router();

router.put("/join/:id", joinRoom);
router.put("/leave/:id", leaveRoom);
router.post("/create", createRoom);
router.post("/play/:id", playRoom);
router.post("/pause/:id", pauseRoom);
router.get("/next/:id", goToNextTrack);
router.get("/go-to/:id", masterGoToTrack);
router.delete("/remove/:id", masterRemoveTrack);
router.get("/approve/:id", masterApproveTrack);
router.get("/approve-member/:id", masterApproveMember);
router.get("/:id", getRooom);
router.post("/add-track/:id", addTrackToRoom);

export default router;