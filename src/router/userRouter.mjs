//  사용자 라우터
import express from "express";
import { getUserProfile } from "../controllers/userController.mjs";
const router = express.Router();

router.get("/me", getUserProfile);

export default router;
