// 사용자 라우터
import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  getUserSettings,
  updateUserSettings,
  uploadProfileImage,
  getFollowers,
  getFollowing,
  removeFollower,
  followUser,
  unfollowUser,
  isFollowing,
  searchUsers,
} from "../controllers/userController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";
import { uploadToS3 } from "../middleware/uploadMiddleware.mjs";

const router = express.Router();

// 내 프로필 조회/수정은 인증 필요 (req.user 주입)
router.get("/me", verifyToken, getUserProfile);
router.put("/me", verifyToken, updateUserProfile);

// 사용자 설정 조회
router.get("/me/settings", verifyToken, getUserSettings);
router.put("/me/settings", verifyToken, updateUserSettings);

// 프로필 이미지 업로드 - S3 업로드용 메모리 스토리지 사용
router.post(
  "/me/profile-image",
  verifyToken,
  uploadToS3.single("image"),
  uploadProfileImage
);

// 팔로워 목록 조회
router.get("/me/followers", verifyToken, getFollowers);
// 팔로우 목록 조회
router.get("/me/following", verifyToken, getFollowing);
// 팔로워 삭제
router.delete("/me/followers/:followerId", verifyToken, removeFollower);
// 팔로우 삭제 (언팔로우)
router.delete("/me/following/:followeeId", verifyToken, unfollowUser);

// 팔로우/언팔로우 동작
// user.js의 followUser 함수가 POST /follow 를 호출함
router.post("/follow", verifyToken, followUser);
// 혹시 모를 POST 언팔로우 지원
router.post("/unfollow", verifyToken, unfollowUser);

// 검색 라우트는 :id 라우트보다 먼저 정의해야 함
router.get("/search", verifyToken, searchUsers);

// ⚠️ 가장 마지막에 배치: 다른 사용자 프로필 조회 (:id가 모든 문자열을 잡기 때문)
router.get("/:id", verifyToken, getUserProfile);

export default router;
