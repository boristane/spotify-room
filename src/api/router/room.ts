import express from "express";
import { joinRoom, createRoom } from "../controller/room";

const router = express.Router();

router.put("/join/:id", joinRoom);
router.post("/create", createRoom);

export default router;
