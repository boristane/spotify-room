import express from "express";
import { 
  updateEmailSubscription,
  getMe,
} from "../controller/user";

const router = express.Router();

router.put("/email-subscription/", updateEmailSubscription);
router.get("/me/", getMe);

export default router;