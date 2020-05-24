import express from "express";
import { 
  getHosts,
} from "../controller/internal";

const router = express.Router();

router.get("/hosts/", getHosts);

export default router;
