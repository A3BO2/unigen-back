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
import { upload } from "../middleware/uploadMiddleware.mjs";

const router = express.Router();

// ==========================================
// 1. 특정 경로 (고정된 주소)를 가장 먼저 정의
// ==========================================

// 검색 라우트 (쿼리 파라미터 사용 ?q=...)
router.get("/search", verifyToken, searchUsers);

// 팔로우 여부 확인 (이게 /:id보다 위에 있어야 함! 중요)
router.get("/isfollowing", verifyToken, isFollowing);

// 내 프로필 관련 (me)
router.get("/me", verifyToken, getUserProfile);
router.put("/me", verifyToken, updateUserProfile);

// 사용자 설정 조회/수정
router.get("/me/settings", verifyToken, getUserSettings);
router.put("/me/settings", verifyToken, updateUserSettings);

// 프로필 이미지 업로드
router.post(
  "/me/profile-image",
  verifyToken,
  upload.single("image"),
  uploadProfileImage
);

// 팔로워/팔로잉 목록 조회
router.get("/me/followers", verifyToken, getFollowers);
router.get("/me/following", verifyToken, getFollowing);

// ==========================================
// 2. 동적 경로 (파라미터 :id 등)를 나중에 정의
// ==========================================

// 팔로우/언팔로우 동작
// (프론트엔드 user.js의 unfollowUser 함수가 DELETE /me/following/:id 를 호출함)
router.delete("/me/followers/:followerId", verifyToken, removeFollower);
router.delete("/me/following/:followeeId", verifyToken, unfollowUser);

// user.js의 followUser 함수가 POST /follow 를 호출함
router.post("/follow", verifyToken, followUser);
// 혹시 모를 POST 언팔로우 지원
router.post("/unfollow", verifyToken, unfollowUser);

// ⚠️ 가장 마지막에 배치: 다른 사용자 프로필 조회 (:id가 모든 문자열을 잡기 때문)
router.get("/:id", verifyToken, getUserProfile);

export default router;
