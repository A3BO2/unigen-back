//  사용자 라우터
import express from "express";
import {
  getUserProfile,
  getUserSettings,
  updateUserSettings,
  followUser,
  unfollowUser,
  isFollowing,
  updateUserProfile,
  uploadProfileImage,
} from "../controllers/userController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";
import { uploadToS3 } from "../middleware/uploadMiddleware.mjs";

const router = express.Router();

// 내 프로필 조회/수정은 인증 필요 (req.user 주입)
router.get("/me", verifyToken, getUserProfile);
router.put("/me", verifyToken, updateUserProfile);
// 프로필 이미지 업로드 - S3 업로드용 메모리 스토리지 사용
router.post("/me/profile-image", verifyToken, uploadToS3.single("image"), uploadProfileImage);
// 사용자 설정 조회
router.get("/me/settings", verifyToken, getUserSettings);
// 사용자 설정 업데이트
router.put("/me/settings", verifyToken, updateUserSettings);

export default router;
