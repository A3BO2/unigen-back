//  사용자 라우터
import express from "express";
import {
  getUserProfile,
  getUserSettings,
  updateUserSettings,
  followUser,
  unfollowUser,
  isFollowing,
} from "../controllers/userController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

const router = express.Router();

// 내 프로필 조회는 인증 필요 (req.user 주입)
router.get("/me", verifyToken, getUserProfile);
// 사용자 설정 조회
router.get("/me/settings", verifyToken, getUserSettings);
// 사용자 설정 업데이트
router.put("/me/settings", verifyToken, updateUserSettings);

router.post("/follow", verifyToken, followUser);
router.post("/unfollow", verifyToken, unfollowUser);
router.get("/isfollowing", verifyToken, isFollowing);

export default router;
