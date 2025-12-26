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
import { uploadToS3 } from "../middleware/uploadMiddleware.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";


import {
  likePost,
  unlikePost,
  isPostLike,
} from "../controllers/seniorController.mjs";


const router = express.Router();

// 최대 10장 - S3 업로드용 메모리 스토리지 사용
router.post("/", verifyToken, uploadToS3.array("images", 10), createPost);

router.put("/:id", verifyToken, updatePost);

router.delete("/:id", verifyToken, deletePost);

// https://api.seniorsns.com/api/v1/posts/feed?mode=senior&page=1&size=10
router.get("/feed", verifyToken, getFeed);

router.get("/reels", verifyToken, getReel);

<<<<<<< HEAD
router.get("/stories", verifyToken, getStory);

// 단일 게시물 조회
router.get("/:id", verifyToken, getPostById);
=======
router.get("/seniorFeed", verifyToken, getSeniorFeed);
>>>>>>> master

// 좋아요
router.post("/:postId/like", verifyToken, likePost);
router.delete("/:postId/like", verifyToken, unlikePost);
router.get("/:postId/is-liked", verifyToken, isPostLike);


export default router;
