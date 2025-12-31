// 계정 관련 라우터
import express from "express";
import {
  signup,
  login,
  kakaoLogin,
  kakaoSignup,
  getMe,
  sendAuthCode,
  verifyAuthCode,
  changePassword,
} from "../controllers/authController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: 일반 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignupResponse'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/signup", signup);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: 일반 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", login);

/**
 * @swagger
 * /api/v1/auth/kakao/login:
 *   post:
 *     summary: 카카오 로그인
 *     tags: [Auth]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 needsSignup:
 *                   type: boolean
 *                 kakaoUser:
 *                   type: object
 */
router.post("/kakao/login", kakaoLogin);

/**
 * @swagger
 * /api/v1/auth/kakao/signup:
 *   post:
 *     summary: 카카오 회원가입
 *     tags: [Auth]
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
 *               $ref: '#/components/schemas/SignupResponse'
 *       400:
 *         description: 잘못된 요청 또는 중복된 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/kakao/signup", kakaoSignup);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: 내 정보 조회
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 반환
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", verifyToken, getMe);

/**
 * @swagger
 * /api/v1/auth/send-code:
 *   post:
 *     summary: SMS 인증번호 발송
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendCodeRequest'
 *     responses:
 *       200:
 *         description: 인증번호 발송 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/send-code", sendAuthCode);

/**
 * @swagger
 * /api/v1/auth/verify-code:
 *   post:
 *     summary: SMS 인증번호 확인
 *     tags: [Auth]
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/verify-code", verifyAuthCode);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: 비밀번호 변경
 *     description: 로그인 상태에서 현재 비밀번호와 새 비밀번호로 변경하거나, 비밀번호 찾기 후 전화번호/인증번호와 새 비밀번호로 변경
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/change-password", changePassword);

export default router;
