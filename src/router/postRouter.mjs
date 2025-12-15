// 게시물 라우터
import express from "express";
import { createPost } from "../controllers/postController.mjs";
import { upload } from "../middleware/uploadMiddleware.mjs";

const router = express.Router();

router.post("/", upload.single("image"), createPost);

export default router;
