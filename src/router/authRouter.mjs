// 계정 관련 라우터
import express from 'express';
import { signup, login, kakaoLogin, kakaoSignup, getMe } from '../controllers/authController.mjs';
import { verifyToken } from '../middleware/authMiddleware.mjs';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/kakao/login', kakaoLogin);
router.post('/kakao/signup', kakaoSignup);
router.get('/me', verifyToken, getMe);

export default router;