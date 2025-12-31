// 사용자 라우터
import express from "express";
import {
  getUserProfile,
  getSeniorUserProfile,
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

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: 내 프로필 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 9
 *         description: 페이지당 게시물 수
 *       - in: query
 *         name: post_type
 *         schema:
 *           type: string
 *           enum: [feed, reel]
 *         description: 게시물 타입 필터
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         description: 인증 필요
 */
router.get("/me", verifyToken, getUserProfile);

/**
 * @swagger
 * /api/v1/users/me/senior:
 *   get:
 *     summary: 시니어 전용 프로필 조회
 *     description: 시니어 모드에서 feed 타입 게시물만 조회합니다.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 9
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         description: 인증 필요
 */
router.get("/me/senior", verifyToken, getSeniorUserProfile);

/**
 * @swagger
 * /api/v1/users/me:
 *   put:
 *     summary: 내 프로필 수정
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 이름
 *               username:
 *                 type: string
 *                 description: 사용자 아이디
 *               profile_image:
 *                 type: string
 *                 description: 프로필 이미지 URL
 *     responses:
 *       200:
 *         description: 프로필 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: 인증 필요
 */
router.put("/me", verifyToken, updateUserProfile);

/**
 * @swagger
 * /api/v1/users/me/settings:
 *   get:
 *     summary: 사용자 설정 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 설정 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 settings:
 *                   $ref: '#/components/schemas/UserSettings'
 *       401:
 *         description: 인증 필요
 */
router.get("/me/settings", verifyToken, getUserSettings);

/**
 * @swagger
 * /api/v1/users/me/settings:
 *   put:
 *     summary: 사용자 설정 수정
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSettings'
 *     responses:
 *       200:
 *         description: 설정 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: 인증 필요
 */
router.put("/me/settings", verifyToken, updateUserSettings);

/**
 * @swagger
 * /api/v1/users/me/profile-image:
 *   post:
 *     summary: 프로필 이미지 업로드
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 프로필 이미지 파일
 *     responses:
 *       200:
 *         description: 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 profileImageUrl:
 *                   type: string
 *       401:
 *         description: 인증 필요
 */
router.post(
  "/me/profile-image",
  verifyToken,
  uploadToS3.single("image"),
  uploadProfileImage
);

/**
 * @swagger
 * /api/v1/users/me/followers:
 *   get:
 *     summary: 내 팔로워 목록 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 팔로워 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowerList'
 *       401:
 *         description: 인증 필요
 */
router.get("/me/followers", verifyToken, getFollowers);

/**
 * @swagger
 * /api/v1/users/me/following:
 *   get:
 *     summary: 내 팔로잉 목록 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 팔로잉 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowingList'
 *       401:
 *         description: 인증 필요
 */
router.get("/me/following", verifyToken, getFollowing);

/**
 * @swagger
 * /api/v1/users/me/followers/{followerId}:
 *   delete:
 *     summary: 팔로워 삭제 (나를 팔로우하는 사용자 제거)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 삭제할 팔로워의 사용자 ID
 *     responses:
 *       200:
 *         description: 팔로워 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: 인증 필요
 */
router.delete("/me/followers/:followerId", verifyToken, removeFollower);

/**
 * @swagger
 * /api/v1/users/me/following/{followeeId}:
 *   delete:
 *     summary: 언팔로우 (내가 팔로우하는 사용자 제거)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 언팔로우할 사용자 ID
 *     responses:
 *       200:
 *         description: 언팔로우 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: 인증 필요
 */
router.delete("/me/following/:followeeId", verifyToken, unfollowUser);

/**
 * @swagger
 * /api/v1/users/follow:
 *   post:
 *     summary: 사용자 팔로우
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FollowRequest'
 *     responses:
 *       200:
 *         description: 팔로우 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: 인증 필요
 *       400:
 *         description: 잘못된 요청
 */
router.post("/follow", verifyToken, followUser);

/**
 * @swagger
 * /api/v1/users/unfollow:
 *   post:
 *     summary: 사용자 언팔로우
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FollowRequest'
 *     responses:
 *       200:
 *         description: 언팔로우 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: 인증 필요
 */
router.post("/unfollow", verifyToken, unfollowUser);

/**
 * @swagger
 * /api/v1/users/isfollowing:
 *   get:
 *     summary: 팔로우 여부 확인
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: followeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 확인할 대상 사용자 ID
 *     responses:
 *       200:
 *         description: 팔로우 여부 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFollowing:
 *                   type: boolean
 *                   description: 팔로우 여부
 *                 isMine:
 *                   type: boolean
 *                   description: 본인 여부
 *       401:
 *         description: 인증 필요
 */
router.get("/isfollowing", verifyToken, isFollowing);

/**
 * @swagger
 * /api/v1/users/search:
 *   get:
 *     summary: 사용자 검색
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어 (username 또는 name)
 *     responses:
 *       200:
 *         description: 검색 결과 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       name:
 *                         type: string
 *                       profile_image:
 *                         type: string
 *                       follower_count:
 *                         type: integer
 *                       is_following:
 *                         type: boolean
 *       401:
 *         description: 인증 필요
 */
router.get("/search", verifyToken, searchUsers);

/**
 * @swagger
 * /api/v1/users/{userId}/followers:
 *   get:
 *     summary: 특정 사용자의 팔로워 목록 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 팔로워 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowerList'
 *       401:
 *         description: 인증 필요
 */
router.get("/:userId/followers", verifyToken, getFollowers);

/**
 * @swagger
 * /api/v1/users/{userId}/following:
 *   get:
 *     summary: 특정 사용자의 팔로잉 목록 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 팔로잉 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowingList'
 *       401:
 *         description: 인증 필요
 */
router.get("/:userId/following", verifyToken, getFollowing);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: 특정 사용자 프로필 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 9
 *       - in: query
 *         name: post_type
 *         schema:
 *           type: string
 *           enum: [feed, reel]
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       404:
 *         description: 사용자 없음
 */
router.get("/:id", verifyToken, getUserProfile);

export default router;
