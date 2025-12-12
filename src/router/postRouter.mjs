// 게시물 라우터
import express from 'express';
import { createPost } from '../controllers/postController.mjs';
const router = express.Router();

router.post('/', createPost);

export default router;