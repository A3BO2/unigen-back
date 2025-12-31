// 시니어 라우터
import express from "express";
import {
  sendAuthCode,
  verifyAuthCode,
} from "../controllers/authController.mjs";
import {
  getSeniorHome,
  seniorPhoneAuth,
  seniorKakaoLogin,
  seniorKakaoSignup,
} from "../controllers/seniorController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

import {
  postComment,
  likePost,
  unlikePost,
  isPostLike,
  getCommentsByPost,
} from "../controllers/seniorController.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/v1/senior/auth/send-code:
 *   post:
 *     summary: 시니어 SMS 인증번호 발송
 *     tags: [Senior]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 전화번호
 *     responses:
 *       200:
 *         description: 인증번호 발송 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: 잘못된 요청
 */
router.post("/auth/send-code", sendAuthCode);

/**
 * @swagger
 * /api/v1/senior/auth/verify-code:
 *   post:
 *     summary: 시니어 SMS 인증번호 검증
 *     tags: [Senior]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyCodeRequest'
 *     responses:
 *       200:
 *         description: 인증 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: 인증 실패
 */
router.post("/auth/verify-code", verifyAuthCode);

/**
 * @swagger
 * /api/v1/senior/auth/phone:
 *   post:
 *     summary: 시니어 번호 인증 가입/로그인
 *     description: 전화번호와 인증번호로 가입 또는 로그인합니다. 기존 사용자면 로그인, 신규면 회원가입 후 로그인됩니다.
 *     tags: [Senior]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SeniorPhoneAuthRequest'
 *     responses:
 *       200:
 *         description: 로그인/회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: 인증번호 유효하지 않음
 */
router.post("/auth/phone", seniorPhoneAuth);

/**
 * @swagger
 * /api/v1/senior/auth/kakao/login:
 *   post:
 *     summary: 시니어 카카오 로그인
 *     tags: [Senior]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KakaoLoginRequest'
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       404:
 *         description: 가입된 계정 없음 (회원가입 필요)
 */
router.post("/auth/kakao/login", seniorKakaoLogin);

/**
 * @swagger
 * /api/v1/senior/auth/kakao/signup:
 *   post:
 *     summary: 시니어 카카오 회원가입
 *     tags: [Senior]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KakaoSignupRequest'
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: 잘못된 요청 또는 중복된 정보
 */
router.post("/auth/kakao/signup", seniorKakaoSignup);

/**
 * @swagger
 * /api/v1/senior/home:
 *   get:
 *     summary: 시니어 홈 화면 데이터
 *     tags: [Senior]
 *     responses:
 *       200:
 *         description: 홈 화면 데이터 반환
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SeniorHomeResponse'
 */
router.get("/home", getSeniorHome);

/**
 * @swagger
 * /api/v1/senior/comment/{postId}:
 *   post:
 *     summary: 시니어 댓글 작성
 *     tags: [Senior]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 게시물 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 댓글 내용
 *     responses:
 *       201:
 *         description: 댓글 작성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 commentId:
 *                   type: integer
 *                   description: 생성된 댓글 ID
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 게시물 없음
 */
router.post("/comment/:postId", verifyToken, postComment);

/**
 * @swagger
 * /api/v1/senior/comment/{postId}:
 *   get:
 *     summary: 시니어 댓글 목록 조회
 *     tags: [Senior]
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
 *         description: 댓글 목록 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       commentId:
 *                         type: integer
 *                       content:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       authorId:
 *                         type: integer
 *                       authorName:
 *                         type: string
 *                       authorProfileImage:
 *                         type: string
 *       401:
 *         description: 인증 필요
 */
router.get("/comment/:postId", verifyToken, getCommentsByPost);

/**
 * @swagger
 * /api/v1/senior/postlike/{postId}:
 *   post:
 *     summary: 시니어 게시물 좋아요
 *     tags: [Senior]
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 인증 필요
 */
router.post("/postlike/:postId", verifyToken, likePost);

/**
 * @swagger
 * /api/v1/senior/postlike/{postId}:
 *   delete:
 *     summary: 시니어 게시물 좋아요 취소
 *     tags: [Senior]
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 인증 필요
 */
router.delete("/postlike/:postId", verifyToken, unlikePost);

/**
 * @swagger
 * /api/v1/senior/postlike/{postId}:
 *   get:
 *     summary: 시니어 게시물 좋아요 여부 확인
 *     tags: [Senior]
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
router.get("/postlike/:postId", verifyToken, isPostLike);

export default router;
