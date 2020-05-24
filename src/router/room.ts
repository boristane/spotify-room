import express from "express";
import { 
  joinRoom,
  createRoom,
  goToNextTrack,
  playRoom,
  getRooom,
  addTrackToRoom,
  hostGoToTrack,
  hostApproveTrack,
  hostApproveGuest,
  leaveRoom,
  pauseRoom,
  hostRemoveTrack,
  getRoomUser,
  hostCheckUsers,
  inviteViaEmail,
  updateTokenRoom,
} from "../controller/room";

const router = express.Router();

router.put("/join/", joinRoom);
router.put("/update-token/", updateTokenRoom);
router.get("/user/", getRoomUser);
router.put("/leave/", leaveRoom);
router.post("/create", createRoom);
router.post("/play/", playRoom);
router.post("/pause/", pauseRoom);
router.get("/next/", goToNextTrack);
router.get("/go-to/", hostGoToTrack);
router.get("/check/", hostCheckUsers);
router.delete("/remove/", hostRemoveTrack);
router.get("/approve/", hostApproveTrack);
router.get("/approve-guest/", hostApproveGuest);
router.get("/", getRooom);
router.post("/add-track/", addTrackToRoom);
router.post("/email-invite/", inviteViaEmail);

export default router;
