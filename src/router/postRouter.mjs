// 게시물 라우터
import express from "express";
import { createPost } from "../controllers/postController.mjs";
import { upload } from "../middleware/uploadMiddleware.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";

const router = express.Router();

// 최대 10장
router.post("/", verifyToken, upload.array("images", 10), createPost);

export default router;
