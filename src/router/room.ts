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
  getRoomUser,
  masterCheckUsers,
} from "../controller/room";

const router = express.Router();

router.put("/join/", joinRoom);
router.get("/user/", getRoomUser);
router.put("/leave/", leaveRoom);
router.post("/create", createRoom);
router.post("/play/", playRoom);
router.post("/pause/", pauseRoom);
router.get("/next/", goToNextTrack);
router.get("/go-to/", masterGoToTrack);
router.get("/check/", masterCheckUsers);
router.delete("/remove/", masterRemoveTrack);
router.get("/approve/", masterApproveTrack);
router.get("/approve-member/", masterApproveMember);
router.get("/", getRooom);
router.post("/add-track/", addTrackToRoom);

export default router;
