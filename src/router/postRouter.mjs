// 게시물 라우터
import express from "express";
import { createPost, getFeed } from "../controllers/postController.mjs";
const router = express.Router();

router.post("/", createPost);

// https://api.seniorsns.com/api/v1/posts/feed?mode=senior&page=1&size=10
router.get("/feed", getFeed);

export default router;
