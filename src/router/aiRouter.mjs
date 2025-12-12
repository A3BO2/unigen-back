// ai 라우터
import express from 'express';
import { analyzeImage } from '../controllers/aiController.mjs';
const router = express.Router();

router.post('/analyze', analyzeImage);

export default router;