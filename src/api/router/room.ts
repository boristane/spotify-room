import express from "express";
import { joinRoom } from "../controller/room";

const router = express.Router();

router.put("/join/:id", joinRoom);

export default router;
