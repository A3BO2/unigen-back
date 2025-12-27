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
  searchUsers,
  getFollowers,
  getFollowing,
  removeFollower,
} from "../controllers/userController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";
import { uploadToS3 } from "../middleware/uploadMiddleware.mjs";

const router = express.Router();

// 내 프로필 조회/수정은 인증 필요 (req.user 주입)
router.get("/me", verifyToken, getUserProfile);
router.put("/me", verifyToken, updateUserProfile);
// 검색 라우트는 :id 라우트보다 먼저 정의해야 함
router.get("/search", verifyToken, searchUsers);
// 다른 사용자 프로필 조회 (인증 필요)
router.get("/:id", verifyToken, getUserProfile);
// 프로필 이미지 업로드 - S3 업로드용 메모리 스토리지 사용
router.post(
  "/me/profile-image",
  verifyToken,
  uploadToS3.single("image"),
  uploadProfileImage
);
// 사용자 설정 조회
router.get("/me/settings", verifyToken, getUserSettings);
// 사용자 설정 업데이트
router.put("/me/settings", verifyToken, updateUserSettings);
// 팔로워 목록 조회
router.get("/me/followers", verifyToken, getFollowers);
// 팔로우 목록 조회
router.get("/me/following", verifyToken, getFollowing);
// 팔로워 삭제
router.delete("/me/followers/:followerId", verifyToken, removeFollower);
// 팔로우 삭제 (언팔로우)
router.delete("/me/following/:followeeId", verifyToken, unfollowUser);

router.post("/follow", verifyToken, followUser);
router.post("/unfollow", verifyToken, unfollowUser);
router.get("/isfollowing", verifyToken, isFollowing);

export default router;
