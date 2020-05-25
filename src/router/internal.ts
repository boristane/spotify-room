import express from "express";
import { 
  getHosts,
  getGuests,
  checkStaleRooms,
} from "../controller/internal";

const router = express.Router();

router.get("/hosts/", getHosts);
router.get("/guests/", getGuests);
router.put("/check-stale-rooms/", checkStaleRooms);

export default router;
