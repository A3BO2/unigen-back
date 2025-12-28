// 게시물 라우터
import express from "express";
import {
  createPost,
  updatePost,
  deletePost,
  getReel,
  getFeed,
  getSeniorFeed,
  getPostById,
} from "../controllers/postController.mjs";
import { upload } from "../middleware/uploadMiddleware.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";


import {
  likePost,
  unlikePost,
  isPostLike,
} from "../controllers/seniorController.mjs";


const router = express.Router();

// 최대 10장
router.post("/", verifyToken, upload.array("images", 10), createPost);

router.put("/:id", verifyToken, updatePost);

router.delete("/:id", verifyToken, deletePost);

// https://api.seniorsns.com/api/v1/posts/feed?mode=senior&page=1&size=10
router.get("/feed", verifyToken, getFeed);

router.get("/reels", verifyToken, getReel);

router.get("/seniorFeed", verifyToken, getSeniorFeed);

// 좋아요 (더 구체적인 라우트를 먼저 배치)
router.post("/:postId/like", verifyToken, likePost);
router.delete("/:postId/like", verifyToken, unlikePost);
router.get("/:postId/is-liked", verifyToken, isPostLike);

// 단일 게시물 조회 (동적 라우트는 마지막에 배치)
router.get("/:id", verifyToken, getPostById);

export default router;
