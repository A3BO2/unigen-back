import express from "express";
import { createStory } from "../controllers/storyController.mjs";
import { verifyToken } from "../middleware/authMiddleware.mjs";
import { upload } from "../middleware/uploadMiddleware.mjs";

const router = express.Router();

router.post("/", verifyToken, upload.single("media"), createStory);

export default router;
