// 시니어 라우터
import express from 'express';
import { 
  getSeniorHome,
  sendVerificationCode,
  verifyCode,
  seniorPhoneAuth,
  seniorKakaoLogin,
  seniorKakaoSignup
} from '../controllers/seniorController.mjs';
const router = express.Router();

// SMS 인증번호 발송
router.post('/auth/send-code', sendVerificationCode);

// SMS 인증번호 검증
router.post('/auth/verify-code', verifyCode);

// 시니어 번호 인증 가입/로그인
router.post('/auth/phone', seniorPhoneAuth);

// 시니어 카카오 로그인
router.post('/auth/kakao/login', seniorKakaoLogin);

// 시니어 카카오 회원가입
router.post('/auth/kakao/signup', seniorKakaoSignup);

router.get('/home', getSeniorHome);

export default router;