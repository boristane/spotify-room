import express from "express";
import { 
  getHosts,
  getGuests,
} from "../controller/internal";

const router = express.Router();

router.get("/hosts/", getHosts);
router.get("/guests/", getGuests);

export default router;
