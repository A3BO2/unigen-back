// 계정 관련 라우터
import express from 'express';
import { signup, login } from '../controllers/authController.mjs';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);

export default router;