// 게시물 라우터
import express from "express";
import {
  createPost,
  updatePost,
  deletePost,
  getReel,
  getFeed,
  getSeniorFeed,
  getStory,
} from "../controllers/postController.mjs";
import { upload } from "../middleware/uploadMiddleware.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

const router = express.Router();

// 최대 10장
router.post("/", verifyToken, upload.array("images", 10), createPost);

router.put("/:id", verifyToken, updatePost);

router.delete("/:id", verifyToken, deletePost);

// https://api.seniorsns.com/api/v1/posts/feed?mode=senior&page=1&size=10
router.get("/feed", verifyToken, getFeed);

router.get("/reels", verifyToken, getReel);

router.get("/seniorFeed", verifyToken, getSeniorFeed);

router.get("/seniorFeed", verifyToken, getSeniorFeed);

export default router;
