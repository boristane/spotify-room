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
  hostMakeHost,
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
router.put("/go-to/", hostGoToTrack);
router.get("/check/", hostCheckUsers);
router.delete("/remove/", hostRemoveTrack);
router.put("/approve/", hostApproveTrack);
router.get("/approve-guest/", hostApproveGuest);
router.put("/make-host/", hostMakeHost);
router.get("/", getRooom);
router.post("/add-track/", addTrackToRoom);
router.post("/email-invite/", inviteViaEmail);

export default router;
