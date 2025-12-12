// 시니어 라우터
import express from 'express';
import { getSeniorHome } from '../controllers/seniorController.mjs';
const router = express.Router();

router.get('/home', getSeniorHome);

export default router;