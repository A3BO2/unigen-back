// 게시물 라우터
import express from 'express';
import { createPost, getReel } from '../controllers/postController.mjs';
const router = express.Router();

router.post('/', createPost);
router.get('/reels', getReel);

export default router;
