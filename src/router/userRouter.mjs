//  사용자 라우터
import express from "express";
import { getUserProfile } from "../controllers/userController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

const router = express.Router();

// 내 프로필 조회는 인증 필요 (req.user 주입)
router.get("/me", verifyToken, getUserProfile);

export default router;
