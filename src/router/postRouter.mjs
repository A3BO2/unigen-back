// 게시물 라우터
import express from "express";
import {
  createPost,
  updatePost,
  deletePost,
  getReel,
  getFeed,
  getSeniorFeed,
  getPostById,
} from "../controllers/postController.mjs";
import { upload } from "../middleware/uploadMiddleware.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

import {
  likePost,
  unlikePost,
  isPostLike,
} from "../controllers/seniorController.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/v1/posts:
 *   post:
 *     summary: 게시물 작성
 *     description: 피드(이미지) 또는 릴스(비디오) 게시물을 작성합니다. 최대 10장의 이미지를 업로드할 수 있습니다.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 이미지 파일들 (최대 10장)
 *               content:
 *                 type: string
 *                 description: 게시물 내용
 *               postType:
 *                 type: string
 *                 enum: [feed, reel]
 *                 description: 게시물 타입
 *               isSeniorMode:
 *                 type: string
 *                 enum: ["true", "false"]
 *                 description: 시니어 모드 여부
 *     responses:
 *       201:
 *         description: 게시물 작성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 postId:
 *                   type: integer
 *                 images:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 업로드된 이미지 URL 목록
 *                 video:
 *                   type: string
 *                   description: 업로드된 비디오 URL
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 인증 필요
 */
router.post("/", verifyToken, upload.array("images", 10), createPost);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   put:
 *     summary: 게시물 수정
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePostRequest'
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 게시물 없음
 */
router.put("/:id", verifyToken, updatePost);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   delete:
 *     summary: 게시물 삭제
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     responses:
 *       200:
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 게시물 없음
 */
router.delete("/:id", verifyToken, deletePost);

/**
 * @swagger
 * /api/v1/posts/feed:
 *   get:
 *     summary: 피드 조회
 *     description: 팔로우한 사용자들의 피드를 조회합니다.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [normal, senior, all]
 *         description: 피드 모드
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지 크기
 *       - in: query
 *         name: all
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *           default: "false"
 *         description: 모든 게시물 조회 여부 (false=팔로우+본인만, true=전체)
 *     responses:
 *       200:
 *         description: 피드 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeedResponse'
 *       401:
 *         description: 인증 필요
 */
router.get("/feed", verifyToken, getFeed);

/**
 * @swagger
 * /api/v1/posts/reels:
 *   get:
 *     summary: 릴스 조회
 *     description: 릴스(비디오) 게시물을 커서 기반으로 하나씩 조회합니다.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lastId
 *         schema:
 *           type: integer
 *         description: 이전 릴스의 ID (커서)
 *     responses:
 *       200:
 *         description: 릴스 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 응답 메시지 (Reel fetched 또는 NO_MORE_REELS)
 *                 reel:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: integer
 *                     author_id:
 *                       type: integer
 *                     content:
 *                       type: string
 *                     image_url:
 *                       type: string
 *                       description: 썸네일 이미지 URL
 *                     video_url:
 *                       type: string
 *                       description: 비디오 URL
 *                     is_senior_mode:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     like_count:
 *                       type: integer
 *                     comment_count:
 *                       type: integer
 *                     authorName:
 *                       type: string
 *                       description: 작성자 이름
 *                     authorProfile:
 *                       type: string
 *                       description: 작성자 프로필 이미지
 *                 nextCursor:
 *                   type: integer
 *                   nullable: true
 *                   description: 다음 릴스 조회를 위한 커서 (릴스 ID)
 *       401:
 *         description: 인증 필요
 */
router.get("/reels", verifyToken, getReel);

/**
 * @swagger
 * /api/v1/posts/seniorFeed:
 *   get:
 *     summary: 시니어 피드 조회
 *     description: 시니어 모드 전용 피드를 조회합니다. 각 게시물에 댓글 목록과 좋아요 여부가 포함됩니다.
 *     tags: [Posts]
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
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지 크기
 *       - in: query
 *         name: all
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *           default: "false"
 *         description: 모든 게시물 조회 여부 (false=팔로우+본인만)
 *     responses:
 *       200:
 *         description: 시니어 피드 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: 게시물 ID
 *                   user:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: 작성자 이름
 *                       username:
 *                         type: string
 *                         description: 작성자 사용자명
 *                       authorId:
 *                         type: integer
 *                         description: 작성자 ID
 *                       avatar:
 *                         type: string
 *                         description: 작성자 프로필 이미지
 *                   content:
 *                     type: string
 *                     description: 게시물 내용
 *                   photo:
 *                     type: string
 *                     description: 이미지 URL
 *                   likes:
 *                     type: integer
 *                     description: 좋아요 수
 *                   timestamp:
 *                     type: string
 *                     description: 상대적 시간 (예: 2시간 전)
 *                   liked:
 *                     type: boolean
 *                     description: 현재 사용자의 좋아요 여부
 *                   comments:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             username:
 *                               type: string
 *                             avatar:
 *                               type: string
 *                         text:
 *                           type: string
 *                         time:
 *                           type: string
 *       401:
 *         description: 인증 필요
 */
router.get("/seniorFeed", verifyToken, getSeniorFeed);

/**
 * @swagger
 * /api/v1/posts/{postId}/like:
 *   post:
 *     summary: 게시물 좋아요
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     responses:
 *       200:
 *         description: 좋아요 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 게시물 없음
 */
router.post("/:postId/like", verifyToken, likePost);

/**
 * @swagger
 * /api/v1/posts/{postId}/like:
 *   delete:
 *     summary: 게시물 좋아요 취소
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     responses:
 *       200:
 *         description: 좋아요 취소 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: 인증 필요
 */
router.delete("/:postId/like", verifyToken, unlikePost);

/**
 * @swagger
 * /api/v1/posts/{postId}/is-liked:
 *   get:
 *     summary: 게시물 좋아요 여부 확인
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     responses:
 *       200:
 *         description: 좋아요 여부 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isLiked:
 *                   type: boolean
 *       401:
 *         description: 인증 필요
 */
router.get("/:postId/is-liked", verifyToken, isPostLike);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   get:
 *     summary: 단일 게시물 조회
 *     description: 단일 게시물과 댓글 목록을 함께 조회합니다.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     responses:
 *       200:
 *         description: 게시물 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: 게시물 ID
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                       description: 작성자 이름
 *                     avatar:
 *                       type: string
 *                       description: 작성자 프로필 이미지
 *                 content:
 *                   type: string
 *                   description: 게시물 내용
 *                 photo:
 *                   type: string
 *                   description: 이미지 URL
 *                 video:
 *                   type: string
 *                   description: 비디오 URL
 *                 likes:
 *                   type: integer
 *                   description: 좋아요 수
 *                 timestamp:
 *                   type: string
 *                   description: 상대적 시간 (예: 2시간 전)
 *                 liked:
 *                   type: boolean
 *                   description: 현재 사용자의 좋아요 여부
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       user:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                       text:
 *                         type: string
 *                       time:
 *                         type: string
 *       404:
 *         description: 게시물 없음
 */
router.get("/:id", verifyToken, getPostById);

export default router;
