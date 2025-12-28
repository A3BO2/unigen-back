import express from "express";
import {
  createStory,
  getStories,
  isMineStory,
  watchStory,
  getStoryViewers,
} from "../controllers/storyController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";
import { uploadToS3 } from "../middleware/uploadMiddleware.mjs";

const router = express.Router();

// 스토리 조회
router.get("/", verifyToken, getStories);

// 메모리 스토리지(버퍼)로 받아서 S3 업로드
router.post("/", verifyToken, uploadToS3.single("media"), createStory);

router.get("/ismine/:storyId", verifyToken, isMineStory);

router.post("/watch/:storyId", verifyToken, watchStory);

router.get("/viewers/:storyId", verifyToken, getStoryViewers);

export default router;
